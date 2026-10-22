import type { FindingView, ScanSummaryView, ScanView } from '../src/contracts';

export function finding(overrides: Partial<FindingView> = {}): FindingView {
  return {
    id: '665f1c2e9b1e8a0012345678',
    scanId: '665f1c2e9b1e8a0012345600',
    projectId: '665f1c2e9b1e8a0012345601',
    fingerprint: 'fp1',
    ruleId: 'dep.osv',
    engine: 'osv-api',
    category: 'VULNERABLE_DEPENDENCY',
    classification: 'CONFIRMED',
    title: 'lodash prototype pollution',
    description: 'A vulnerable version of lodash is installed.',
    severity: 'HIGH',
    confidence: 'HIGH',
    status: 'OPEN',
    filePath: 'package-lock.json',
    startLine: 12,
    endLine: 12,
    branch: 'main',
    commitSha: 'abcdef1234567890',
    packageName: 'lodash',
    packageVersion: '4.17.15',
    packageEcosystem: 'npm',
    advisoryIds: ['GHSA-p6mc-m468-83gw'],
    fixedVersions: [],
    maskedEvidence: '"lodash": "4.17.15"',
    recommendation: 'Upgrade lodash.',
    falsePositiveGuidance: null,
    references: ['https://osv.dev/vulnerability/GHSA-p6mc-m468-83gw', 'javascript:alert(1)'],
    sourceLink: null,
    introducedInChange: null,
    aiExplanation: null,
    detectedAt: '2026-10-01T10:00:00.000Z',
    lastSeenAt: '2026-10-01T10:00:00.000Z',
    ...overrides,
  };
}

export function summary(overrides: Partial<ScanSummaryView> = {}): ScanSummaryView {
  return {
    severityCounts: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
    categoryCounts: {},
    classificationCounts: { CONFIRMED: 0, SUSPICIOUS: 0, FALSE_POSITIVE_CANDIDATE: 0 },
    totalFindings: 0,
    risk: { score: 0, level: 'MINIMAL', components: [], methodologyVersion: 'risk-v1' },
    coverage: {
      filesDiscovered: 120,
      filesScanned: 100,
      filesExcluded: 20,
      bytesScanned: 204800,
      excludedSamples: [{ path: 'node_modules/x/index.js', reason: 'VENDORED' }],
      excludedByReason: { VENDORED: 15, BINARY: 5 },
      languages: { JavaScript: 90, JSON: 10 },
      ecosystems: ['npm'],
      manifests: ['package.json'],
      lockfiles: [],
      engines: [
        { engine: 'codeguard-rules', status: 'COMPLETED', version: '1.0.0', durationMs: 1200, findingCount: 0, message: null },
        { engine: 'semgrep', status: 'NOT_INSTALLED', version: null, durationMs: 0, findingCount: 0, message: 'semgrep binary not found' },
      ],
      limitations: ['Minified files were scanned with reduced accuracy.'],
      truncated: false,
    },
    aiUsed: false,
    ...overrides,
  };
}

export function scan(overrides: Partial<ScanView> = {}): ScanView {
  return {
    id: '665f1c2e9b1e8a0012345600',
    projectId: '665f1c2e9b1e8a0012345601',
    projectName: 'Demo',
    type: 'REPOSITORY',
    status: 'COMPLETED',
    stage: 'DONE',
    progress: 100,
    provider: 'GITHUB',
    sourceKind: 'REPOSITORY',
    sourceUrl: 'https://github.com/acme/demo',
    sourceLabel: 'acme/demo',
    ref: 'main',
    commitSha: 'abcdef1234567890',
    scanGroupId: null,
    errorMessage: null,
    createdAt: '2026-10-01T10:00:00.000Z',
    startedAt: '2026-10-01T10:00:01.000Z',
    completedAt: '2026-10-01T10:01:00.000Z',
    summary: summary(),
    ...overrides,
  };
}
