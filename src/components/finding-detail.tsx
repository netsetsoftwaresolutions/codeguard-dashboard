'use client';

import type { FindingStatus, FindingView } from '../contracts';
import { FINDING_STATUSES, UpdateFindingStatusSchema } from '../contracts';
import { ClassificationBadge, cx, FindingStatusBadge, findingStatusLabel, SeverityBadge } from './primitives';
import { ExternalLink, FileCode, Package, Sparkles } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { api, errorMessage } from '@/lib/api';
import { CATEGORY_LABELS, formatDateTime, humanize, osvLink, safeHref, shortSha } from '@/lib/format';
import type { FindingDetailView, FindingEvidence } from '@/lib/types';
import { validate } from '@/lib/validation';
import { Button, Checkbox, Field, FormError, Notice, Pill, Select, Textarea } from './ui';

function Section({ title, children, icon }: { title: string; children: ReactNode; icon?: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {icon}
        {title}
      </h3>
      <div className="text-sm text-slate-700 dark:text-slate-300">{children}</div>
    </section>
  );
}

export function locationLabel(f: Pick<FindingView, 'filePath' | 'startLine' | 'endLine'>): string | null {
  if (!f.filePath) return null;
  if (!f.startLine) return f.filePath;
  if (f.endLine && f.endLine !== f.startLine) return `${f.filePath}:${f.startLine}-${f.endLine}`;
  return `${f.filePath}:${f.startLine}`;
}

/** Masked evidence rendered as monospace lines; lines inside the finding's range are highlighted. */
export function EvidenceBlock({ evidence, finding }: { evidence: FindingEvidence; finding: Pick<FindingView, 'startLine' | 'endLine'> }) {
  const lines = evidence.content.replace(/\r\n/g, '\n').split('\n');
  const first = evidence.startLine ?? null;
  const hlStart = finding.startLine ?? null;
  const hlEnd = finding.endLine ?? finding.startLine ?? null;
  return (
    <div className="code-block" data-testid="evidence">
      {evidence.kind && evidence.kind !== 'snippet' && <div className="border-b border-slate-200 px-3 py-1 text-[10px] uppercase tracking-wide text-slate-500 dark:border-ink-600">{humanize(evidence.kind)}</div>}
      <pre className="py-2">
        {lines.map((line, i) => {
          const n = first !== null ? first + i : null;
          const hl = n !== null && hlStart !== null && hlEnd !== null && n >= hlStart && n <= hlEnd;
          return (
            <div key={i} className={cx('flex px-3', hl && 'bg-amber-400/15')} data-highlighted={hl || undefined}>
              {n !== null && <span className="mr-4 w-10 shrink-0 select-none text-right text-slate-400">{n}</span>}
              <code className="whitespace-pre">{line || ' '}</code>
            </div>
          );
        })}
      </pre>
    </div>
  );
}

function vulnerableRangeOf(f: FindingDetailView): string | null {
  if (typeof f.vulnerableRange === 'string' && f.vulnerableRange) return f.vulnerableRange;
  const m = f.metadata?.vulnerableRange;
  return typeof m === 'string' && m ? m : null;
}

export interface FindingDetailProps {
  finding: FindingDetailView;
  aiAvailable: boolean;
  canTriage: boolean;
  onUpdated?: (f: FindingDetailView) => void;
}

export function FindingDetail({ finding, aiAvailable, canTriage, onUpdated }: FindingDetailProps) {
  const [ai, setAi] = useState<string | null>(finding.aiExplanation);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [status, setStatus] = useState<FindingStatus>(finding.status);
  const [note, setNote] = useState('');
  const [applyToFuture, setApplyToFuture] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);

  const loc = locationLabel(finding);
  const link = safeHref(finding.sourceLink);
  const isDependency = !!finding.packageName || finding.advisoryIds.length > 0;
  const range = vulnerableRangeOf(finding);
  const evidence: FindingEvidence[] =
    finding.evidence && finding.evidence.length
      ? finding.evidence
      : finding.maskedEvidence
        ? [{ kind: 'snippet', content: finding.maskedEvidence, startLine: finding.startLine }]
        : [];
  const aiAllowed = aiAvailable && finding.category !== 'SECRET';

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <SeverityBadge severity={finding.severity} />
          <ClassificationBadge classification={finding.classification} />
          <FindingStatusBadge status={finding.status} />
          {finding.introducedInChange === true && <Pill className="bg-purple-500/10 text-purple-700 dark:text-purple-300">New in this change</Pill>}
        </div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{finding.title}</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span>{CATEGORY_LABELS[finding.category] ?? humanize(finding.category)}</span>
          <span>Confidence: {humanize(finding.confidence)}</span>
          <span>
            Rule <code className="font-mono">{finding.ruleId}</code> · {finding.engine}
          </span>
          <span>Detected {formatDateTime(finding.detectedAt)}</span>
        </div>
      </div>

      <Section title="Why this matters">
        <p className="whitespace-pre-line leading-relaxed">{finding.description}</p>
      </Section>

      {loc && (
        <Section title="Location" icon={<FileCode size={14} aria-hidden="true" />}>
          <p className="flex flex-wrap items-center gap-2">
            {link ? (
              <a href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all font-mono text-xs text-brand-600 hover:underline dark:text-brand-400">
                {loc}
                <ExternalLink size={12} aria-hidden="true" />
              </a>
            ) : (
              <code className="break-all font-mono text-xs">{loc}</code>
            )}
            {finding.branch && <Pill>{finding.branch}</Pill>}
            {finding.commitSha && <Pill className="font-mono">{shortSha(finding.commitSha)}</Pill>}
          </p>
        </Section>
      )}

      {evidence.length > 0 && (
        <Section title="Evidence (masked)">
          <div className="space-y-2">
            {evidence.map((e, i) => (
              <EvidenceBlock key={i} evidence={e} finding={finding} />
            ))}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Secrets and long values are masked by the scanner; full values are never stored.</p>
        </Section>
      )}

      {isDependency && (
        <Section title="Package & advisory" icon={<Package size={14} aria-hidden="true" />}>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1.5">
            {finding.packageName && (
              <>
                <dt className="text-slate-500 dark:text-slate-400">Package</dt>
                <dd className="font-mono text-xs">
                  {finding.packageName}
                  {finding.packageEcosystem && <span className="ml-2 text-slate-500">({finding.packageEcosystem})</span>}
                </dd>
              </>
            )}
            <dt className="text-slate-500 dark:text-slate-400">Installed version</dt>
            <dd className="font-mono text-xs">{finding.packageVersion ?? 'Unknown'}</dd>
            {range && (
              <>
                <dt className="text-slate-500 dark:text-slate-400">Vulnerable range</dt>
                <dd className="font-mono text-xs">{range}</dd>
              </>
            )}
            <dt className="text-slate-500 dark:text-slate-400">Fixed versions</dt>
            <dd data-testid="fixed-versions">
              {finding.fixedVersions.length ? (
                <span className="flex flex-wrap gap-1">
                  {finding.fixedVersions.map((v) => (
                    <Pill key={v} className="font-mono">
                      {v}
                    </Pill>
                  ))}
                </span>
              ) : (
                <span className="text-slate-500 dark:text-slate-400">No fixed version published</span>
              )}
            </dd>
            {finding.advisoryIds.length > 0 && (
              <>
                <dt className="text-slate-500 dark:text-slate-400">Advisories</dt>
                <dd className="flex flex-wrap gap-2">
                  {finding.advisoryIds.map((id) => (
                    <a key={id} href={osvLink(id)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-brand-600 hover:underline dark:text-brand-400">
                      {id}
                      <ExternalLink size={11} aria-hidden="true" />
                    </a>
                  ))}
                </dd>
              </>
            )}
          </dl>
        </Section>
      )}

      <Section title="How to fix">
        <p className="whitespace-pre-line leading-relaxed">{finding.recommendation}</p>
      </Section>

      {finding.falsePositiveGuidance && (
        <Section title="Could this be a false positive?">
          <p className="whitespace-pre-line leading-relaxed">{finding.falsePositiveGuidance}</p>
        </Section>
      )}

      {finding.references.length > 0 && (
        <Section title="References">
          <ul className="space-y-1">
            {finding.references.map((r) => {
              const href = safeHref(r);
              return (
                <li key={r} className="break-all text-xs">
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:underline dark:text-brand-400">
                      {r}
                    </a>
                  ) : (
                    r
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {(ai || aiAllowed) && (
        <Section title="AI explanation — verify before acting" icon={<Sparkles size={14} aria-hidden="true" />}>
          {ai ? (
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-3">
              <p className="whitespace-pre-line leading-relaxed">{ai}</p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Generated by an AI model from masked evidence. It may be wrong; confirm against the code.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Sends the masked snippet and finding metadata to the AI provider configured on this server. Not available for secret findings.
              </p>
              <Button
                variant="outline"
                size="sm"
                loading={aiBusy}
                icon={<Sparkles size={14} aria-hidden="true" />}
                onClick={async () => {
                  setAiBusy(true);
                  setAiError(null);
                  try {
                    const r = await api.findings.explain(finding.id);
                    setAi(r.aiExplanation);
                    onUpdated?.({ ...finding, aiExplanation: r.aiExplanation });
                  } catch (e) {
                    setAiError(errorMessage(e));
                  } finally {
                    setAiBusy(false);
                  }
                }}
              >
                Generate AI explanation
              </Button>
              {aiError && <p className="text-xs text-red-600 dark:text-red-400">{aiError}</p>}
            </div>
          )}
        </Section>
      )}

      <Section title="Triage">
        {canTriage ? (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const v = validate(UpdateFindingStatusSchema, { status, note: note.trim() || undefined, applyToFuture });
              if (!v.ok) {
                setSaveError(new Error(Object.values(v.errors)[0]));
                return;
              }
              setSaving(true);
              setSaveError(null);
              setSaved(false);
              try {
                const updated = await api.findings.updateStatus(finding.id, v.data);
                setSaved(true);
                setNote('');
                onUpdated?.({ ...finding, ...updated, evidence: finding.evidence });
              } catch (err) {
                setSaveError(err);
              } finally {
                setSaving(false);
              }
            }}
          >
            <Field htmlFor={`status-${finding.id}`} label="Status">
              <Select id={`status-${finding.id}`} value={status} onChange={(e) => setStatus(e.target.value as FindingStatus)}>
                {FINDING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {findingStatusLabel(s)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field htmlFor={`note-${finding.id}`} label="Note" hint="Recorded in the audit log.">
              <Textarea id={`note-${finding.id}`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} rows={3} />
            </Field>
            <Checkbox
              checked={applyToFuture}
              onChange={setApplyToFuture}
              label="Apply to future scans"
              description="Stores a project suppression for this finding's fingerprint so it keeps this status in later scans."
            />
            <FormError error={saveError} />
            {saved && <Notice tone="success">Status updated.</Notice>}
            <Button type="submit" loading={saving} disabled={status === finding.status && !note.trim() && !applyToFuture}>
              Save status
            </Button>
          </form>
        ) : (
          <p className="text-xs text-slate-500 dark:text-slate-400">Your role can view findings but not change their status.</p>
        )}
      </Section>
    </div>
  );
}
