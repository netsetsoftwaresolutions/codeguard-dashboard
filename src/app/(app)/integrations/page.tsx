'use client';

import type { IntegrationView, SourceProvider } from '../../../contracts';
import { EmptyState } from '../../../components/primitives';
import { Cloud, FolderGit2, HardDrive, Link2, Lock, Unlock, Unplug } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useAuth } from '@/components/auth';
import { Button, Card, CardBody, ConfirmDialog, ErrorState, FormError, LoadingBlock, Notice, PageHeader, Pill } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useApi } from '@/lib/hooks';

const SLUGS: Partial<Record<SourceProvider, string>> = {
  GITHUB: 'github',
  GITLAB: 'gitlab',
  BITBUCKET: 'bitbucket',
  DROPBOX: 'dropbox',
  GOOGLE_DRIVE: 'google-drive',
};

function ProviderGlyph({ provider }: { provider: SourceProvider }) {
  const p = { size: 22, 'aria-hidden': true as const, className: 'text-brand-600 dark:text-brand-400' };
  if (provider === 'DROPBOX') return <Cloud {...p} />;
  if (provider === 'GOOGLE_DRIVE') return <HardDrive {...p} />;
  if (provider === 'PUBLIC_URL') return <Link2 {...p} />;
  return <FolderGit2 {...p} />;
}

function IntegrationCard({ it, canManage, orgId, onChanged }: { it: IntegrationView; canManage: boolean; orgId: string; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [removing, setRemoving] = useState<string | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);
  const slug = SLUGS[it.provider];
  return (
    <Card as="article" className="flex flex-col">
      <CardBody className="flex flex-1 flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <ProviderGlyph provider={it.provider} />
            <h2 className="font-semibold">{it.name}</h2>
          </div>
          {!it.configured ? (
            <Pill className="bg-slate-500/10">Not configured on this server</Pill>
          ) : it.connected ? (
            <Pill className="bg-green-500/10 text-green-700 dark:text-green-300">Connected</Pill>
          ) : (
            <Pill>Available</Pill>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <p className="flex gap-2">
            <Unlock size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span>
              <span className="font-medium">Public access: </span>
              {it.publicAccess}
            </span>
          </p>
          <p className="flex gap-2">
            <Lock size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
            <span>
              <span className="font-medium">Private access: </span>
              {it.privateAccess}
            </span>
          </p>
        </div>
        {!it.configured && (
          <Notice tone="neutral" title="Not configured on this server">
            {it.setupHint ?? 'The server administrator has not provided credentials for this integration.'}
          </Notice>
        )}
        {it.connections.length > 0 && (
          <ul className="space-y-2 border-t border-slate-200 pt-3 text-sm dark:border-ink-600">
            {it.connections.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 truncate">
                  {c.accountLogin ?? 'Connection'} <span className="text-xs text-slate-500">· {c.status.toLowerCase()} · since {formatDate(c.createdAt)}</span>
                </span>
                {canManage && (
                  <Button size="sm" variant="ghost" icon={<Unplug size={14} aria-hidden="true" />} onClick={() => setRemoving(c.id)}>
                    Disconnect
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        <FormError error={error} />
        <div className="mt-auto">
          {it.configured && slug && canManage && (
            <Button
              variant={it.connected ? 'outline' : 'primary'}
              loading={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  const { url } = await api.integrations.connect(slug, orgId);
                  const u = new URL(url, window.location.origin);
                  if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error('The server returned an invalid connect URL.');
                  window.location.assign(u.toString());
                } catch (e) {
                  setError(e);
                  setBusy(false);
                }
              }}
            >
              {it.connected ? 'Connect another account' : 'Connect'}
            </Button>
          )}
          {it.configured && !canManage && <p className="text-xs text-slate-500">Only organization admins can manage integrations.</p>}
        </div>
      </CardBody>
      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Disconnect ${it.name}`}
        description="Stored credentials are revoked and deleted. Scans of private sources from this account will stop working."
        confirmLabel="Disconnect"
        busy={removeBusy}
        onConfirm={async () => {
          if (!removing) return;
          setRemoveBusy(true);
          try {
            await api.integrations.disconnect(removing);
            setRemoving(null);
            onChanged();
          } catch (e) {
            setError(e);
            setRemoving(null);
          } finally {
            setRemoveBusy(false);
          }
        }}
      />
    </Card>
  );
}

function IntegrationsInner() {
  const { currentOrg, can } = useAuth();
  const params = useSearchParams();
  const orgId = currentOrg?.id ?? null;
  const { data, error, loading, reload } = useApi(orgId ? `integrations:${orgId}` : null, () => api.integrations.list(orgId as string));
  const status = params.get('status') ?? params.get('connected');
  const callbackError = params.get('error');
  return (
    <>
      <PageHeader title="Integrations" description="Connect providers to scan private sources. Public sources can be scanned without connecting anything." />
      {callbackError && <Notice tone="danger" className="mb-4">The connection did not complete: {callbackError}</Notice>}
      {status && !callbackError && <Notice tone="success" className="mb-4">Integration connected.</Notice>}
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <LoadingBlock rows={4} />
      ) : data && data.length ? (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {data.map((it) => (
            <IntegrationCard key={it.provider} it={it} canManage={can('manageIntegrations')} orgId={orgId as string} onChanged={reload} />
          ))}
        </div>
      ) : (
        <EmptyState title="No integrations available" />
      )}
    </>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={<LoadingBlock rows={4} />}>
      <IntegrationsInner />
    </Suspense>
  );
}
