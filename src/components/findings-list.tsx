'use client';

import type { FindingView, Paginated } from '../contracts';
import { FINDING_CATEGORIES, FINDING_CLASSIFICATIONS, FINDING_STATUSES, SEVERITIES } from '../contracts';
import { ClassificationBadge, EmptyState, FindingStatusBadge, findingStatusLabel, SEVERITY_STYLES, SeverityBadge } from './primitives';
import { ChevronRight, Funnel, Search, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useState, type ChangeEvent } from 'react';
import { api, type FindingsQuery } from '@/lib/api';
import { activeFilterCount, EMPTY_FILTERS, toFindingsQuery, type FindingFilters } from '@/lib/findings-filter';
import { CATEGORY_LABELS } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import type { FindingDetailView } from '@/lib/types';
import { useAuth } from './auth';
import { FindingDetail, locationLabel } from './finding-detail';
import { useMeta } from './meta';
import { Button, Checkbox, Drawer, ErrorState, focusRing, Input, LoadingBlock, Pagination, Pill, Select } from './ui';

const CLASSIFICATION_LABELS: Record<string, string> = {
  CONFIRMED: 'Confirmed',
  SUSPICIOUS: 'Suspicious',
  FALSE_POSITIVE_CANDIDATE: 'Possible false positive',
};

export function FindingFiltersBar({ value, onChange, showOnlyNew }: { value: FindingFilters; onChange: (f: FindingFilters) => void; showOnlyNew?: boolean }) {
  const [search, setSearch] = useState(value.search);
  useEffect(() => setSearch(value.search), [value.search]);
  useEffect(() => {
    if (search === value.search) return;
    const t = window.setTimeout(() => onChange({ ...value, search }), 300);
    return () => window.clearTimeout(t);
  }, [search, value, onChange]);
  const set = (k: keyof FindingFilters) => (e: ChangeEvent<HTMLSelectElement>) => onChange({ ...value, [k]: e.target.value });
  const count = activeFilterCount(value);
  return (
    <div className="space-y-3 border-b border-slate-200 p-4 dark:border-ink-600" role="search" aria-label="Filter findings">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative lg:col-span-1">
          <label htmlFor="f-search" className="sr-only">
            Search findings
          </label>
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input id="f-search" placeholder="Search title, file, package…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} maxLength={200} />
        </div>
        <div>
          <label htmlFor="f-sev" className="sr-only">
            Severity
          </label>
          <Select id="f-sev" value={value.severity} onChange={set('severity')}>
            <option value="">All severities</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {SEVERITY_STYLES[s].label}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="f-cat" className="sr-only">
            Category
          </label>
          <Select id="f-cat" value={value.category} onChange={set('category')}>
            <option value="">All categories</option>
            {FINDING_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="f-status" className="sr-only">
            Status
          </label>
          <Select id="f-status" value={value.status} onChange={set('status')}>
            <option value="">All statuses</option>
            {FINDING_STATUSES.map((s) => (
              <option key={s} value={s}>
                {findingStatusLabel(s)}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label htmlFor="f-class" className="sr-only">
            Classification
          </label>
          <Select id="f-class" value={value.classification} onChange={set('classification')}>
            <option value="">All classifications</option>
            {FINDING_CLASSIFICATIONS.map((c) => (
              <option key={c} value={c}>
                {CLASSIFICATION_LABELS[c]}
              </option>
            ))}
          </Select>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {showOnlyNew ? (
          <Checkbox checked={value.onlyNew} onChange={(v) => onChange({ ...value, onlyNew: v })} label="Only new in this change" />
        ) : (
          <span />
        )}
        {count > 0 && (
          <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_FILTERS)} icon={<Funnel size={14} aria-hidden="true" />}>
            Clear {count} filter{count === 1 ? '' : 's'}
          </Button>
        )}
      </div>
    </div>
  );
}

export function FindingRow({ finding, onOpen }: { finding: FindingView; onOpen: () => void }) {
  const loc = locationLabel(finding);
  return (
    <li>
      <button type="button" onClick={onOpen} className={`group flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-ink-700/40 ${focusRing}`}>
        <div className="w-20 shrink-0 pt-0.5">
          <SeverityBadge severity={finding.severity} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-slate-900 group-hover:text-brand-700 dark:text-white dark:group-hover:text-brand-400">{finding.title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <ClassificationBadge classification={finding.classification} />
            <span>{CATEGORY_LABELS[finding.category]}</span>
            {loc && <code className="max-w-full truncate font-mono">{loc}</code>}
            {finding.packageName && (
              <code className="font-mono">
                {finding.packageName}@{finding.packageVersion ?? '?'}
              </code>
            )}
            {finding.introducedInChange === true && <Pill className="bg-purple-500/10 text-purple-700 dark:text-purple-300">New</Pill>}
          </div>
        </div>
        <div className="hidden shrink-0 sm:block">
          <FindingStatusBadge status={finding.status} />
        </div>
        <ChevronRight size={16} className="mt-1 shrink-0 text-slate-400" aria-hidden="true" />
      </button>
    </li>
  );
}

/** Loads the full finding (incl. evidence) when opened. */
export function FindingDrawer({ findingId, onClose, onUpdated }: { findingId: string | null; onClose: () => void; onUpdated?: (f: FindingDetailView) => void }) {
  const { meta } = useMeta();
  const { can } = useAuth();
  const { data, error, loading, reload } = useApi(findingId ? `finding:${findingId}` : null, () => api.findings.get(findingId as string));
  return (
    <Drawer open={!!findingId} onClose={onClose} label="Finding details" title={<p className="text-sm font-semibold text-slate-900 dark:text-white">Finding details</p>}>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading || !data ? (
        <LoadingBlock rows={6} label="Loading finding" />
      ) : (
        <FindingDetail key={data.id} finding={data} aiAvailable={!!meta?.features.ai} canTriage={can('triageFindings')} onUpdated={onUpdated} />
      )}
    </Drawer>
  );
}

export function FindingsList({
  sourceKey,
  fetchPage,
  showOnlyNew,
  initialFilters,
  emptyTitle = 'No findings match',
  pageSize = 50,
}: {
  /** Changes when the underlying collection changes (scan id, project id). */
  sourceKey: string;
  fetchPage: (q: FindingsQuery) => Promise<Paginated<FindingView>>;
  showOnlyNew?: boolean;
  initialFilters?: Partial<FindingFilters>;
  emptyTitle?: string;
  pageSize?: number;
}) {
  const [filters, setFilters] = useState<FindingFilters>({ ...EMPTY_FILTERS, ...initialFilters });
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);
  const query = useMemo(() => toFindingsQuery(filters, page, pageSize), [filters, page, pageSize]);
  const key = `${sourceKey}:${JSON.stringify(query)}`;
  const { data, error, loading, reload, setData } = useApi(key, () => fetchPage(query));
  const filtered = activeFilterCount(filters) > 0;

  return (
    <div>
      <FindingFiltersBar
        value={filters}
        showOnlyNew={showOnlyNew}
        onChange={(f) => {
          setFilters(f);
          setPage(1);
        }}
      />
      {error ? (
        <div className="p-4">
          <ErrorState error={error} onRetry={reload} />
        </div>
      ) : loading && !data ? (
        <div className="p-4">
          <LoadingBlock rows={5} label="Loading findings" />
        </div>
      ) : data && data.items.length ? (
        <>
          <p className="sr-only" aria-live="polite">
            {data.total} findings
          </p>
          <ul className={`divide-y divide-slate-100 dark:divide-ink-700 ${loading ? 'opacity-60' : ''}`}>
            {data.items.map((f) => (
              <FindingRow key={f.id} finding={f} onOpen={() => setOpenId(f.id)} />
            ))}
          </ul>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
        </>
      ) : (
        <div className="p-4">
          <EmptyState
            icon={<ShieldCheck size={28} aria-hidden="true" />}
            title={filtered ? emptyTitle : 'No findings reported'}
            description={
              filtered
                ? 'Try clearing some filters.'
                : 'The engines that ran did not report findings. This is not a guarantee the code is safe — review the coverage and limitations.'
            }
          />
        </div>
      )}
      <FindingDrawer
        findingId={openId}
        onClose={() => setOpenId(null)}
        onUpdated={(f) => setData((prev) => (prev ? { ...prev, items: prev.items.map((x) => (x.id === f.id ? { ...x, ...f } : x)) } : prev))}
      />
    </div>
  );
}
