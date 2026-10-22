import type { FindingCategory, ScanStage, ScanType, SourceProvider } from '../contracts';

export const CATEGORY_LABELS: Record<FindingCategory, string> = {
  OBFUSCATION: 'Obfuscation',
  REMOTE_CODE_EXECUTION: 'Remote code execution',
  CREDENTIAL_THEFT: 'Credential theft',
  DATA_EXFILTRATION: 'Data exfiltration',
  BACKDOOR: 'Backdoor',
  SUPPLY_CHAIN: 'Supply chain',
  VULNERABLE_DEPENDENCY: 'Vulnerable dependency',
  MALICIOUS_PACKAGE: 'Malicious package',
  SECRET: 'Secret',
  CONFIGURATION: 'Configuration',
  EXPOSED_FILE: 'Exposed file',
  CODE_QUALITY_SECURITY: 'Code security',
  SUSPICIOUS_NETWORK: 'Suspicious network',
};

export const PROVIDER_LABELS: Record<SourceProvider, string> = {
  UPLOAD: 'Upload',
  GITHUB: 'GitHub',
  GITLAB: 'GitLab',
  BITBUCKET: 'Bitbucket',
  DROPBOX: 'Dropbox',
  GOOGLE_DRIVE: 'Google Drive',
  PUBLIC_URL: 'Public URL',
};

export const SCAN_TYPE_LABELS: Record<ScanType, string> = {
  UPLOAD: 'Upload',
  URL: 'URL',
  REPOSITORY: 'Repository',
  BRANCH: 'Branch',
  FILE: 'File',
  PULL_REQUEST: 'Pull request',
  COMMIT_HISTORY: 'Commit history',
};

export const STAGE_LABELS: Record<ScanStage, string> = {
  VALIDATING: 'Validating request',
  ACQUIRING_SOURCE: 'Acquiring source',
  BUILDING_INVENTORY: 'Building file inventory',
  DETECTING_ECOSYSTEMS: 'Detecting ecosystems',
  RUNNING_ENGINES: 'Running scan engines',
  NORMALIZING: 'Normalizing findings',
  SCORING: 'Scoring risk',
  AI_ANALYSIS: 'AI analysis (opt-in)',
  SAVING: 'Saving results',
  DONE: 'Done',
};

export function shortSha(sha: string | null | undefined, n = 7): string {
  return sha ? sha.slice(0, n) : '—';
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return '—';
  if (ms < 1000) return `${ms} ms`;
  const s = ms / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  return `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`;
}

export function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat().format(n);
}

/** Humanises SCREAMING_SNAKE identifiers ("NOT_INSTALLED" → "Not installed"). */
export function humanize(s: string): string {
  const t = s.replace(/[_-]+/g, ' ').toLowerCase().trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${formatNumber(n)} ${n === 1 ? one : many}`;
}

export function osvLink(id: string): string {
  return `https://osv.dev/vulnerability/${encodeURIComponent(id)}`;
}

/** Only http(s) links are rendered as anchors (defence against javascript: URLs in data). */
export function safeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null;
  } catch {
    return null;
  }
}

export function sevTotal(counts: Partial<Record<string, number>> | null | undefined): number {
  if (!counts) return 0;
  return Object.values(counts).reduce<number>((s, v) => s + (v ?? 0), 0);
}

export { formatRelativeTime as formatRelativeTimeSafe } from '../components/primitives';
