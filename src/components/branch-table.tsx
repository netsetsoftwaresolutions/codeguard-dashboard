'use client';

import type { BranchSummaryView } from '../contracts';
import { cx, RiskBadge, ScanStatusBadge } from './primitives';
import Link from 'next/link';
import { formatNumber, formatRelativeTimeSafe, shortSha } from '@/lib/format';
import { Pill, Table, tbodyClass, Td, Th } from './ui';

function Num({ n, cls }: { n: number; cls?: string }) {
  return <span className={cx('tabular-nums', n > 0 ? cls : 'text-slate-400')}>{formatNumber(n)}</span>;
}

/** Branch-wise summary used by the project Branches tab and the scan group comparison page. */
export function BranchTable({
  branches,
  defaultBranch,
  differs,
}: {
  branches: BranchSummaryView[];
  defaultBranch?: string | null;
  /** Branch names whose findings differ from the default branch (highlighted). */
  differs?: Set<string>;
}) {
  return (
    <Table caption="Branch-wise scan summary">
      <thead>
        <tr>
          <Th>Branch</Th>
          <Th>Status</Th>
          <Th align="right">Files</Th>
          <Th align="right">Critical</Th>
          <Th align="right">High</Th>
          <Th align="right">Medium</Th>
          <Th align="right">Low</Th>
          <Th align="right">Suspicious</Th>
          <Th align="right">Vuln. deps</Th>
          <Th align="right">Malware ind.</Th>
          <Th>Risk</Th>
        </tr>
      </thead>
      <tbody className={tbodyClass}>
        {branches.map((b) => {
          const isDefault = defaultBranch === b.branch;
          const diff = differs?.has(b.branch);
          return (
            <tr key={`${b.branch}:${b.scanId}`} className={cx(diff && 'bg-amber-500/5')}>
              <Td className="whitespace-nowrap">
                <Link href={`/scans/${b.scanId}`} className="font-medium text-slate-900 hover:underline dark:text-white">
                  {b.branch}
                </Link>
                <div className="mt-0.5 flex flex-wrap items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                  {b.commitSha && <span className="font-mono">{shortSha(b.commitSha)}</span>}
                  {b.completedAt && <span>· {formatRelativeTimeSafe(b.completedAt)}</span>}
                  {isDefault && <Pill>default</Pill>}
                  {diff && <Pill className="bg-amber-500/15 text-amber-800 dark:text-amber-300">differs from default</Pill>}
                </div>
              </Td>
              <Td>
                <ScanStatusBadge status={b.status} />
              </Td>
              <Td align="right">{formatNumber(b.filesScanned)}</Td>
              <Td align="right">
                <Num n={b.severityCounts.CRITICAL ?? 0} cls="font-semibold text-red-600 dark:text-red-400" />
              </Td>
              <Td align="right">
                <Num n={b.severityCounts.HIGH ?? 0} cls="font-semibold text-orange-600 dark:text-orange-400" />
              </Td>
              <Td align="right">
                <Num n={b.severityCounts.MEDIUM ?? 0} cls="text-yellow-700 dark:text-yellow-300" />
              </Td>
              <Td align="right">
                <Num n={b.severityCounts.LOW ?? 0} cls="text-blue-700 dark:text-blue-300" />
              </Td>
              <Td align="right">
                <Num n={b.suspiciousCount} />
              </Td>
              <Td align="right">
                <Num n={b.vulnerableDependencies} />
              </Td>
              <Td align="right">
                <Num n={b.malwareIndicators} cls="font-semibold text-red-600 dark:text-red-400" />
              </Td>
              <Td>
                <RiskBadge level={b.riskLevel} score={b.riskScore} />
              </Td>
            </tr>
          );
        })}
      </tbody>
    </Table>
  );
}

/** Signature of a branch's results used to detect differences from the default branch. */
export function branchSignature(b: BranchSummaryView): string {
  const s = b.severityCounts;
  return [s.CRITICAL, s.HIGH, s.MEDIUM, s.LOW, s.INFO, b.suspiciousCount, b.vulnerableDependencies, b.malwareIndicators].map((n) => n ?? 0).join('|');
}

export function branchesDifferingFrom(branches: BranchSummaryView[], defaultBranch: string | null | undefined): Set<string> {
  const base = branches.find((b) => b.branch === defaultBranch);
  if (!base) return new Set();
  const sig = branchSignature(base);
  return new Set(branches.filter((b) => b.branch !== base.branch && branchSignature(b) !== sig).map((b) => b.branch));
}
