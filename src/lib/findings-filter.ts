import type { FindingView } from '../contracts';
import { FINDING_CATEGORIES, FINDING_CLASSIFICATIONS, FINDING_STATUSES, SEVERITIES, SEVERITY_ORDER } from '../contracts';
import type { FindingsQuery } from './api';

export interface FindingFilters {
  severity: string;
  category: string;
  status: string;
  classification: string;
  search: string;
  onlyNew: boolean;
}

export const EMPTY_FILTERS: FindingFilters = { severity: '', category: '', status: '', classification: '', search: '', onlyNew: false };

function oneOf<T extends string>(v: string | null | undefined, allowed: readonly T[]): T | '' {
  return v && (allowed as readonly string[]).includes(v) ? (v as T) : '';
}

/** Reads filters from URL search params, dropping unknown values. */
export function filtersFromParams(params: URLSearchParams): FindingFilters {
  return {
    severity: oneOf(params.get('severity'), SEVERITIES),
    category: oneOf(params.get('category'), FINDING_CATEGORIES),
    status: oneOf(params.get('status'), FINDING_STATUSES),
    classification: oneOf(params.get('classification'), FINDING_CLASSIFICATIONS),
    search: (params.get('search') ?? '').slice(0, 200),
    onlyNew: params.get('onlyNew') === 'true',
  };
}

/** Builds the `FindingsQuerySchema` query for the API; empty filters are omitted. */
export function toFindingsQuery(f: FindingFilters, page = 1, pageSize = 50): FindingsQuery {
  const q: FindingsQuery = { page, pageSize };
  if (f.severity) q.severity = f.severity;
  if (f.category) q.category = f.category;
  if (f.status) q.status = f.status;
  if (f.classification) q.classification = f.classification;
  const s = f.search.trim();
  if (s) q.search = s.slice(0, 200);
  if (f.onlyNew) q.onlyNew = 'true';
  return q;
}

export function activeFilterCount(f: FindingFilters): number {
  return [f.severity, f.category, f.status, f.classification, f.search.trim()].filter(Boolean).length + (f.onlyNew ? 1 : 0);
}

/** Client-side equivalent of the API filters, used for lists already in memory (comparisons). */
export function applyFindingFilters(findings: FindingView[], f: FindingFilters): FindingView[] {
  const needle = f.search.trim().toLowerCase();
  return findings
    .filter((x) => !f.severity || x.severity === f.severity)
    .filter((x) => !f.category || x.category === f.category)
    .filter((x) => !f.status || x.status === f.status)
    .filter((x) => !f.classification || x.classification === f.classification)
    .filter((x) => !f.onlyNew || x.introducedInChange === true)
    .filter((x) => {
      if (!needle) return true;
      const hay = [x.title, x.description, x.filePath, x.ruleId, x.packageName, ...(x.advisoryIds ?? [])]
        .filter(Boolean)
        .join('\n')
        .toLowerCase();
      return hay.includes(needle);
    })
    .sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity] || (a.filePath ?? '').localeCompare(b.filePath ?? ''));
}

/** Splits PR findings into introduced vs pre-existing (null = unknown, counted as pre-existing). */
export function splitByIntroduced(findings: FindingView[]): { introduced: FindingView[]; preexisting: FindingView[] } {
  return {
    introduced: findings.filter((f) => f.introducedInChange === true),
    preexisting: findings.filter((f) => f.introducedInChange !== true),
  };
}
