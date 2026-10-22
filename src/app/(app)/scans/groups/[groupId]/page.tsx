'use client';

import { ProgressBar, ScanStatusBadge } from '../../../../../components/primitives';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo } from 'react';
import { branchesDifferingFrom, BranchTable } from '@/components/branch-table';
import { isTerminal } from '@/components/scan-bits';
import { Card, CardBody, CardHeader, ErrorState, LoadingBlock, Notice, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { STAGE_LABELS } from '@/lib/format';
import { useApi, useInterval } from '@/lib/hooks';

export default function ScanGroupPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { data, error, loading, reload } = useApi(`group:${groupId}`, () => api.scans.group(groupId));
  const running = !!data && data.scans.some((s) => !isTerminal(s.status));
  useInterval(reload, 2000, running);

  const defaultBranch = useMemo(() => {
    if (!data) return null;
    // The API's BranchSummaryView has no default flag; use the project's source default when available,
    // otherwise fall back to common names.
    const names = data.branches.map((b) => b.branch);
    return ['main', 'master', 'develop', 'trunk'].find((n) => names.includes(n)) ?? null;
  }, [data]);
  const project = useApi(data?.scans[0] ? `project:${data.scans[0].projectId}` : null, () => api.projects.get(data!.scans[0].projectId));
  const projectDefault = project.data?.sources?.find((s) => s.defaultBranch)?.defaultBranch ?? null;
  const effectiveDefault = projectDefault && data?.branches.some((b) => b.branch === projectDefault) ? projectDefault : defaultBranch;
  const differs = useMemo(() => (data ? branchesDifferingFrom(data.branches.filter((b) => isTerminal(b.status)), effectiveDefault) : new Set<string>()), [data, effectiveDefault]);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !data) return <LoadingBlock rows={6} label="Loading branch comparison" />;
  if (!data) return null;

  return (
    <>
      <PageHeader
        title="Branch comparison"
        description={data.repository}
        breadcrumb={data.scans[0] ? [{ href: `/projects/${data.scans[0].projectId}`, label: data.scans[0].projectName ?? 'Project' }] : undefined}
      />
      <div className="space-y-6">
        {running && (
          <Card>
            <CardHeader title="Progress" description="Updates every 2 seconds." />
            <ul className="divide-y divide-slate-100 dark:divide-ink-700">
              {data.scans.map((s) => (
                <li key={s.id} className="grid gap-2 px-5 py-3 sm:grid-cols-[1fr_120px_220px] sm:items-center">
                  <Link href={`/scans/${s.id}`} className="font-medium hover:underline">
                    {s.ref ?? s.sourceLabel}
                  </Link>
                  <ScanStatusBadge status={s.status} />
                  <div>
                    <p className="mb-1 text-xs text-slate-500">{s.stage ? STAGE_LABELS[s.stage] : 'Queued'} · {s.progress}%</p>
                    <ProgressBar value={isTerminal(s.status) ? 100 : s.progress} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
        <Card>
          <CardHeader
            title="Branch-wise summary"
            description={effectiveDefault ? `Highlighted rows differ from the default branch (${effectiveDefault}).` : 'Default branch unknown; differences are not highlighted.'}
          />
          {data.branches.length ? (
            <BranchTable branches={data.branches} defaultBranch={effectiveDefault} differs={differs} />
          ) : (
            <CardBody>
              <Notice tone="neutral">Branch summaries appear as each branch scan completes.</Notice>
            </CardBody>
          )}
        </Card>
      </div>
    </>
  );
}
