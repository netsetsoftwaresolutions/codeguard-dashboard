import { describe, expect, it } from 'vitest';
import { activeFilterCount, applyFindingFilters, EMPTY_FILTERS, filtersFromParams, splitByIntroduced, toFindingsQuery } from '@/lib/findings-filter';
import { finding } from './fixtures';

const list = [
  finding({ id: '1', severity: 'LOW', category: 'SECRET', title: 'AWS key', filePath: 'src/config.ts', introducedInChange: true }),
  finding({ id: '2', severity: 'CRITICAL', category: 'BACKDOOR', title: 'Reverse shell', status: 'CONFIRMED', classification: 'SUSPICIOUS' }),
  finding({ id: '3', severity: 'HIGH', title: 'lodash', packageName: 'lodash', advisoryIds: ['GHSA-xxxx'], introducedInChange: false }),
  finding({ id: '4', severity: 'MEDIUM', status: 'RESOLVED', classification: 'FALSE_POSITIVE_CANDIDATE', title: 'eval in test', introducedInChange: null }),
];

describe('findings filters', () => {
  it('builds API queries and omits empty filters', () => {
    expect(toFindingsQuery(EMPTY_FILTERS)).toEqual({ page: 1, pageSize: 50 });
    expect(toFindingsQuery({ ...EMPTY_FILTERS, severity: 'HIGH', search: '  lodash ', onlyNew: true }, 3, 20)).toEqual({
      page: 3,
      pageSize: 20,
      severity: 'HIGH',
      search: 'lodash',
      onlyNew: 'true',
    });
  });

  it('reads filters from URL params, dropping unknown values', () => {
    const f = filtersFromParams(new URLSearchParams('severity=HIGH&category=NOPE&status=OPEN&onlyNew=true&search=x'));
    expect(f).toEqual({ severity: 'HIGH', category: '', status: 'OPEN', classification: '', search: 'x', onlyNew: true });
    expect(activeFilterCount(f)).toBe(4);
  });

  it('filters by severity, status, classification and sorts by severity', () => {
    expect(applyFindingFilters(list, EMPTY_FILTERS).map((f) => f.id)).toEqual(['2', '3', '4', '1']);
    expect(applyFindingFilters(list, { ...EMPTY_FILTERS, severity: 'LOW' }).map((f) => f.id)).toEqual(['1']);
    expect(applyFindingFilters(list, { ...EMPTY_FILTERS, status: 'RESOLVED' }).map((f) => f.id)).toEqual(['4']);
    expect(applyFindingFilters(list, { ...EMPTY_FILTERS, classification: 'SUSPICIOUS' }).map((f) => f.id)).toEqual(['2']);
    expect(applyFindingFilters(list, { ...EMPTY_FILTERS, category: 'SECRET' }).map((f) => f.id)).toEqual(['1']);
  });

  it('searches title, file path, package and advisory ids case-insensitively', () => {
    expect(applyFindingFilters(list, { ...EMPTY_FILTERS, search: 'CONFIG.ts' }).map((f) => f.id)).toEqual(['1']);
    expect(applyFindingFilters(list, { ...EMPTY_FILTERS, search: 'ghsa-xxxx' }).map((f) => f.id)).toEqual(['3']);
  });

  it('"only new" keeps only findings introduced in the change', () => {
    expect(applyFindingFilters(list, { ...EMPTY_FILTERS, onlyNew: true }).map((f) => f.id)).toEqual(['1']);
    const { introduced, preexisting } = splitByIntroduced(list);
    expect(introduced.map((f) => f.id)).toEqual(['1']);
    expect(preexisting).toHaveLength(3);
  });
});
