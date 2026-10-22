'use client';

import type { EngineRunStatus, FindingClassification, ScanSummaryView, ScanView } from '../contracts';
import { FINDING_CLASSIFICATIONS, SCAN_STAGES, SEVERITIES } from '../contracts';
import { cx, formatBytes, ProgressBar, RiskBadge, ScanStatusBadge, SEVERITY_STYLES } from './primitives';
import { ArrowRight, Check, CircleX, GitPullRequest, LoaderCircle } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { CATEGORY_LABELS, formatDateTime, formatDuration, formatNumber, humanize, PROVIDER_LABELS, safeHref, SCAN_TYPE_LABELS, shortSha, STAGE_LABELS } from '@/lib/format';
import { BarList, ScoreGauge } from './charts';
import { isTerminal } from './scan-bits';
import { Card, CardBody, CardHeader, DescriptionList, ExternalA, Mono, Notice, Pill, Table, tbodyClass, Td, Th } from './ui';

export const RISK_DISCLAIMER = 'The risk score is additive and explainable; it is not a probability that the code is safe.';

/* ------------------------------------------------------------------ Progress */

export function StageTimeline({ scan }: { scan: Pick<ScanView, 'status' | 'stage' | 'progress' | 'errorMessage'> }) {
  const currentIdx = scan.stage ? SCAN_STAGES.indexOf(scan.stage) : -1;
  const failed = scan.status === 'FAILED' || scan.status === 'CANCELLED';
  const done = scan.status === 'COMPLETED' || scan.status === 'COMPLETED_WITH_ERRORS';
  return (
    <ol className="space-y-0" aria-label="Scan stages">
      {SCAN_STAGES.map((stage, i) => {
        const state: 'done' | 'current' | 'failed' | 'pending' =
          done || i < currentIdx ? 'done' : i === currentIdx ? (failed ? 'failed' : 'current') : 'pending';
        return (
          <li key={stage} className="relative flex gap-3 pb-4 last:pb-0" aria-current={state === 'current' ? 'step' : undefined}>
            {i < SCAN_STAGES.length - 1 && (
              <span className={cx('absolute left-[11px] top-6 h-[calc(100%-16px)] w-px', state === 'done' ? 'bg-green-500/60' : 'bg-slate-200 dark:bg-ink-600')} aria-hidden="true" />
            )}
            <span
              className={cx(
                'relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs',
                state === 'done' && 'border-green-500 bg-green-500 text-white',
                state === 'current' && 'border-brand-500 bg-brand-500/10 text-brand-600 dark:text-brand-400',
                state === 'failed' && 'border-red-500 bg-red-500 text-white',
                state === 'pending' && 'border-slate-300 bg-white text-slate-400 dark:border-ink-500 dark:bg-ink-800',
              )}
              aria-hidden="true"
            >
              {state === 'done' ? <Check size={13} /> : state === 'current' ? <LoaderCircle size={13} className="animate-spin" /> : state === 'failed' ? <CircleX size={13} /> : i + 1}
            </span>
            <div className="pt-0.5 text-sm">
              <p className={cx(state === 'pending' ? 'text-slate-400 dark:text-slate-500' : 'font-medium text-slate-800 dark:text-slate-100')}>{STAGE_LABELS[stage]}</p>
              <span className="sr-only">
                {state === 'done' ? 'completed' : state === 'current' ? 'in progress' : state === 'failed' ? 'stopped' : 'pending'}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function ScanProgressCard({ scan, actions }: { scan: ScanView; actions?: ReactNode }) {
  return (
    <Card>
      <CardHeader title="Scan in progress" description="This page updates automatically. The report appears when the scan finishes." action={actions} />
      <CardBody className="space-y-6">
        <div aria-live="polite">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <ScanStatusBadge status={scan.status} />
              {scan.stage && <span className="text-slate-600 dark:text-slate-300">{STAGE_LABELS[scan.stage]}</span>}
            </span>
            <span className="font-semibold tabular-nums">{scan.progress}%</span>
          </div>
          <ProgressBar value={scan.progress} />
        </div>
        <StageTimeline scan={scan} />
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------------ Summary */

const CLASSIFICATION_INFO: Record<FindingClassification, { label: string; help: string; cls: string }> = {
  CONFIRMED: { label: 'Confirmed', help: 'Deterministic evidence (advisory match, provider-specific secret format).', cls: 'text-red-600 dark:text-red-400' },
  SUSPICIOUS: { label: 'Suspicious', help: 'Heuristic indicators that need human review.', cls: 'text-amber-600 dark:text-amber-400' },
  FALSE_POSITIVE_CANDIDATE: { label: 'Possible false positives', help: 'Matched in tests, docs, examples or comments.', cls: 'text-slate-600 dark:text-slate-300' },
};

const RISK_STROKE: Record<string, string> = {
  CRITICAL: 'stroke-red-600',
  HIGH: 'stroke-orange-500',
  ELEVATED: 'stroke-yellow-500',
  LOW: 'stroke-blue-600',
  MINIMAL: 'stroke-green-600',
};

export function RiskPanel({ summary }: { summary: ScanSummaryView }) {
  const risk = summary.risk;
  return (
    <Card>
      <CardHeader title="Overall risk" />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <ScoreGauge score={risk.score} colorClass={RISK_STROKE[risk.level] ?? 'stroke-brand-600'} />
          <div className="space-y-2">
            <RiskBadge level={risk.level} score={risk.score} />
            <p className="max-w-xs text-xs text-slate-500 dark:text-slate-400">{RISK_DISCLAIMER}</p>
          </div>
        </div>
        {risk.components.length > 0 ? (
          <Table caption="Risk score components">
            <thead>
              <tr>
                <Th>Component</Th>
                <Th align="right">Points</Th>
              </tr>
            </thead>
            <tbody className={tbodyClass}>
              {risk.components.map((c) => (
                <tr key={c.key}>
                  <Td>
                    <p className="font-medium text-slate-800 dark:text-slate-200">{c.label}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{c.detail}</p>
                  </Td>
                  <Td align="right" className="font-semibold">
                    +{c.points}
                  </Td>
                </tr>
              ))}
              <tr>
                <Td className="font-semibold">Total (capped at 100)</Td>
                <Td align="right" className="font-semibold">
                  {risk.score}
                </Td>
              </tr>
            </tbody>
          </Table>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No component contributed points.</p>
        )}
        <p className="text-xs text-slate-400">Methodology {risk.methodologyVersion}</p>
      </CardBody>
    </Card>
  );
}

export function ScanSummarySection({ scan, summary }: { scan: ScanView; summary: ScanSummaryView | null | undefined }) {
  const repoHref = safeHref(scan.sourceUrl);
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Scan summary" />
        <CardBody>
          <DescriptionList
            items={[
              { label: 'Project', value: <Link href={`/projects/${scan.projectId}`} className="text-brand-600 hover:underline dark:text-brand-400">{scan.projectName ?? 'Project'}</Link> },
              { label: 'Source platform', value: `${PROVIDER_LABELS[scan.provider]} · ${SCAN_TYPE_LABELS[scan.type]}` },
              { label: 'Repository / source', value: repoHref ? <ExternalA href={repoHref} className="break-all">{scan.sourceUrl}</ExternalA> : scan.sourceLabel },
              {
                label: 'Branch / revision',
                value: (
                  <span className="flex flex-wrap items-center gap-2">
                    {scan.ref ?? '—'}
                    {scan.commitSha && <Mono>{shortSha(scan.commitSha, 12)}</Mono>}
                  </span>
                ),
              },
              { label: 'Scan date', value: formatDateTime(scan.createdAt) },
              { label: 'Completed', value: formatDateTime(scan.completedAt) },
              {
                label: 'Files',
                value: summary ? `${formatNumber(summary.coverage.filesScanned)} scanned · ${formatNumber(summary.coverage.filesExcluded)} excluded` : '—',
              },
              { label: 'Completion status', value: <ScanStatusBadge status={scan.status} /> },
            ]}
          />
          {scan.status === 'COMPLETED_WITH_ERRORS' && (
            <Notice tone="warning" className="mt-4" title="Completed with gaps">
              One or more engines did not complete. Findings may be incomplete — see Coverage & limitations.
            </Notice>
          )}
          {scan.status === 'FAILED' && (
            <Notice tone="danger" className="mt-4" title="Scan failed">
              {scan.errorMessage ?? 'The scan did not complete.'}
            </Notice>
          )}
          {scan.status === 'CANCELLED' && (
            <Notice tone="neutral" className="mt-4" title="Scan cancelled">
              No complete report is available for a cancelled scan.
            </Notice>
          )}
        </CardBody>
      </Card>

      {summary && (
        <div className="grid gap-6 lg:grid-cols-3">
          <RiskPanel summary={summary} />
          <Card>
            <CardHeader title="Severity distribution" description={`${formatNumber(summary.totalFindings)} findings`} />
            <CardBody>
              <BarList
                ariaLabel="Findings by severity"
                emptyLabel="No findings were reported by the engines that ran."
                items={SEVERITIES.map((s) => ({ key: s, label: SEVERITY_STYLES[s].label, value: summary.severityCounts[s] ?? 0, color: SEVERITY_STYLES[s].dot }))}
              />
              <div className="mt-6 grid grid-cols-3 gap-2 border-t border-slate-200 pt-4 dark:border-ink-600">
                {FINDING_CLASSIFICATIONS.map((c) => (
                  <div key={c} title={CLASSIFICATION_INFO[c].help}>
                    <p className={cx('text-xl font-semibold tabular-nums', CLASSIFICATION_INFO[c].cls)}>{formatNumber(summary.classificationCounts[c] ?? 0)}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{CLASSIFICATION_INFO[c].label}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Findings by category" />
            <CardBody>
              <BarList
                ariaLabel="Findings by category"
                emptyLabel="No findings in any category."
                items={Object.entries(summary.categoryCounts)
                  .filter(([, v]) => (v ?? 0) > 0)
                  .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
                  .map(([k, v]) => ({ key: k, label: CATEGORY_LABELS[k as keyof typeof CATEGORY_LABELS] ?? humanize(k), value: v ?? 0 }))}
              />
              {summary.aiUsed && <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">AI analysis was used for this scan (opt-in).</p>}
            </CardBody>
          </Card>
        </div>
      )}
      {summary && summary.totalFindings === 0 && (
        <Notice tone="neutral" title="No findings reported">
          The engines that ran did not report findings. This does not prove the absence of malicious code or vulnerabilities — review the coverage and
          limitations below.
        </Notice>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ Coverage */

const ENGINE_STATUS_CLS: Record<EngineRunStatus, string> = {
  COMPLETED: 'bg-green-500/10 text-green-700 dark:text-green-300',
  SKIPPED: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  NOT_INSTALLED: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  FAILED: 'bg-red-500/10 text-red-700 dark:text-red-300',
  TIMED_OUT: 'bg-red-500/10 text-red-700 dark:text-red-300',
};

/** Derives the "areas not scanned" list from coverage data (never invents anything). */
export function areasNotScanned(summary: ScanSummaryView): string[] {
  const c = summary.coverage;
  const out: string[] = [];
  for (const [reason, n] of Object.entries(c.excludedByReason ?? {})) {
    if (n > 0) out.push(`${formatNumber(n)} file${n === 1 ? '' : 's'} excluded: ${humanize(reason)}`);
  }
  for (const e of c.engines ?? []) {
    if (e.status !== 'COMPLETED') out.push(`Engine ${e.engine} ${humanize(e.status).toLowerCase()}${e.message ? ` — ${e.message}` : ''}`);
  }
  if (c.truncated) out.push('The file inventory was truncated; remaining files were not scanned.');
  return out;
}

export function CoverageSection({ summary }: { summary: ScanSummaryView }) {
  const c = summary.coverage;
  const notScanned = areasNotScanned(summary);
  return (
    <Card>
      <CardHeader title="Coverage & limitations" description="What was and was not examined. Completeness is reported separately from risk." />
      <CardBody className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['Files discovered', formatNumber(c.filesDiscovered)],
            ['Files scanned', formatNumber(c.filesScanned)],
            ['Files excluded', formatNumber(c.filesExcluded)],
            ['Bytes scanned', formatBytes(c.bytesScanned)],
          ].map(([k, v]) => (
            <div key={k}>
              <p className="text-xs text-slate-500 dark:text-slate-400">{k}</p>
              <p className="text-lg font-semibold tabular-nums">{v}</p>
            </div>
          ))}
        </div>
        {c.truncated && <Notice tone="warning">The inventory was truncated at the server limit; not every file was scanned.</Notice>}

        <div>
          <h3 className="mb-2 text-sm font-semibold">Engines</h3>
          <div className="rounded-lg border border-slate-200 dark:border-ink-600">
            <Table caption="Scan engines">
              <thead>
                <tr>
                  <Th>Engine</Th>
                  <Th>Status</Th>
                  <Th>Version</Th>
                  <Th align="right">Duration</Th>
                  <Th align="right">Findings</Th>
                  <Th>Message</Th>
                </tr>
              </thead>
              <tbody className={tbodyClass}>
                {c.engines.map((e) => (
                  <tr key={e.engine}>
                    <Td className="font-mono text-xs">{e.engine}</Td>
                    <Td>
                      <Pill className={ENGINE_STATUS_CLS[e.status]}>{e.status}</Pill>
                    </Td>
                    <Td className="font-mono text-xs">{e.version ?? '—'}</Td>
                    <Td align="right">{formatDuration(e.durationMs)}</Td>
                    <Td align="right">{formatNumber(e.findingCount)}</Td>
                    <Td className="max-w-xs text-xs">{e.message ?? '—'}</Td>
                  </tr>
                ))}
                {c.engines.length === 0 && (
                  <tr>
                    <Td colSpan={6} className="text-center text-slate-500">
                      No engine runs were recorded.
                    </Td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Excluded files by reason</h3>
            {Object.keys(c.excludedByReason ?? {}).length ? (
              <ul className="space-y-1 text-sm">
                {Object.entries(c.excludedByReason).map(([r, n]) => (
                  <li key={r} className="flex justify-between gap-3">
                    <span>{humanize(r)}</span>
                    <span className="tabular-nums">{formatNumber(n)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No files were excluded.</p>
            )}
            {c.excludedSamples.length > 0 && (
              <details className="mt-3 text-xs">
                <summary className="cursor-pointer text-slate-500">Examples ({c.excludedSamples.length})</summary>
                <ul className="mt-2 space-y-0.5 font-mono">
                  {c.excludedSamples.slice(0, 50).map((s) => (
                    <li key={s.path} className="break-all">
                      {s.path} <span className="text-slate-400">— {humanize(s.reason)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
          <div className="space-y-3 text-sm">
            <h3 className="text-sm font-semibold">Detected</h3>
            <p>
              <span className="text-slate-500 dark:text-slate-400">Languages: </span>
              {Object.keys(c.languages ?? {}).length
                ? Object.entries(c.languages)
                    .sort((a, b) => b[1] - a[1])
                    .map(([l, n]) => `${l} (${n})`)
                    .join(', ')
                : 'none detected'}
            </p>
            <p>
              <span className="text-slate-500 dark:text-slate-400">Ecosystems: </span>
              {c.ecosystems.length ? c.ecosystems.join(', ') : 'none detected'}
            </p>
            <p className="break-all">
              <span className="text-slate-500 dark:text-slate-400">Manifests: </span>
              {c.manifests.length ? c.manifests.join(', ') : 'none'}
            </p>
            <p className="break-all">
              <span className="text-slate-500 dark:text-slate-400">Lockfiles: </span>
              {c.lockfiles.length ? c.lockfiles.join(', ') : 'none'}
            </p>
            {c.manifests.length > 0 && c.lockfiles.length === 0 && (
              <Notice tone="warning">No lockfile was found, so dependency versions may be ranges and vulnerability matching is less precise.</Notice>
            )}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Limitations</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300" data-testid="limitations">
            {c.limitations.map((l) => (
              <li key={l}>{l}</li>
            ))}
            <li>Static analysis cannot observe runtime behaviour, code downloaded at run time, or threats with no known pattern or advisory.</li>
          </ul>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold">Areas not scanned</h3>
          {notScanned.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300" data-testid="areas-not-scanned">
              {notScanned.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">All discovered files were processed and every engine completed.</p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------------ Pull request */

export function PullRequestHeader({ scan, newCount, totalCount }: { scan: ScanView; newCount: number | null; totalCount: number | null }) {
  const link = safeHref(scan.sourceUrl);
  return (
    <Card>
      <CardHeader title="Pull request analysis" icon={<GitPullRequest size={16} aria-hidden="true" />} action={link ? <ExternalA href={link}>Open on provider</ExternalA> : undefined} />
      <CardBody className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="flex items-center gap-2">
            <span className="text-xs text-slate-500">base</span>
            <Pill>{scan.baseRef ?? 'target'}</Pill>
            {scan.baseCommitSha && <Mono>{shortSha(scan.baseCommitSha)}</Mono>}
          </span>
          <ArrowRight size={16} className="text-slate-400" aria-label="compared with" />
          <span className="flex items-center gap-2">
            <span className="text-xs text-slate-500">head</span>
            <Pill>{scan.ref ?? 'head'}</Pill>
            {scan.commitSha && <Mono>{shortSha(scan.commitSha)}</Mono>}
          </span>
        </div>
        {isTerminal(scan.status) && newCount !== null && (
          <>
            <p className={cx('text-base font-semibold', newCount > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-slate-800 dark:text-slate-100')} data-testid="pr-verdict">
              This change introduces {formatNumber(newCount)} new finding{newCount === 1 ? '' : 's'} relative to the target.
            </p>
            {totalCount !== null && (
              <div className="flex flex-wrap gap-6 text-sm">
                <div>
                  <p className="text-xl font-semibold tabular-nums">{formatNumber(newCount)}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Introduced by this change</p>
                </div>
                <div>
                  <p className="text-xl font-semibold tabular-nums">{formatNumber(Math.max(0, totalCount - newCount))}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Pre-existing in the target</p>
                </div>
              </div>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">Use “Only new in this change” in the findings filter; each location links to the diff on the provider when available.</p>
          </>
        )}
      </CardBody>
    </Card>
  );
}
