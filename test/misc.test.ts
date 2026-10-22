import type { BranchSummaryView, OrganizationView } from '../src/contracts';
import { describe, expect, it } from 'vitest';
import { selectOrganization } from '@/components/auth';
import { branchesDifferingFrom } from '@/components/branch-table';
import { assignableRoles, can } from '@/lib/roles';
import { invalidAllowlistEntries, safeNextPath } from '@/lib/validation';
import { safeHref } from '@/lib/format';

const org = (id: string): OrganizationView => ({ id, name: id, slug: id, role: 'OWNER', planKey: 'free' });

function branch(name: string, high: number): BranchSummaryView {
  return {
    branch: name,
    scanId: `s-${name}`,
    status: 'COMPLETED',
    commitSha: null,
    completedAt: null,
    filesScanned: 1,
    severityCounts: { CRITICAL: 0, HIGH: high, MEDIUM: 0, LOW: 0, INFO: 0 },
    suspiciousCount: 0,
    vulnerableDependencies: 0,
    malwareIndicators: 0,
    riskScore: 0,
    riskLevel: 'MINIMAL',
  };
}

describe('misc helpers', () => {
  it('selects the stored org, falling back to the first', () => {
    const orgs = [org('507f1f77bcf86cd799439011'), org('507f1f77bcf86cd799439012')];
    expect(selectOrganization(orgs, '507f1f77bcf86cd799439012')?.id).toBe('507f1f77bcf86cd799439012');
    expect(selectOrganization(orgs, 'gone')?.id).toBe('507f1f77bcf86cd799439011');
    expect(selectOrganization([], null)).toBeNull();
  });

  it('applies the documented role matrix', () => {
    expect(can('VIEWER', 'view')).toBe(true);
    expect(can('VIEWER', 'scan')).toBe(false);
    expect(can('DEVELOPER', 'scan')).toBe(true);
    expect(can('SECURITY_ANALYST', 'triageFindings')).toBe(true);
    expect(can('DEVELOPER', 'manageIntegrations')).toBe(false);
    expect(can('ADMIN', 'manageMembers')).toBe(true);
    expect(can('ADMIN', 'deleteOrganization')).toBe(false);
    expect(can('OWNER', 'deleteOrganization')).toBe(true);
    expect(assignableRoles('ADMIN')).not.toContain('OWNER');
    expect(assignableRoles('VIEWER')).toEqual([]);
  });

  it('prevents open redirects through ?next=', () => {
    expect(safeNextPath('/scans/1')).toBe('/scans/1');
    expect(safeNextPath('//evil.com')).toBe('/dashboard');
    expect(safeNextPath('https://evil.com')).toBe('/dashboard');
    expect(safeNextPath(null)).toBe('/dashboard');
  });

  it('only renders http(s) links', () => {
    expect(safeHref('https://github.com/a')).toBe('https://github.com/a');
    expect(safeHref('javascript:alert(1)')).toBeNull();
  });

  it('flags invalid re: allowlist entries', () => {
    expect(invalidAllowlistEntries(['plain', 're:^ok$', 're:(unclosed'])).toEqual(['re:(unclosed']);
  });

  it('detects branches whose results differ from the default branch', () => {
    const diff = branchesDifferingFrom([branch('main', 1), branch('dev', 1), branch('feature', 3)], 'main');
    expect([...diff]).toEqual(['feature']);
    expect(branchesDifferingFrom([branch('dev', 1)], 'main').size).toBe(0);
  });
});
