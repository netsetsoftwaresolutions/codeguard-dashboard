'use client';

import type { SourceInspection } from '../../../../../contracts';
import { parseSourceUrl, PullRequestScanSchema, RepositoryScanSchema } from '../../../../../contracts';
import { GitPullRequest, RefreshCw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth';
import { AiOptIn, InspectionResult, ParsedPreview, ProjectTargetPicker, scanDestination, toTarget, useInitialTarget } from '@/components/scan-form-bits';
import { Button, Card, CardBody, Checkbox, Field, FormError, Input, Notice, Select } from '@/components/ui';
import { api } from '@/lib/api';
import { validate } from '@/lib/validation';

type BranchMode = 'current' | 'specific' | 'all';
const REPO_PROVIDERS = ['GITHUB', 'GITLAB', 'BITBUCKET'];

function RepositoryForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { currentOrg } = useAuth();
  const [url, setUrl] = useState(params.get('url') ?? '');
  const [target, setTarget] = useInitialTarget(params.get('projectId'));
  const [inspection, setInspection] = useState<SourceInspection | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [inspectError, setInspectError] = useState<unknown>(null);
  const [inspectNonce, setInspectNonce] = useState(0);
  const [branchMode, setBranchMode] = useState<BranchMode>('current');
  const [ref, setRef] = useState('');
  const [branches, setBranches] = useState<string[]>([]);
  const [branchFilter, setBranchFilter] = useState('');
  const [path, setPath] = useState('');
  const [includeHistory, setIncludeHistory] = useState(false);
  const [historyDepth, setHistoryDepth] = useState('50');
  const [enableAi, setEnableAi] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const trimmed = url.trim();
  const parsed = useMemo(() => {
    if (!trimmed) return null;
    try {
      return parseSourceUrl(trimmed);
    } catch {
      return null;
    }
  }, [trimmed]);
  const isRepoProvider = !!parsed?.supported && REPO_PROVIDERS.includes(parsed.provider);
  const isPr = !!parsed && (parsed.kind === 'PULL_REQUEST' || parsed.kind === 'MERGE_REQUEST');

  // Prefill ref / path from the URL.
  useEffect(() => {
    if (parsed?.ref) setRef(parsed.ref);
    if (parsed?.filePath) setPath(parsed.filePath);
  }, [parsed?.ref, parsed?.filePath]);

  // Inspect automatically (debounced) to load the branch list.
  useEffect(() => {
    if (!isRepoProvider || !currentOrg) return;
    let active = true;
    const t = window.setTimeout(async () => {
      setInspecting(true);
      setInspectError(null);
      try {
        const r = await api.sources.inspect(trimmed, currentOrg.id);
        if (!active) return;
        setInspection(r);
        if (!parsed?.ref && r.defaultBranch) setRef(r.defaultBranch);
      } catch (e) {
        if (active) setInspectError(e);
      } finally {
        if (active) setInspecting(false);
      }
    }, 700);
    return () => {
      active = false;
      window.clearTimeout(t);
    };
  }, [trimmed, isRepoProvider, currentOrg?.id, inspectNonce]);

  const branchList = inspection?.branches ?? [];
  const visibleBranches = branchList.filter((b) => b.toLowerCase().includes(branchFilter.toLowerCase()));

  const submit = async () => {
    if (!currentOrg || !parsed) return;
    const depth = Number(historyDepth);
    const options = { enableAi, includeHistory: isPr ? false : includeHistory, historyDepth: Number.isFinite(depth) ? depth : 50, excludePaths: [] as string[] };
    const tgt = toTarget(target, currentOrg.id);
    setError(null);
    if (isPr) {
      const v = validate(PullRequestScanSchema, { target: tgt, url: trimmed, options });
      if (!v.ok) return setError(new Error(Object.entries(v.errors).map(([k, m]) => `${k}: ${m}`).join('; ')));
      setBusy(true);
      try {
        router.push(scanDestination(await api.scans.pullRequest(v.data)));
      } catch (e) {
        setError(e);
        setBusy(false);
      }
      return;
    }
    const body: Record<string, unknown> = { target: tgt, url: trimmed, options };
    if (branchMode === 'current' && ref.trim()) body.ref = ref.trim();
    if (branchMode === 'specific') {
      if (!branches.length) return setError(new Error('Select at least one branch.'));
      body.branches = branches;
    }
    if (branchMode === 'all') body.branches = 'ALL';
    if (path.trim()) body.path = path.trim();
    const v = validate(RepositoryScanSchema, body);
    if (!v.ok) return setError(new Error(Object.entries(v.errors).map(([k, m]) => `${k}: ${m}`).join('; ')));
    setBusy(true);
    try {
      router.push(scanDestination(await api.scans.repository(v.data)));
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardBody className="space-y-5">
          <Field htmlFor="repo-url" label="Repository or pull request URL" hint="GitHub, GitLab or Bitbucket. Paste a pull/merge request URL to analyse only what the change introduces.">
            <Input
              id="repo-url"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://github.com/owner/repo or …/pull/123"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setInspection(null);
                setBranches([]);
              }}
              maxLength={2048}
            />
          </Field>
          {parsed && <ParsedPreview parsed={parsed} />}
          {parsed?.supported && !isRepoProvider && (
            <Notice tone="info">This is not a GitHub, GitLab or Bitbucket URL. Use “Scan URL” for other sources.</Notice>
          )}
          {inspecting && <p className="text-xs text-slate-500" role="status">Inspecting repository…</p>}
          <FormError error={inspectError} />
          {inspection && <InspectionResult inspection={inspection} />}

          {isRepoProvider && isPr && (
            <Notice tone="info" title="Pull request analysis" icon={<GitPullRequest size={16} />}>
              The head revision is scanned and compared with the target branch. The report highlights findings introduced by this change.
            </Notice>
          )}

          {isRepoProvider && !isPr && (
            <>
              <fieldset className="space-y-3">
                <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">Branches</legend>
                <div className="flex flex-wrap gap-4 text-sm">
                  {(
                    [
                      ['current', 'Single ref'],
                      ['specific', 'Specific branches'],
                      ['all', 'All branches'],
                    ] as [BranchMode, string][]
                  ).map(([k, label]) => (
                    <label key={k} className="inline-flex items-center gap-2">
                      <input
                        type="radio"
                        name="branch-mode"
                        checked={branchMode === k}
                        onChange={() => setBranchMode(k)}
                        disabled={k === 'all' && inspection !== null && !inspection.capabilities.scanAllBranches}
                        className="text-brand-600 focus:ring-brand-500"
                      />
                      {label}
                    </label>
                  ))}
                </div>
                {branchMode === 'current' && (
                  <Field htmlFor="ref" label="Branch, tag or commit" hint={inspection?.defaultBranch ? `Default branch: ${inspection.defaultBranch}` : 'Defaults to the repository default branch.'}>
                    {branchList.length ? (
                      <Select id="ref" value={ref} onChange={(e) => setRef(e.target.value)}>
                        {ref && !branchList.includes(ref) && <option value={ref}>{ref}</option>}
                        {branchList.map((b) => (
                          <option key={b} value={b}>
                            {b}
                            {b === inspection?.defaultBranch ? ' (default)' : ''}
                          </option>
                        ))}
                      </Select>
                    ) : (
                      <Input id="ref" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="main" maxLength={255} />
                    )}
                  </Field>
                )}
                {branchMode === 'specific' && (
                  <div className="space-y-2">
                    {branchList.length ? (
                      <>
                        <div className="flex items-center justify-between gap-3">
                          <Input aria-label="Filter branches" placeholder="Filter branches" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="max-w-xs" />
                          <span className="text-xs text-slate-500">{branches.length} selected (max 50)</span>
                        </div>
                        <div className="max-h-60 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-3 dark:border-ink-600" role="group" aria-label="Branches to scan">
                          {visibleBranches.map((b) => (
                            <Checkbox
                              key={b}
                              checked={branches.includes(b)}
                              disabled={!branches.includes(b) && branches.length >= 50}
                              onChange={(v) => setBranches((cur) => (v ? [...cur, b] : cur.filter((x) => x !== b)))}
                              label={<span className="font-mono text-xs">{b}{b === inspection?.defaultBranch ? ' (default)' : ''}</span>}
                            />
                          ))}
                        </div>
                      </>
                    ) : (
                      <Notice tone="neutral">
                        Branch list unavailable{inspection ? ' for this repository' : ' until the repository is inspected'}.{' '}
                        {!inspecting && (
                          <button type="button" className="inline-flex items-center gap-1 underline" onClick={() => setInspectNonce((n) => n + 1)}>
                            <RefreshCw size={12} aria-hidden="true" /> Retry
                          </button>
                        )}
                      </Notice>
                    )}
                  </div>
                )}
                {branchMode === 'all' && (
                  <Notice tone="info">One scan per accessible branch, up to your plan&apos;s branches-per-scan limit. Results are grouped for branch comparison.</Notice>
                )}
              </fieldset>
              <Field htmlFor="path" label="Path (optional)" hint="Only scan this file or folder inside the repository.">
                <Input id="path" value={path} onChange={(e) => setPath(e.target.value)} placeholder="src/" maxLength={1024} className="font-mono text-xs" />
              </Field>
              <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-ink-600">
                <Checkbox
                  checked={includeHistory}
                  onChange={setIncludeHistory}
                  label="Include commit history"
                  description="Investigate recent commits for dependency, install-script, URL, executable and configuration changes."
                />
                {includeHistory && (
                  <Field htmlFor="depth" label="History depth (commits)">
                    <Input id="depth" type="number" min={1} max={500} value={historyDepth} onChange={(e) => setHistoryDepth(e.target.value)} className="max-w-[140px]" />
                  </Field>
                )}
              </div>
            </>
          )}
        </CardBody>
      </Card>
      <Card>
        <CardBody className="space-y-5">
          <ProjectTargetPicker value={target} onChange={setTarget} suggestedName={parsed?.supported ? parsed.label : undefined} />
          <AiOptIn checked={enableAi} onChange={setEnableAi} />
          <FormError error={error} />
          <Button className="w-full" onClick={submit} loading={busy} disabled={!isRepoProvider || !currentOrg}>
            {isPr ? 'Analyse pull request' : branchMode === 'current' ? 'Start scan' : 'Start branch scans'}
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}

export default function RepositoryScanPage() {
  return (
    <Suspense fallback={null}>
      <RepositoryForm />
    </Suspense>
  );
}
