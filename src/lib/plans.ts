import { formatBytes } from '../components/primitives';
import { formatNumber, humanize } from './format';

export const FEATURE_LABELS: Record<string, string> = {
  upload_scans: 'File, folder & archive uploads',
  public_repo_scans: 'Public repository scans',
  url_scans: 'Scan by URL',
  cloud_links: 'Dropbox & Google Drive links',
  pull_request_scans: 'Pull request analysis',
  multi_branch: 'Multi-branch scans',
  commit_history: 'Commit history investigation',
  ai_explanations: 'AI explanations (opt-in)',
  report_exports: 'CSV & PDF report exports',
  continuous_monitoring: 'Scheduled & webhook monitoring',
  private_repos: 'Private repositories',
  team_access: 'Team workspaces & roles',
  security_policies: 'Security policies',
  advanced_reporting: 'Advanced reporting',
};

export const LIMIT_LABELS: Record<string, string> = {
  scansPerMonth: 'Scans / month',
  maxProjects: 'Projects',
  maxMembers: 'Members',
  maxBranchesPerScan: 'Branches per scan',
  maxUploadBytes: 'Max upload size',
  reportRetentionDays: 'Report retention',
};

export function featureLabel(key: string): string {
  return FEATURE_LABELS[key] ?? humanize(key);
}

export function limitLabel(key: string): string {
  return LIMIT_LABELS[key] ?? humanize(key);
}

export function formatLimit(key: string, value: number): string {
  if (!Number.isFinite(value) || value < 0) return 'Unlimited';
  if (key === 'maxUploadBytes') return formatBytes(value);
  if (key === 'reportRetentionDays') return `${formatNumber(value)} days`;
  return formatNumber(value);
}

export function formatPrice(monthlyPriceUsd: number | null | undefined): string {
  if (monthlyPriceUsd === 0) return 'Free';
  if (monthlyPriceUsd === null || monthlyPriceUsd === undefined) return 'Contact us';
  return `$${monthlyPriceUsd}/mo`;
}
