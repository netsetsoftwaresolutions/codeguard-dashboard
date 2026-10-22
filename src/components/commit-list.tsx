'use client';

import type { CommitView } from '../contracts';
import { EmptyState, SeverityBadge } from './primitives';
import { ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime, safeHref, shortSha } from '@/lib/format';
import { Notice, Pill } from './ui';

const SIGNAL_LABELS: Record<keyof CommitView['signals'], string> = {
  dependencyChanges: 'Dependency changes',
  scriptChanges: 'Install-script changes',
  newUrls: 'New URLs',
  executables: 'Executables',
  configChanges: 'Config changes',
};

export const AUTHORSHIP_DISCLAIMER = 'Commit authorship is metadata, not evidence of malicious intent.';

export function CommitList({ commits, scanId }: { commits: CommitView[]; scanId: string }) {
  return (
    <div className="space-y-4">
      <Notice tone="info">{AUTHORSHIP_DISCLAIMER} Author names and dates come from Git and can be set arbitrarily by whoever made the commit.</Notice>
      {commits.length === 0 ? (
        <EmptyState title="No commits analysed" description="This scan did not include commit-history analysis, or no commits were in range." />
      ) : (
        <ol className="space-y-3">
          {commits.map((c) => {
            const href = safeHref(c.link);
            const signals = (Object.keys(SIGNAL_LABELS) as (keyof CommitView['signals'])[]).filter((k) => (c.signals[k]?.length ?? 0) > 0);
            return (
              <li key={c.sha} className="rounded-xl border border-slate-200 bg-white p-4 dark:border-ink-600 dark:bg-ink-800">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-sm">
                      {href ? (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-brand-600 hover:underline dark:text-brand-400">
                          {shortSha(c.sha, 10)}
                          <ExternalLink size={12} aria-hidden="true" />
                        </a>
                      ) : (
                        <code className="font-mono">{shortSha(c.sha, 10)}</code>
                      )}
                      <span className="font-medium text-slate-900 dark:text-white">{(c.message ?? '').split('\n')[0] || '(no message)'}</span>
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {c.authorName ?? 'Unknown author'} · {formatDateTime(c.committedAt)} · {c.filesChanged} file{c.filesChanged === 1 ? '' : 's'} changed
                    </p>
                  </div>
                  <Pill className={c.findingCount ? 'bg-orange-500/10 text-orange-700 dark:text-orange-300' : ''}>
                    {c.findingCount} finding{c.findingCount === 1 ? '' : 's'}
                  </Pill>
                </div>
                {signals.length > 0 && (
                  <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    {signals.map((k) => (
                      <div key={k}>
                        <dt className="font-medium text-slate-600 dark:text-slate-300">{SIGNAL_LABELS[k]}</dt>
                        <dd className="mt-0.5 space-y-0.5 break-all font-mono text-slate-500 dark:text-slate-400">
                          {(c.signals[k] ?? []).slice(0, 10).map((v) => (
                            <div key={v}>{v}</div>
                          ))}
                          {(c.signals[k]?.length ?? 0) > 10 && <div>…+{(c.signals[k]?.length ?? 0) - 10} more</div>}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}
                {c.findings.length > 0 && (
                  <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3 dark:border-ink-700">
                    {c.findings.map((f) => (
                      <li key={f.id} className="flex flex-wrap items-center gap-2 text-xs">
                        <SeverityBadge severity={f.severity} />
                        <Link href={`/scans/${scanId}?finding=${f.id}`} className="text-slate-800 hover:underline dark:text-slate-200">
                          {f.title}
                        </Link>
                        {f.filePath && (
                          <code className="font-mono text-slate-500">
                            {f.filePath}
                            {f.startLine ? `:${f.startLine}` : ''}
                          </code>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
