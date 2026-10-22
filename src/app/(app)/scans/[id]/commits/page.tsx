'use client';

import { useParams } from 'next/navigation';
import { CommitList } from '@/components/commit-list';
import { ErrorState, LoadingBlock, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { useApi } from '@/lib/hooks';

export default function CommitInvestigationPage() {
  const { id } = useParams<{ id: string }>();
  const scan = useApi(`scan:${id}`, () => api.scans.get(id));
  const commits = useApi(`commits:${id}`, () => api.scans.commits(id));
  return (
    <>
      <PageHeader
        title="Commit investigation"
        description={scan.data ? `${scan.data.sourceLabel}${scan.data.ref ? ` · ${scan.data.ref}` : ''}` : undefined}
        breadcrumb={[
          { href: '/projects', label: 'Projects' },
          ...(scan.data ? [{ href: `/projects/${scan.data.projectId}`, label: scan.data.projectName ?? 'Project' }] : []),
          { href: `/scans/${id}`, label: 'Report' },
        ]}
      />
      {commits.error ? (
        <ErrorState error={commits.error} onRetry={commits.reload} />
      ) : commits.loading && !commits.data ? (
        <LoadingBlock rows={6} label="Loading commits" />
      ) : (
        <CommitList commits={commits.data ?? []} scanId={id} />
      )}
    </>
  );
}
