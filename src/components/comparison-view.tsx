'use client';

import type { FindingView, ScanComparisonView } from '../contracts';
import { EmptyState } from './primitives';
import { useState } from 'react';
import { applyFindingFilters, EMPTY_FILTERS, type FindingFilters } from '@/lib/findings-filter';
import { formatNumber } from '@/lib/format';
import { FindingDrawer, FindingFiltersBar, FindingRow } from './findings-list';
import { Card, CardHeader, Tabs } from './ui';

export function ComparisonView({ comparison }: { comparison: ScanComparisonView }) {
  const [tab, setTab] = useState<'new' | 'resolved'>('new');
  const [filters, setFilters] = useState<FindingFilters>(EMPTY_FILTERS);
  const [openId, setOpenId] = useState<string | null>(null);
  const list: FindingView[] = applyFindingFilters(tab === 'new' ? comparison.newFindings : comparison.resolvedFindings, filters);
  const delta = comparison.riskDelta;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          ['New', formatNumber(comparison.newFindings.length), 'text-orange-600 dark:text-orange-400'],
          ['Resolved', formatNumber(comparison.resolvedFindings.length), 'text-green-600 dark:text-green-400'],
          ['Unchanged', formatNumber(comparison.unchangedCount), ''],
          ['Risk delta', `${delta > 0 ? '+' : ''}${delta}`, delta > 0 ? 'text-red-600 dark:text-red-400' : delta < 0 ? 'text-green-600 dark:text-green-400' : ''],
        ].map(([label, v, cls]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-ink-600 dark:bg-ink-800">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
            <p className={`mt-1 text-2xl font-semibold tabular-nums ${cls}`}>{v}</p>
          </div>
        ))}
      </div>
      <Card>
        <CardHeader title="Changed findings" />
        <div className="px-4 pt-2">
          <Tabs
            label="Comparison"
            active={tab}
            onChange={(k) => setTab(k as 'new' | 'resolved')}
            items={[
              { key: 'new', label: 'New', count: comparison.newFindings.length },
              { key: 'resolved', label: 'Resolved', count: comparison.resolvedFindings.length },
            ]}
          />
        </div>
        <FindingFiltersBar value={filters} onChange={setFilters} />
        {list.length ? (
          <ul className="divide-y divide-slate-100 dark:divide-ink-700">
            {list.map((f) => (
              <FindingRow key={f.id} finding={f} onOpen={() => setOpenId(f.id)} />
            ))}
          </ul>
        ) : (
          <div className="p-4">
            <EmptyState title={tab === 'new' ? 'No new findings' : 'No resolved findings'} />
          </div>
        )}
      </Card>
      <FindingDrawer findingId={openId} onClose={() => setOpenId(null)} />
    </div>
  );
}
