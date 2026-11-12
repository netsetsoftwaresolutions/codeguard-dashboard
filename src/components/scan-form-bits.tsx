'use client';

import type { ParsedSource, ScanCreatedResponse, SourceInspection } from '../contracts';
import { formatRelativeTime, ScanStatusBadge } from './primitives';
import { CircleCheck, CircleX, Lock, Unlock } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import { api } from '@/lib/api';
import { PROVIDER_LABELS, humanize } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import { useAuth } from './auth';
import { useMeta } from './meta';
import { Checkbox, Field, Input, Notice, Pill, Select } from './ui';

export interface TargetValue {
  mode: 'existing' | 'new';
  projectId: string;
  projectName: string;
}

export function toTarget(v: TargetValue, organizationId: string): { projectId?: string; organizationId?: string; projectName?: string } {
  if (v.mode === 'existing' && v.projectId) return { projectId: v.projectId };
  const name = v.projectName.trim();
  return name ? { organizationId, projectName: name } : { organizationId };
}

export function scanDestination(res: ScanCreatedResponse): string {
  if (res.scanGroupId && res.scans.length > 1) return `/scans/groups/${res.scanGroupId}`;
  if (res.scans[0]) return `/scans/${res.scans[0].id}`;
  return '/dashboard';
}

/** Existing project select or new project name. */
export function ProjectTargetPicker({ value, onChange, suggestedName }: { value: TargetValue; onChange: (v: TargetValue) => void; suggestedName?: string }) {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id ?? null;
  const { data: projects, loading } = useApi(orgId ? `projects:${orgId}` : null, () => api.projects.list(orgId as string));
  const id = useId();
  useEffect(() => {
    if (value.mode === 'existing' && !value.projectId && projects?.length) onChange({ ...value, projectId: projects[0].id });
  }, [projects, value, onChange]);
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">Project</legend>
      <div role="radiogroup" aria-label="Project" className="flex rounded-lg bg-slate-100 p-0.5 dark:bg-ink-900">
        <label className="relative flex-1">
          <input type="radio" name={`${id}-mode`} checked={value.mode === 'new'} onChange={() => onChange({ ...value, mode: 'new' })} className="peer sr-only" />
          <span className="block cursor-pointer rounded-md px-3 py-1.5 text-center text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 peer-checked:bg-white peer-checked:text-slate-900 peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-200 dark:peer-checked:bg-ink-600 dark:peer-checked:text-white">New project</span>
        </label>
        <label className="relative flex-1">
          <input type="radio" name={`${id}-mode`} checked={value.mode === 'existing'}
            disabled={!loading && !projects?.length} onChange={() => onChange({ ...value, mode: 'existing' })} className="peer sr-only" />
          <span className="block cursor-pointer rounded-md px-3 py-1.5 text-center text-sm font-medium text-slate-500 transition-colors hover:text-slate-800 peer-checked:bg-white peer-checked:text-slate-900 peer-checked:shadow-sm peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500 peer-disabled:cursor-not-allowed peer-disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-200 dark:peer-checked:bg-ink-600 dark:peer-checked:text-white">Existing project</span>
        </label>
      </div>
      {value.mode === 'existing' ? (
        <Field htmlFor={`${id}-project`} label="Select project">
          <Select id={`${id}-project`} value={value.projectId} onChange={(e) => onChange({ ...value, projectId: e.target.value })} disabled={loading}>
            {loading && <option value="">Loading…</option>}
            {(projects ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : (
        <Field htmlFor={`${id}-name`} label="New project name" hint="Leave empty to name it after the source. An existing project with the same name is reused.">
          <Input id={`${id}-name`} value={value.projectName} placeholder={suggestedName} onChange={(e) => onChange({ ...value, projectName: e.target.value })} maxLength={120} />
        </Field>
      )}
    </fieldset>
  );
}

export function AiOptIn({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  const { meta } = useMeta();
  if (!meta?.features.ai) {
    return <p className="text-xs text-slate-500 dark:text-slate-400">AI explanations are not configured on this server.</p>;
  }
  return (
    <Checkbox
      checked={checked}
      onChange={onChange}
      label="Enable AI explanations (opt-in)"
      description="Masked snippets of non-secret findings are sent to this server's configured AI provider. Secrets are never sent. AI output must be verified."
    />
  );
}

export function ParsedPreview({ parsed }: { parsed: ParsedSource }) {
  const rows: [string, string | number | undefined][] = [
    ['Provider', PROVIDER_LABELS[parsed.provider]],
    ['Kind', humanize(parsed.kind)],
    ['Repository', parsed.projectPath ?? (parsed.owner && parsed.repo ? `${parsed.owner}/${parsed.repo}` : undefined)],
    ['Ref', parsed.ref ? `${parsed.ref}${parsed.refAmbiguous ? ' (ambiguous)' : ''}` : undefined],
    ['Path', parsed.filePath],
    ['Pull request', parsed.pullNumber],
    ['Commit', parsed.commitSha],
  ];
  return (
    <div className={`rounded-lg border p-3 text-sm ${parsed.supported ? 'border-slate-200 dark:border-ink-600' : 'border-amber-500/40 bg-amber-500/5'}`} aria-live="polite">
      <p className="flex items-center gap-2 font-medium">
        {parsed.supported ? <CircleCheck size={16} className="text-green-600" aria-hidden="true" /> : <CircleX size={16} className="text-amber-600" aria-hidden="true" />}
        {parsed.supported ? parsed.label : 'Not a supported source URL'}
      </p>
      <dl className="mt-2 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-xs">
        {rows
          .filter(([, v]) => v !== undefined && v !== '')
          .map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-slate-500 dark:text-slate-400">{k}</dt>
              <dd className="break-all font-mono">{String(v)}</dd>
            </div>
          ))}
      </dl>
      {parsed.notes.length > 0 && (
        <ul className="mt-2 list-disc space-y-0.5 pl-4 text-xs text-slate-600 dark:text-slate-300">
          {parsed.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function InspectionResult({ inspection }: { inspection: SourceInspection }) {
  const caps = Object.entries(inspection.capabilities) as [keyof SourceInspection['capabilities'], boolean][];
  const capLabels: Record<string, string> = {
    scanFile: 'File',
    scanBranch: 'Branch',
    scanRepository: 'Repository',
    scanAllBranches: 'All branches',
    scanPullRequest: 'Pull request',
    scanFolder: 'Folder',
  };
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 p-3 text-sm dark:border-ink-600" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        {inspection.accessible ? (
          <Pill className="bg-green-500/10 text-green-700 dark:text-green-300">Accessible</Pill>
        ) : (
          <Pill className="bg-red-500/10 text-red-700 dark:text-red-300">Not accessible</Pill>
        )}
        <Pill>
          {inspection.visibility === 'private' ? <Lock size={12} aria-hidden="true" /> : <Unlock size={12} aria-hidden="true" />}
          {humanize(inspection.visibility)}
        </Pill>
        {inspection.defaultBranch && <Pill>default: {inspection.defaultBranch}</Pill>}
        {inspection.branches && <Pill>{inspection.branches.length} branches</Pill>}
      </div>
      <div className="flex flex-wrap gap-1.5 text-xs">
        <span className="text-slate-500 dark:text-slate-400">Possible scans:</span>
        {caps.map(([k, v]) => (
          <span key={k} className={v ? 'text-green-700 dark:text-green-300' : 'text-slate-400 line-through'}>
            {capLabels[k] ?? k}
          </span>
        ))}
      </div>
      {inspection.messages.length > 0 && (
        <Notice tone="neutral">
          <ul className="list-disc space-y-0.5 pl-4">
            {inspection.messages.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </Notice>
      )}
      {inspection.previousScans.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Previous scans of this source</p>
          <ul className="mt-1 space-y-1">
            {inspection.previousScans.slice(0, 5).map((s) => (
              <li key={s.id} className="flex items-center gap-2 text-xs">
                <ScanStatusBadge status={s.status} />
                <Link href={`/scans/${s.id}`} className="text-brand-600 hover:underline dark:text-brand-400">
                  {s.ref ?? s.sourceLabel}
                </Link>
                <span className="text-slate-500">{formatRelativeTime(s.createdAt)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Reads ?projectId= to preselect an existing project. */
export function useInitialTarget(projectId: string | null): [TargetValue, (v: TargetValue) => void] {
  const [v, setV] = useState<TargetValue>({ mode: projectId ? 'existing' : 'new', projectId: projectId ?? '', projectName: '' });
  return [v, setV];
}
