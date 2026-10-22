'use client';

import type { ScanView, SourceProvider } from '../contracts';
import { TERMINAL_SCAN_STATUSES } from '../contracts';
import { formatRelativeTime, RiskBadge, ScanStatusBadge, SeverityCountsRow } from './primitives';
import { Cloud, FolderGit2, Globe, HardDrive, Upload, GitBranch } from 'lucide-react';
import Link from 'next/link';
import { PROVIDER_LABELS, SCAN_TYPE_LABELS, shortSha } from '@/lib/format';
import { Table, tbodyClass, Td, Th } from './ui';

export function isTerminal(status: ScanView['status']): boolean {
  return TERMINAL_SCAN_STATUSES.includes(status);
}

export function ProviderIcon({ provider, size = 16 }: { provider: SourceProvider; size?: number }) {
  const props = { size, 'aria-hidden': true as const, className: 'shrink-0 text-slate-500 dark:text-slate-400' };
  switch (provider) {
    case 'UPLOAD':
      return <Upload {...props} />;
    case 'GITHUB':
    case 'GITLAB':
    case 'BITBUCKET':
      return <FolderGit2 {...props} />;
    case 'DROPBOX':
      return <Cloud {...props} />;
    case 'GOOGLE_DRIVE':
      return <HardDrive {...props} />;
    default:
      return <Globe {...props} />;
  }
}

export function ScanSourceCell({ scan, showProject }: { scan: ScanView; showProject?: boolean }) {
  return (
    <div className="flex min-w-0 items-start gap-2">
      <span className="mt-0.5">
        <ProviderIcon provider={scan.provider} />
      </span>
      <div className="min-w-0">
        <Link href={`/scans/${scan.id}`} className="block truncate font-medium text-slate-900 hover:text-brand-600 hover:underline dark:text-white dark:hover:text-brand-400">
          {scan.sourceLabel || PROVIDER_LABELS[scan.provider]}
        </Link>
        <p className="flex flex-wrap items-center gap-x-2 text-xs text-slate-500 dark:text-slate-400">
          {showProject && scan.projectName && <span>{scan.projectName}</span>}
          <span>{SCAN_TYPE_LABELS[scan.type]}</span>
          {scan.ref && (
            <span className="inline-flex items-center gap-1">
              <GitBranch size={11} aria-hidden="true" />
              {scan.ref}
            </span>
          )}
          {scan.commitSha && <span className="font-mono">{shortSha(scan.commitSha)}</span>}
        </p>
      </div>
    </div>
  );
}

export function ScanRiskCell({ scan }: { scan: ScanView }) {
  if (!isTerminal(scan.status)) return <span className="text-xs text-slate-500 dark:text-slate-400">{scan.progress}%</span>;
  if (!scan.summary) return <span className="text-xs text-slate-400">—</span>;
  return <RiskBadge level={scan.summary.risk.level} score={scan.summary.risk.score} />;
}

/** Generic scan table used by the dashboard, project history and scan lists. */
export function ScanTable({
  scans,
  showProject,
  caption,
  selectable,
  selected,
  onToggle,
}: {
  scans: ScanView[];
  showProject?: boolean;
  caption: string;
  selectable?: boolean;
  selected?: string[];
  onToggle?: (id: string) => void;
}) {
  return (
    <Table caption={caption}>
      <thead>
        <tr>
          {selectable && <Th><span className="sr-only">Select for comparison</span></Th>}
          <Th>Source</Th>
          <Th>Status</Th>
          <Th>Risk</Th>
          <Th>Findings</Th>
          <Th align="right">Started</Th>
        </tr>
      </thead>
      <tbody className={tbodyClass}>
        {scans.map((s) => (
          <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-ink-700/40">
            {selectable && (
              <Td>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-ink-500 dark:bg-ink-900"
                  checked={selected?.includes(s.id) ?? false}
                  onChange={() => onToggle?.(s.id)}
                  disabled={!isTerminal(s.status) || (!selected?.includes(s.id) && (selected?.length ?? 0) >= 2)}
                  aria-label={`Select scan ${s.sourceLabel} from ${s.createdAt} for comparison`}
                />
              </Td>
            )}
            <Td className="max-w-xs">
              <ScanSourceCell scan={s} showProject={showProject} />
            </Td>
            <Td>
              <ScanStatusBadge status={s.status} />
            </Td>
            <Td>
              <ScanRiskCell scan={s} />
            </Td>
            <Td>{s.summary ? <SeverityCountsRow counts={s.summary.severityCounts} compact /> : <span className="text-xs text-slate-400">—</span>}</Td>
            <Td align="right" className="whitespace-nowrap text-xs">
              <time dateTime={s.createdAt} title={new Date(s.createdAt).toLocaleString()}>
                {formatRelativeTime(s.createdAt)}
              </time>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
