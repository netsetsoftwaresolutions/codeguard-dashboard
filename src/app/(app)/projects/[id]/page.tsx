'use client';

import type { ProjectView, ScanView } from '../../../../contracts';
import { UpdateProjectSchema } from '../../../../contracts';
import { EmptyState, formatRelativeTime, RiskBadge, ScanStatusBadge, SeverityCountsRow } from '../../../../components/primitives';
import { CalendarClock, GitCompare, ScanSearch, Trash } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth';
import { BranchTable } from '@/components/branch-table';
import { FindingsList } from '@/components/findings-list';
import { useMeta } from '@/components/meta';
import { isTerminal, ProviderIcon, ScanTable } from '@/components/scan-bits';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  ConfirmDialog,
  DescriptionList,
  ErrorState,
  ExternalA,
  Field,
  FormError,
  Input,
  LinkButton,
  LoadingBlock,
  Notice,
  PageHeader,
  Pagination,
  Pill,
  Select,
  Switch,
  Table,
  Tabs,
  tbodyClass,
  Td,
  Textarea,
  Th,
} from '@/components/ui';
import { api } from '@/lib/api';
import { formatDateTime, PROVIDER_LABELS, safeHref } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import type { ScheduleView } from '@/lib/types';
import { invalidAllowlistEntries, validate } from '@/lib/validation';

const TABS = ['overview', 'history', 'branches', 'monitoring', 'settings'] as const;
type Tab = (typeof TABS)[number];

/* ------------------------------------------------------------------ Overview */

function Overview({ project }: { project: ProjectView }) {
  const latest = project.latestScan;
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Sources" description="Where this project's code comes from." />
          {project.sources && project.sources.length ? (
            <ul className="divide-y divide-slate-100 dark:divide-ink-700">
              {project.sources.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-3 px-5 py-3 text-sm">
                  <ProviderIcon provider={s.provider} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.displayName}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {PROVIDER_LABELS[s.provider]}
                      {s.url && (
                        <>
                          {' · '}
                          <ExternalA href={safeHref(s.url)}>{s.url}</ExternalA>
                        </>
                      )}
                      {s.defaultBranch && ` · default ${s.defaultBranch}`}
                    </p>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Last scanned {formatRelativeTime(s.lastScannedAt)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <CardBody>
              <p className="text-sm text-slate-500 dark:text-slate-400">No sources yet. Run a scan for this project to attach one.</p>
            </CardBody>
          )}
        </Card>
        <Card>
          <CardHeader title="Latest scan" />
          <CardBody>
            {latest ? (
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <ScanStatusBadge status={latest.status} />
                  {latest.summary && isTerminal(latest.status) && <RiskBadge level={latest.summary.risk.level} score={latest.summary.risk.score} />}
                </div>
                <p className="text-slate-600 dark:text-slate-300">{latest.sourceLabel}</p>
                {latest.summary && <SeverityCountsRow counts={latest.summary.severityCounts} />}
                <p className="text-xs text-slate-500 dark:text-slate-400">{formatDateTime(latest.createdAt)}</p>
                <LinkButton href={`/scans/${latest.id}`} variant="outline" size="sm">
                  View report
                </LinkButton>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">Not scanned yet.</p>
            )}
          </CardBody>
        </Card>
      </div>
      <Card>
        <CardHeader title="Open findings" description="From the latest completed scan of each source and ref." />
        <FindingsList sourceKey={`project:${project.id}`} fetchPage={(q) => api.projects.findings(project.id, q)} initialFilters={{ status: 'OPEN' }} />
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ History */

function History({ projectId }: { projectId: string }) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const { data, error, loading, reload } = useApi(`history:${projectId}:${page}`, () => api.projects.history(projectId, page, 20));
  const router = useRouter();

  const compare = () => {
    const scans = (data?.items ?? []).filter((s) => selected.includes(s.id));
    if (scans.length !== 2) return;
    const [a, b] = [...scans].sort((x, y) => x.createdAt.localeCompare(y.createdAt));
    router.push(`/scans/${b.id}/compare?base=${a.id}`);
  };

  return (
    <Card>
      <CardHeader
        title="Scan history"
        description="Select two completed scans to compare them."
        action={
          <Button size="sm" variant="outline" disabled={selected.length !== 2} onClick={compare} icon={<GitCompare size={14} aria-hidden="true" />}>
            Compare selected ({selected.length}/2)
          </Button>
        }
      />
      {error ? (
        <CardBody>
          <ErrorState error={error} onRetry={reload} />
        </CardBody>
      ) : loading && !data ? (
        <CardBody>
          <LoadingBlock rows={5} />
        </CardBody>
      ) : data && data.items.length ? (
        <>
          <ScanTable
            scans={data.items}
            caption="Scan history"
            selectable
            selected={selected}
            onToggle={(id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 2 ? s : [...s, id]))}
          />
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
        </>
      ) : (
        <CardBody>
          <EmptyState title="No scans yet" />
        </CardBody>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ Branches */

function Branches({ project }: { project: ProjectView }) {
  const { data, error, loading, reload } = useApi(`branches:${project.id}`, () => api.projects.branches(project.id));
  const defaultBranch = project.sources?.find((s) => s.defaultBranch)?.defaultBranch ?? null;
  return (
    <Card>
      <CardHeader title="Branches" description="Latest scan per branch or ref." />
      {error ? (
        <CardBody>
          <ErrorState error={error} onRetry={reload} />
        </CardBody>
      ) : loading && !data ? (
        <CardBody>
          <LoadingBlock rows={4} />
        </CardBody>
      ) : data && data.length ? (
        <BranchTable branches={data} defaultBranch={defaultBranch} />
      ) : (
        <CardBody>
          <EmptyState
            title="No branch scans"
            description="Scan a repository with one or more branches to populate this view."
            action={<LinkButton href={`/scans/new/repository?projectId=${project.id}`} size="sm">Scan branches</LinkButton>}
          />
        </CardBody>
      )}
    </Card>
  );
}

/* ------------------------------------------------------------------ Monitoring */

function Monitoring({ project, onProjectChange }: { project: ProjectView; onProjectChange: () => void }) {
  const { can } = useAuth();
  const { meta } = useMeta();
  const canManage = can('manageSchedules');
  const sources = project.sources ?? [];
  const { data, error, loading, reload, setData } = useApi(`schedules:${project.id}`, () => api.projects.schedules(project.id));
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? '');
  const [interval, setIntervalHours] = useState('24');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<unknown>(null);
  const [toggleError, setToggleError] = useState<unknown>(null);
  const [removing, setRemoving] = useState<ScheduleView | null>(null);
  const [removeBusy, setRemoveBusy] = useState(false);

  const sourceName = (id: string) => sources.find((s) => s.id === id)?.displayName ?? id;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Scheduled scans" icon={<CalendarClock size={16} aria-hidden="true" />} description="Re-scan a source on a fixed interval. Requires the continuous monitoring plan feature." />
        {error ? (
          <CardBody>
            <ErrorState error={error} onRetry={reload} />
          </CardBody>
        ) : loading && !data ? (
          <CardBody>
            <LoadingBlock rows={2} />
          </CardBody>
        ) : (
          <>
            {data && data.length ? (
              <Table caption="Schedules">
                <thead>
                  <tr>
                    <Th>Source</Th>
                    <Th>Interval</Th>
                    <Th>State</Th>
                    <Th>Next run</Th>
                    <Th>
                      <span className="sr-only">Actions</span>
                    </Th>
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  {data.map((s) => (
                    <tr key={s.id}>
                      <Td>{sourceName(s.projectSourceId)}</Td>
                      <Td>Every {s.intervalHours} h</Td>
                      <Td>{s.enabled ? <Pill className="bg-green-500/10 text-green-700 dark:text-green-300">Enabled</Pill> : <Pill>Paused</Pill>}</Td>
                      <Td className="text-xs">{formatDateTime(s.nextRunAt ?? null)}</Td>
                      <Td align="right">
                        {canManage && (
                          <Button size="sm" variant="ghost" onClick={() => setRemoving(s)} icon={<Trash size={14} aria-hidden="true" />}>
                            Delete
                          </Button>
                        )}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <CardBody>
                <p className="text-sm text-slate-500 dark:text-slate-400">No schedules.</p>
              </CardBody>
            )}
            {canManage && sources.length > 0 && (
              <form
                className="grid gap-3 border-t border-slate-200 p-5 dark:border-ink-600 sm:grid-cols-[1fr_180px_auto] sm:items-end"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const hours = Number(interval);
                  if (!Number.isInteger(hours) || hours < 1 || hours > 720) {
                    setFormError(new Error('Interval must be between 1 and 720 hours.'));
                    return;
                  }
                  setBusy(true);
                  setFormError(null);
                  try {
                    const created = await api.projects.createSchedule(project.id, { projectSourceId: sourceId, intervalHours: hours, enabled: true });
                    setData((prev) => [...(prev ?? []), created]);
                  } catch (err) {
                    setFormError(err);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <Field htmlFor="sched-source" label="Source">
                  <Select id="sched-source" value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                    {sources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.displayName}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field htmlFor="sched-interval" label="Interval (hours)">
                  <Input id="sched-interval" type="number" min={1} max={720} value={interval} onChange={(e) => setIntervalHours(e.target.value)} />
                </Field>
                <Button type="submit" loading={busy}>
                  Add schedule
                </Button>
                <div className="sm:col-span-3">
                  <FormError error={formError} />
                </div>
              </form>
            )}
            {sources.length === 0 && (
              <CardBody>
                <Notice tone="neutral">Run a scan first — schedules are attached to a project source.</Notice>
              </CardBody>
            )}
          </>
        )}
      </Card>

      <Card>
        <CardHeader title="Webhook monitoring" description="Scan automatically on pushes and pull requests (GitHub App webhooks)." />
        <CardBody className="space-y-4">
          {!meta?.features.githubApp && (
            <Notice tone="warning" title="GitHub App not configured on this server">
              Push and pull-request monitoring needs the GitHub App integration. Settings can be saved but no webhooks will arrive until it is configured.
            </Notice>
          )}
          {sources.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">No sources yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-ink-700">
              {sources.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-2 text-sm">
                    <ProviderIcon provider={s.provider} />
                    <span className="truncate font-medium">{s.displayName}</span>
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {(['monitorPushes', 'monitorPullRequests'] as const).map((k) => (
                      <Switch
                        key={k}
                        label={k === 'monitorPushes' ? 'Pushes' : 'Pull requests'}
                        checked={s[k]}
                        disabled={!canManage}
                        onChange={async (v) => {
                          setToggleError(null);
                          try {
                            await api.projects.updateSource(project.id, s.id, { [k]: v });
                            onProjectChange();
                          } catch (err) {
                            setToggleError(err);
                          }
                        }}
                      />
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <FormError error={toggleError} />
        </CardBody>
      </Card>

      <ConfirmDialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title="Delete schedule"
        description="Scheduled scans for this source will stop. Existing reports are kept."
        confirmLabel="Delete schedule"
        busy={removeBusy}
        onConfirm={async () => {
          if (!removing) return;
          setRemoveBusy(true);
          try {
            await api.projects.deleteSchedule(removing.id);
            setData((prev) => (prev ?? []).filter((x) => x.id !== removing.id));
            setRemoving(null);
          } catch (err) {
            setFormError(err);
            setRemoving(null);
          } finally {
            setRemoveBusy(false);
          }
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Settings */

function lines(s: string): string[] {
  return s
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
}

function SettingsTab({ project, onSaved }: { project: ProjectView; onSaved: (p: ProjectView) => void }) {
  const { can, currentOrg } = useAuth();
  const { meta } = useMeta();
  const router = useRouter();
  const canEdit = can('manageProjectSettings');
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [exclude, setExclude] = useState((project.settings.excludePaths ?? []).join('\n'));
  const [allow, setAllow] = useState((project.settings.secretAllowlist ?? []).join('\n'));
  const [enableAi, setEnableAi] = useState(!!project.settings.enableAi);
  const [enableHistory, setEnableHistory] = useState(!!project.settings.enableHistory);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [saved, setSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Project settings" description={canEdit ? undefined : 'Only organization admins can change project settings.'} />
        <CardBody>
          <form
            className="space-y-5"
            noValidate
            onSubmit={async (e) => {
              e.preventDefault();
              const allowlist = lines(allow);
              const bad = invalidAllowlistEntries(allowlist);
              if (bad.length) {
                setError(new Error(`Invalid regular expression: ${bad[0]}`));
                return;
              }
              const v = validate(UpdateProjectSchema, {
                name,
                description: description.trim(),
                settings: { excludePaths: lines(exclude), secretAllowlist: allowlist, enableAi, enableHistory },
              });
              if (!v.ok) {
                setError(new Error(Object.entries(v.errors).map(([k, m]) => `${k}: ${m}`).join('; ')));
                return;
              }
              setBusy(true);
              setError(null);
              setSaved(false);
              try {
                const p = await api.projects.update(project.id, v.data);
                onSaved(p);
                setSaved(true);
              } catch (err) {
                setError(err);
              } finally {
                setBusy(false);
              }
            }}
          >
            <fieldset disabled={!canEdit} className="space-y-5 disabled:opacity-70">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field htmlFor="p-name" label="Name">
                  <Input id="p-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
                </Field>
                <Field htmlFor="p-desc" label="Description">
                  <Input id="p-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
                </Field>
              </div>
              <Field htmlFor="p-exclude" label="Exclude paths" hint="One glob per line, e.g. vendor/**, **/*.min.js. Excluded files are listed in each report's coverage section.">
                <Textarea id="p-exclude" value={exclude} onChange={(e) => setExclude(e.target.value)} rows={4} className="font-mono text-xs" />
              </Field>
              <Field
                htmlFor="p-allow"
                label="Secret allowlist"
                hint={
                  <>
                    One entry per line. Plain entries match the masked value or rule literally. Prefix an entry with <code className="font-mono">re:</code> to use a regular
                    expression, e.g. <code className="font-mono">re:^AKIAEXAMPLE[0-9A-Z]+$</code>. Allowlisted matches are not reported as secrets.
                  </>
                }
              >
                <Textarea id="p-allow" value={allow} onChange={(e) => setAllow(e.target.value)} rows={4} className="font-mono text-xs" />
              </Field>
              <div className="space-y-3 rounded-lg border border-slate-200 p-4 dark:border-ink-600">
                <Checkbox
                  checked={enableAi}
                  onChange={setEnableAi}
                  disabled={!meta?.features.ai}
                  label="Enable AI explanations by default"
                  description={
                    meta?.features.ai
                      ? 'Disclosure: when enabled, masked snippets and metadata of non-secret findings are sent to the AI provider configured on this server. Secret findings are never sent. AI output can be wrong — verify before acting.'
                      : 'AI is not configured on this server.'
                  }
                />
                <Checkbox
                  checked={enableHistory}
                  onChange={setEnableHistory}
                  label="Analyze commit history by default"
                  description="Repository scans also inspect recent commits for dependency, install-script, URL, executable and configuration changes."
                />
              </div>
            </fieldset>
            <FormError error={error} />
            {saved && <Notice tone="success">Settings saved. They apply to the next scan.</Notice>}
            {canEdit && (
              <Button type="submit" loading={busy}>
                Save settings
              </Button>
            )}
          </form>
        </CardBody>
      </Card>

      {canEdit && (
        <Card className="border-red-500/40 dark:border-red-500/40">
          <CardHeader title="Delete project" description="Deletes the project, all of its scans, findings and stored uploads. This cannot be undone." />
          <CardBody>
            <Button variant="danger" onClick={() => setDeleting(true)} icon={<Trash size={16} aria-hidden="true" />}>
              Delete project
            </Button>
          </CardBody>
        </Card>
      )}
      <ConfirmDialog
        open={deleting}
        onClose={() => setDeleting(false)}
        title={`Delete ${project.name}?`}
        description={`All scans, findings, reports and uploaded code for this project in ${currentOrg?.name ?? 'this organization'} will be permanently deleted.`}
        confirmText={project.name}
        confirmLabel="Delete permanently"
        busy={deleteBusy}
        error={deleteError}
        onConfirm={async () => {
          setDeleteBusy(true);
          setDeleteError(null);
          try {
            await api.projects.remove(project.id);
            router.replace('/projects');
          } catch (err) {
            setDeleteError(err);
            setDeleteBusy(false);
          }
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ Page */

function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const params = useSearchParams();
  const router = useRouter();
  const { can } = useAuth();
  const tabParam = params.get('tab');
  const tab: Tab = (TABS as readonly string[]).includes(tabParam ?? '') ? (tabParam as Tab) : 'overview';
  const { data: project, error, loading, reload, setData } = useApi(`project:${id}`, () => api.projects.get(id));
  useEffect(() => {
    if (project) document.title = `${project.name} · Projects`;
  }, [project]);

  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (loading && !project) return <LoadingBlock rows={6} label="Loading project" />;
  if (!project) return null;

  const latest: ScanView | null | undefined = project.latestScan;
  return (
    <>
      <PageHeader
        breadcrumb={[{ href: '/projects', label: 'Projects' }]}
        title={project.name}
        description={
          <>
            {project.description && <p>{project.description}</p>}
            <DescriptionList
              items={[
                { label: 'Created', value: formatDateTime(project.createdAt) },
                { label: 'Scans', value: project.scanCount ?? '—' },
              ]}
            />
          </>
        }
        actions={
          <>
            {latest && (
              <LinkButton href={`/scans/${latest.id}`} variant="outline">
                Latest report
              </LinkButton>
            )}
            {can('scan') && (
              <LinkButton href={`/scans/new/repository?projectId=${project.id}`} icon={<ScanSearch size={16} aria-hidden="true" />}>
                New scan
              </LinkButton>
            )}
          </>
        }
      />
      <Tabs
        label="Project sections"
        active={tab}
        onChange={(k) => router.replace(`/projects/${id}${k === 'overview' ? '' : `?tab=${k}`}`, { scroll: false })}
        items={[
          { key: 'overview', label: 'Overview' },
          { key: 'history', label: 'History', count: project.scanCount },
          { key: 'branches', label: 'Branches' },
          { key: 'monitoring', label: 'Monitoring' },
          { key: 'settings', label: 'Settings' },
        ]}
      />
      <div role="tabpanel" aria-label={tab}>
        {tab === 'overview' && <Overview project={project} />}
        {tab === 'history' && <History projectId={project.id} />}
        {tab === 'branches' && <Branches project={project} />}
        {tab === 'monitoring' && <Monitoring project={project} onProjectChange={reload} />}
        {tab === 'settings' && (
          <SettingsTab
            project={project}
            onSaved={(p) => {
              setData((prev) => (prev ? { ...prev, ...p } : p));
            }}
          />
        )}
      </div>
    </>
  );
}

export default function ProjectPage() {
  return (
    <Suspense fallback={<LoadingBlock rows={6} />}>
      <ProjectDetail />
    </Suspense>
  );
}
