'use client';

import type { ScanView } from '../../../../contracts';
import { EmptyState, formatBytes, ScanStatusBadge } from '../../../../components/primitives';
import { Ban, Download, GitCompare, RefreshCw, Share2, Trash } from 'lucide-react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth';
import { CommitList } from '@/components/commit-list';
import { FindingDrawer, FindingsList } from '@/components/findings-list';
import { isTerminal } from '@/components/scan-bits';
import { CoverageSection, PullRequestHeader, ScanProgressCard, ScanSummarySection } from '@/components/scan-report';
import {
  Button,
  buttonClass,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  CopyButton,
  ErrorState,
  Field,
  FormError,
  LinkButton,
  LoadingBlock,
  Modal,
  Notice,
  PageHeader,
  Pagination,
  Pill,
  Select,
  Table,
  Tabs,
  tbodyClass,
  Td,
  Th,
} from '@/components/ui';
import { api } from '@/lib/api';
import { formatDateTime, humanize, PROVIDER_LABELS, SCAN_TYPE_LABELS } from '@/lib/format';
import { useApi, useInterval } from '@/lib/hooks';
import type { ShareResponse } from '@/lib/types';
import { scanDestination } from '@/components/scan-form-bits';

type Tab = 'findings' | 'files' | 'commits' | 'compare';

function FilesTab({ scanId }: { scanId: string }) {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const { data, error, loading, reload } = useApi(`files:${scanId}:${page}:${status}`, () => api.scans.files(scanId, page, status || undefined));
  return (
    <Card>
      <CardHeader
        title="File inventory"
        action={
          <div className="w-44">
            <label htmlFor="file-status" className="sr-only">
              File status
            </label>
            <Select
              id="file-status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All files</option>
              <option value="SCANNED">Scanned</option>
              <option value="EXCLUDED">Excluded</option>
              <option value="BINARY">Binary</option>
              <option value="TOO_LARGE">Too large</option>
            </Select>
          </div>
        }
      />
      {error ? (
        <CardBody>
          <ErrorState error={error} onRetry={reload} />
        </CardBody>
      ) : loading && !data ? (
        <CardBody>
          <LoadingBlock rows={6} />
        </CardBody>
      ) : data && data.items.length ? (
        <>
          <Table caption="Scanned file inventory">
            <thead>
              <tr>
                <Th>Path</Th>
                <Th>Language</Th>
                <Th align="right">Size</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody className={tbodyClass}>
              {data.items.map((f) => (
                <tr key={f.path}>
                  <Td className="max-w-md break-all font-mono text-xs">{f.path}</Td>
                  <Td className="text-xs">{f.language ?? '—'}</Td>
                  <Td align="right" className="text-xs">
                    {formatBytes(f.sizeBytes)}
                  </Td>
                  <Td>
                    <Pill className={f.status === 'SCANNED' ? 'bg-green-500/10 text-green-700 dark:text-green-300' : ''}>{humanize(f.status)}</Pill>
                    {f.excludeReason && <span className="ml-2 text-xs text-slate-500">{humanize(f.excludeReason)}</span>}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
        </>
      ) : (
        <CardBody>
          <EmptyState title="No files" description="No file inventory is available for this filter." />
        </CardBody>
      )}
    </Card>
  );
}

function CommitsTab({ scanId }: { scanId: string }) {
  const { data, error, loading, reload } = useApi(`commits:${scanId}`, () => api.scans.commits(scanId));
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !data) return <LoadingBlock rows={4} />;
  return <CommitList commits={data ?? []} scanId={scanId} />;
}

function CompareTab({ scan }: { scan: ScanView }) {
  const router = useRouter();
  const { data, error, loading, reload } = useApi(`history:${scan.projectId}:compare`, () => api.projects.history(scan.projectId, 1, 50));
  const candidates = (data?.items ?? []).filter((s) => s.id !== scan.id && isTerminal(s.status) && s.status !== 'FAILED' && s.status !== 'CANCELLED');
  const [base, setBase] = useState('');
  useEffect(() => {
    if (!base && candidates[0]) setBase(candidates[0].id);
  }, [base, candidates]);
  return (
    <Card>
      <CardHeader title="Compare with another scan" description="Shows new, resolved and unchanged findings, and the change in risk score." />
      <CardBody>
        {error ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && !data ? (
          <LoadingBlock rows={2} />
        ) : candidates.length === 0 ? (
          <EmptyState title="Nothing to compare with" description="This project has no other completed scans yet." />
        ) : (
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (base) router.push(`/scans/${scan.id}/compare?base=${encodeURIComponent(base)}`);
            }}
          >
            <div className="min-w-[280px] flex-1">
              <Field htmlFor="base-scan" label="Baseline scan">
                <Select id="base-scan" value={base} onChange={(e) => setBase(e.target.value)}>
                  {candidates.map((s) => (
                    <option key={s.id} value={s.id}>
                      {formatDateTime(s.createdAt)} · {s.ref ?? s.sourceLabel} {s.summary ? `· risk ${s.summary.risk.score}` : ''}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Button type="submit" icon={<GitCompare size={16} aria-hidden="true" />}>
              Compare
            </Button>
          </form>
        )}
      </CardBody>
    </Card>
  );
}

function ShareModal({ scanId, open, onClose }: { scanId: string; open: boolean; onClose: () => void }) {
  const [days, setDays] = useState('7');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<ShareResponse | null>(null);
  useEffect(() => {
    if (!open) {
      setResult(null);
      setError(null);
    }
  }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Share report"
      footer={
        result ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              loading={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  setResult(await api.scans.share(scanId, Number(days)));
                } catch (e) {
                  setError(e);
                } finally {
                  setBusy(false);
                }
              }}
            >
              Create link
            </Button>
          </>
        )
      }
    >
      <div className="space-y-4 text-sm">
        <Notice tone="info">The link only works for people who sign in as members of this organization. Evidence snippets are never exposed publicly.</Notice>
        {result ? (
          <div className="space-y-2">
            <p className="break-all rounded-lg bg-slate-100 p-2 font-mono text-xs dark:bg-ink-900">{result.url}</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-slate-500">Expires {formatDateTime(result.expiresAt)}</span>
              <CopyButton value={result.url} label="Copy link" />
            </div>
          </div>
        ) : (
          <Field htmlFor="share-days" label="Link expires after">
            <Select id="share-days" value={days} onChange={(e) => setDays(e.target.value)}>
              {[1, 7, 14, 30].map((d) => (
                <option key={d} value={d}>
                  {d} day{d === 1 ? '' : 's'}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <FormError error={error} />
      </div>
    </Modal>
  );
}

function ScanPageInner() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { can } = useAuth();
  const { data: scan, error, loading, reload, setData } = useApi(`scan:${id}`, () => api.scans.get(id));
  const [tab, setTab] = useState<Tab>((['findings', 'files', 'commits', 'compare'] as Tab[]).includes(params.get('tab') as Tab) ? (params.get('tab') as Tab) : 'findings');
  const [openFinding, setOpenFinding] = useState<string | null>(params.get('finding'));
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<unknown>(null);
  const [prCounts, setPrCounts] = useState<{ newCount: number; total: number } | null>(null);

  const running = !!scan && !isTerminal(scan.status);

  // Poll the cheap status endpoint every 2 s while the scan is not terminal.
  const poll = useCallback(async () => {
    try {
      const st = await api.scans.status(id);
      if (isTerminal(st.status)) reload();
      else setData((prev) => (prev ? { ...prev, status: st.status, stage: st.stage, progress: st.progress, errorMessage: st.errorMessage } : prev));
    } catch {
      /* transient polling errors are ignored; the next tick retries */
    }
  }, [id, reload, setData]);
  useInterval(poll, 2000, running);

  useEffect(() => {
    if (!scan || scan.type !== 'PULL_REQUEST' || !isTerminal(scan.status)) return;
    let active = true;
    Promise.all([api.scans.findings(scan.id, { page: 1, pageSize: 1, onlyNew: 'true' }), api.scans.findings(scan.id, { page: 1, pageSize: 1 })])
      .then(([n, all]) => active && setPrCounts({ newCount: n.total, total: all.total }))
      .catch(() => active && setPrCounts(null));
    return () => {
      active = false;
    };
  }, [scan]);

  useEffect(() => {
    if (scan) document.title = `${scan.sourceLabel} · Scan`;
  }, [scan]);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !scan) return <LoadingBlock rows={8} label="Loading scan" />;
  if (!scan) return null;

  const summary = scan.summary ?? null;
  const isPr = scan.type === 'PULL_REQUEST';
  const historyIncluded = scan.type === 'COMMIT_HISTORY' || !!summary?.coverage.engines.some((e) => e.engine === 'git-history' && e.status !== 'SKIPPED');
  const finished = isTerminal(scan.status);

  const doAction = async (name: string, fn: () => Promise<void>) => {
    setActionBusy(name);
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(e);
    } finally {
      setActionBusy(null);
    }
  };

  const actions = (
    <>
      {running && can('scan') && (
        <Button
          variant="outline"
          loading={actionBusy === 'cancel'}
          icon={<Ban size={16} aria-hidden="true" />}
          onClick={() => doAction('cancel', async () => setData(await api.scans.cancel(scan.id)))}
        >
          Cancel scan
        </Button>
      )}
      {finished && (
        <>
          <div className="flex overflow-hidden rounded-lg" role="group" aria-label="Export report">
            {(['json', 'csv', 'pdf'] as const).map((f) => (
              <a key={f} href={api.scans.reportUrl(scan.id, f)} download className={buttonClass('outline', 'md', 'rounded-none first:rounded-l-lg last:rounded-r-lg [&:not(:first-child)]:-ml-px')}>
                {f === 'json' && <Download size={16} aria-hidden="true" />}
                {f.toUpperCase()}
              </a>
            ))}
          </div>
          <Button variant="outline" icon={<Share2 size={16} aria-hidden="true" />} onClick={() => setShareOpen(true)}>
            Share
          </Button>
          {can('scan') && (
            <Button
              variant="outline"
              loading={actionBusy === 'rescan'}
              icon={<RefreshCw size={16} aria-hidden="true" />}
              onClick={() => doAction('rescan', async () => router.push(scanDestination(await api.scans.rescan(scan.id))))}
            >
              Rescan
            </Button>
          )}
          {can('deleteScans') && (
            <Button variant="ghost" icon={<Trash size={16} aria-hidden="true" />} onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
          )}
        </>
      )}
    </>
  );

  return (
    <>
      <PageHeader
        breadcrumb={[
          { href: '/projects', label: 'Projects' },
          { href: `/projects/${scan.projectId}`, label: scan.projectName ?? 'Project' },
        ]}
        title={scan.sourceLabel}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ScanStatusBadge status={scan.status} />
            {PROVIDER_LABELS[scan.provider]} · {SCAN_TYPE_LABELS[scan.type]} · {formatDateTime(scan.createdAt)}
            {scan.scanGroupId && (
              <a href={`/scans/groups/${scan.scanGroupId}`} className="text-brand-600 hover:underline dark:text-brand-400">
                Branch comparison
              </a>
            )}
          </span>
        }
        actions={actions}
      />
      {actionError ? <FormError error={actionError} /> : null}

      {!finished ? (
        <ScanProgressCard scan={scan} />
      ) : (
        <div className="space-y-6">
          {isPr && <PullRequestHeader scan={scan} newCount={prCounts?.newCount ?? null} totalCount={prCounts?.total ?? null} />}
          <ScanSummarySection scan={scan} summary={summary} />
          {summary && <CoverageSection summary={summary} />}
          {scan.status !== 'CANCELLED' && (
            <div>
              <Tabs
                label="Report sections"
                active={tab}
                onChange={(k) => setTab(k as Tab)}
                items={[
                  { key: 'findings', label: 'Findings', count: summary?.totalFindings },
                  { key: 'files', label: 'Files' },
                  ...(historyIncluded ? [{ key: 'commits', label: 'Commits', href: undefined }] : []),
                  { key: 'compare', label: 'Compare' },
                ]}
              />
              <div role="tabpanel" aria-label={tab}>
                {tab === 'findings' && (
                  <Card>
                    <FindingsList sourceKey={`scan:${scan.id}`} fetchPage={(q) => api.scans.findings(scan.id, q)} showOnlyNew={isPr} />
                  </Card>
                )}
                {tab === 'files' && <FilesTab scanId={scan.id} />}
                {tab === 'commits' && historyIncluded && (
                  <div className="space-y-3">
                    <LinkButton href={`/scans/${scan.id}/commits`} variant="outline" size="sm">
                      Open commit investigation
                    </LinkButton>
                    <CommitsTab scanId={scan.id} />
                  </div>
                )}
                {tab === 'compare' && <CompareTab scan={scan} />}
              </div>
            </div>
          )}
        </div>
      )}

      <FindingDrawer findingId={openFinding} onClose={() => setOpenFinding(null)} />
      <ShareModal scanId={scan.id} open={shareOpen} onClose={() => setShareOpen(false)} />
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete scan"
        description="Deletes this scan, its findings and stored artifacts. This cannot be undone."
        confirmLabel="Delete scan"
        busy={actionBusy === 'delete'}
        error={actionError}
        onConfirm={() =>
          doAction('delete', async () => {
            await api.scans.remove(scan.id);
            router.replace(`/projects/${scan.projectId}`);
          })
        }
      />
    </>
  );
}

export default function ScanPage() {
  return (
    <Suspense fallback={<LoadingBlock rows={8} />}>
      <ScanPageInner />
    </Suspense>
  );
}
