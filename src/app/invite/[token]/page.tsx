'use client';

import type { OrganizationView } from '../../../contracts';
import { ShieldLogo } from '../../../components/primitives';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useMeta } from '@/components/meta';
import { ORG_STORAGE_KEY } from '@/components/auth';
import { Button, FormError, LinkButton, LoadingBlock, Notice } from '@/components/ui';
import { api, ApiError } from '@/lib/api';
import type { MeResponse } from '@/lib/types';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { productName } = useMeta();
  const [me, setMe] = useState<MeResponse | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [joined, setJoined] = useState<OrganizationView | null>(null);

  useEffect(() => {
    api.auth
      .me({ skipAuthRedirect: true })
      .then(setMe)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) setMe(null);
        else setError(e);
      });
  }, []);

  const next = encodeURIComponent(`/invite/${token}`);

  return (
    <main id="main" className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-ink-600 dark:bg-ink-800">
        <div className="mb-6 flex items-center gap-2">
          <ShieldLogo size={28} />
          <span className="font-semibold">{productName}</span>
        </div>
        <h1 className="text-xl font-semibold">Organization invitation</h1>
        {me === undefined && !error ? (
          <div className="mt-6">
            <LoadingBlock rows={2} label="Checking your session" />
          </div>
        ) : joined ? (
          <div className="mt-6 space-y-4">
            <Notice tone="success" title={`You joined ${joined.name}`}>
              You can now access its projects and reports according to your role.
            </Notice>
            <LinkButton href="/dashboard">Go to dashboard</LinkButton>
          </div>
        ) : me === null ? (
          <div className="mt-4 space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <p>Sign in or create an account with the invited email address to accept this invitation.</p>
            <div className="flex gap-2">
              <LinkButton href={`/login?next=${next}`}>Sign in</LinkButton>
              <LinkButton href={`/register?next=${next}`} variant="outline">
                Create account
              </LinkButton>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4 text-sm text-slate-600 dark:text-slate-300">
            {me && (
              <p>
                You are signed in as <strong className="text-slate-900 dark:text-white">{me.user.email}</strong>. Accepting adds this account to the inviting organization.
              </p>
            )}
            <FormError error={error} />
            {me && (
              <Button
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    const org = await api.acceptInvitation(token);
                    try {
                      localStorage.setItem(ORG_STORAGE_KEY, org.id);
                    } catch {
                      /* ignore */
                    }
                    setJoined(org);
                  } catch (e) {
                    setError(e);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Accept invitation
              </Button>
            )}
            <p className="text-xs">
              <Link href="/dashboard" className="text-brand-600 hover:underline dark:text-brand-400">
                Not now
              </Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
