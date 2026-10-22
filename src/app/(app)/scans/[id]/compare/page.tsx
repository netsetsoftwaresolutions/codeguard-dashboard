'use client';

import { EmptyState, RiskBadge } from '../../../../../components/primitives';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ComparisonView } from '@/components/comparison-view';
import { ErrorState, LinkButton, LoadingBlock, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import type { ScanView } from '../../../../../contracts';

function ScanChip({ scan, label }: { scan: ScanView | undefined; label: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-slate-200 p-3 text-sm dark:border-ink-600">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      {scan ? (
        <>
          <Link href={`/scans/${scan.id}`} className="block truncate font-medium hover:underline">
            {scan.ref ?? scan.sourceLabel}
          </Link>
          <p className="text-xs text-slate-500">{formatDateTime(scan.createdAt)}</p>
          {scan.summary && <RiskBadge level={scan.summary.risk.level} score={scan.summary.risk.score} className="mt-1" />}
        </>
      ) : (
        <p className="text-slate-400">…</p>
      )}
    </div>
  );
}

function CompareInner() {
  const { id } = useParams<{ id: string }>();
  const base = useSearchParams().get('base');
  const head = useApi(`scan:${id}`, () => api.scans.get(id));
  const baseScan = useApi(base ? `scan:${base}` : null, () => api.scans.get(base as string));
  const cmp = useApi(base ? `compare:${id}:${base}` : null, () => api.scans.compare(id, base as string));
  return (
    <>
      <PageHeader title="Scan comparison" breadcrumb={[{ href: `/scans/${id}`, label: 'Report' }]} />
      {!base ? (
        <EmptyState title="Choose a baseline" description="Open the Compare tab on a scan report to pick a scan to compare with." action={<LinkButton href={`/scans/${id}?tab=compare`}>Pick baseline</LinkButton>} />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <ScanChip scan={baseScan.data} label="Baseline" />
            <ArrowRight className="text-slate-400" aria-label="compared with" />
            <ScanChip scan={head.data} label="Compared scan" />
          </div>
          {cmp.error ? <ErrorState error={cmp.error} onRetry={cmp.reload} /> : cmp.loading || !cmp.data ? <LoadingBlock rows={6} /> : <ComparisonView comparison={cmp.data} />}
        </div>
      )}
    </>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<LoadingBlock rows={6} />}>
      <CompareInner />
    </Suspense>
  );
}
