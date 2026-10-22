'use client';

import { EmptyState, formatRelativeTime, SeverityBadge } from '../../../components/primitives';
import { ShieldEllipsis } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth';
import { BarList } from '@/components/charts';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  ErrorState,
  Field,
  FormError,
  Input,
  LoadingBlock,
  Notice,
  PageHeader,
  Pagination,
  Pill,
  Select,
  StatCard,
  Switch,
  Table,
  tbodyClass,
  Td,
  Th,
} from '@/components/ui';
import { api } from '@/lib/api';
import { formatDateTime, formatNumber, humanize, PROVIDER_LABELS } from '@/lib/format';
import { useApi, useInterval } from '@/lib/hooks';
import type { AdminRuleView } from '@/lib/types';

const WORKER_STALE_MS = 60_000;

function Rules() {
  const { data, error, loading, reload, setData } = useApi('admin-rules', () => api.admin.rules());
  const [q, setQ] = useState('');
  const [rowError, setRowError] = useState<unknown>(null);
  const rows = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (data ?? []).filter((r) => !n || [r.id, r.ruleId, r.title, r.name, r.category].filter(Boolean).join(' ').toLowerCase().includes(n));
  }, [data, q]);
  const toggle = async (r: AdminRuleView, enabled: boolean) => {
    setRowError(null);
    setData((prev) => prev?.map((x) => (x.id === r.id ? { ...x, enabled } : x)));
    try {
      await api.admin.setRule(r.id, enabled);
    } catch (e) {
      setRowError(e);
      setData((prev) => prev?.map((x) => (x.id === r.id ? { ...x, enabled: !enabled } : x)));
    }
  };
  return (
    <Card>
      <CardHeader
        title="Detection rules"
        action={<Input aria-label="Search rules" placeholder="Search rules" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />}
      />
      <FormError error={rowError} />
      {error ? (
        <CardBody>
          <ErrorState error={error} onRetry={reload} />
        </CardBody>
      ) : loading && !data ? (
        <CardBody>
          <LoadingBlock rows={4} />
        </CardBody>
      ) : rows.length ? (
        <div className="max-h-[480px] overflow-y-auto">
          <Table caption="Detection rules">
            <thead>
              <tr>
                <Th>Rule</Th>
                <Th>Category</Th>
                <Th>Severity</Th>
                <Th>Enabled</Th>
              </tr>
            </thead>
            <tbody className={tbodyClass}>
              {rows.map((r) => (
                <tr key={r.id}>
                  <Td>
                    <p className="font-medium">{r.title ?? r.name ?? r.ruleId ?? r.id}</p>
                    <p className="font-mono text-xs text-slate-500">{r.ruleId ?? r.id}</p>
                  </Td>
                  <Td className="text-xs">{r.category ? humanize(r.category) : '—'}</Td>
                  <Td>{r.severity ? <SeverityBadge severity={r.severity} /> : '—'}</Td>
                  <Td>
                    <Switch srOnlyLabel label={`Enable rule ${r.ruleId ?? r.id}`} checked={r.enabled} onChange={(v) => void toggle(r, v)} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      ) : (
        <CardBody>
          <EmptyState title="No rules" />
        </CardBody>
      )}
    </Card>
  );
}

function PlanAssignment({ planKeys }: { planKeys: string[] }) {
  const [orgId, setOrgId] = useState('');
  const [plan, setPlan] = useState(planKeys[0] ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState<string | null>(null);
  useEffect(() => {
    if (!plan && planKeys[0]) setPlan(planKeys[0]);
  }, [plan, planKeys]);
  return (
    <Card>
      <CardHeader title="Plan assignment" description="Manually assign a plan to an organization (billing module disabled)." />
      <CardBody>
        <form
          className="grid gap-3 sm:grid-cols-[1fr_160px_auto] sm:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!orgId.trim()) return setError(new Error('Enter an organization ID.'));
            setBusy(true);
            setError(null);
            setDone(null);
            try {
              await api.admin.setPlan(orgId.trim(), plan);
              setDone(`Assigned plan “${plan}” to ${orgId.trim()}.`);
            } catch (err) {
              setError(err);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field htmlFor="admin-org" label="Organization ID">
            <Input id="admin-org" value={orgId} onChange={(e) => setOrgId(e.target.value)} className="font-mono text-xs" autoComplete="off" />
          </Field>
          <Field htmlFor="admin-plan" label="Plan">
            <Select id="admin-plan" value={plan} onChange={(e) => setPlan(e.target.value)}>
              {planKeys.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" loading={busy}>
            Assign
          </Button>
        </form>
        <div className="mt-3 space-y-2">
          <FormError error={error} />
          {done && <Notice tone="success">{done}</Notice>}
        </div>
      </CardBody>
    </Card>
  );
}

function PlatformAudit() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useApi(`admin-audit:${page}`, () => api.admin.auditLogs(page));
  return (
    <Card>
      <CardHeader title="Platform audit log" />
      {error ? (
        <CardBody>
          <ErrorState error={error} onRetry={reload} />
        </CardBody>
      ) : loading && !data ? (
        <CardBody>
          <LoadingBlock rows={4} />
        </CardBody>
      ) : data && data.items.length ? (
        <>
          <Table caption="Platform audit log">
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Resource</Th>
                <Th>Organization</Th>
              </tr>
            </thead>
            <tbody className={tbodyClass}>
              {data.items.map((a) => (
                <tr key={a.id}>
                  <Td className="whitespace-nowrap text-xs">{formatDateTime(a.createdAt)}</Td>
                  <Td className="text-xs">{a.actorEmail ?? 'system'}</Td>
                  <Td className="font-mono text-xs">{a.action}</Td>
                  <Td className="text-xs">
                    {a.resourceType} {a.resourceId && <span className="font-mono text-slate-500">{a.resourceId}</span>}
                  </Td>
                  <Td className="font-mono text-xs">{a.organizationId ?? '—'}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={setPage} />
        </>
      ) : (
        <CardBody>
          <EmptyState title="No audit events" />
        </CardBody>
      )}
    </Card>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const isAdmin = !!user?.isPlatformAdmin;
  const { data, error, loading, reload } = useApi(isAdmin ? 'admin-overview' : null, () => api.admin.overview());
  const [now, setNow] = useState(() => Date.now());
  useInterval(() => {
    setNow(Date.now());
    reload();
  }, 30_000, isAdmin);

  if (!isAdmin) {
    return (
      <EmptyState icon={<ShieldEllipsis size={28} aria-hidden="true" />} title="Platform administrators only" description="Your account does not have platform administrator access." />
    );
  }

  return (
    <>
      <PageHeader title="Platform admin" description="Aggregate health and configuration for this deployment." />
      <Notice tone="info" className="mb-6">
        Platform administrators see aggregate metrics and configuration only. Customer source code, evidence snippets and findings are not accessible from this
        console.
      </Notice>
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <LoadingBlock rows={6} />
      ) : data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Users" value={formatNumber(data.totals.users)} />
            <StatCard label="Organizations" value={formatNumber(data.totals.organizations)} />
            <StatCard label="Projects" value={formatNumber(data.totals.projects)} />
            <StatCard label="Scans" value={formatNumber(data.totals.scans)} />
            <StatCard label="Scans (24h)" value={formatNumber(data.scansLast24h)} />
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card>
              <CardHeader title="Scans by source" />
              <CardBody>
                <BarList
                  ariaLabel="Scans by source"
                  items={Object.entries(data.scansBySource).map(([k, v]) => ({ key: k, label: PROVIDER_LABELS[k as keyof typeof PROVIDER_LABELS] ?? k, value: v ?? 0 }))}
                />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Scans by status" />
              <CardBody>
                <BarList ariaLabel="Scans by status" items={Object.entries(data.scansByStatus).map(([k, v]) => ({ key: k, label: humanize(k), value: v ?? 0 }))} />
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Queue" />
              <CardBody>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {Object.entries(data.queue).map(([k, v]) => (
                    <div key={k}>
                      <dt className="text-xs text-slate-500">{humanize(k)}</dt>
                      <dd className="text-lg font-semibold tabular-nums">{formatNumber(v)}</dd>
                    </div>
                  ))}
                </dl>
              </CardBody>
            </Card>
          </div>

          <Card>
            <CardHeader title="Workers" description={`Workers without a heartbeat for more than ${WORKER_STALE_MS / 1000}s are marked stale.`} />
            {data.workers.length ? (
              <Table caption="Scan workers">
                <thead>
                  <tr>
                    <Th>Worker</Th>
                    <Th>Heartbeat</Th>
                    <Th align="right">Concurrency</Th>
                    <Th>Engine versions</Th>
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  {data.workers.map((w) => {
                    const age = now - new Date(w.lastHeartbeat).getTime();
                    const stale = !(age <= WORKER_STALE_MS);
                    return (
                      <tr key={w.id}>
                        <Td>
                          <p className="font-medium">{w.hostname}</p>
                          <p className="font-mono text-xs text-slate-500">{w.id}</p>
                        </Td>
                        <Td>
                          {stale ? <Pill className="bg-red-500/10 text-red-700 dark:text-red-300">Stale</Pill> : <Pill className="bg-green-500/10 text-green-700 dark:text-green-300">Healthy</Pill>}
                          <span className="ml-2 text-xs text-slate-500">{formatRelativeTime(w.lastHeartbeat)}</span>
                        </Td>
                        <Td align="right">{w.concurrency}</Td>
                        <Td className="text-xs">
                          {Object.entries(w.engines).length
                            ? Object.entries(w.engines).map(([e, v]) => (
                                <span key={e} className="mr-2 inline-block font-mono">
                                  {e} {v}
                                </span>
                              ))
                            : '—'}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            ) : (
              <CardBody>
                <Notice tone="warning">No workers have reported a heartbeat. Scans will stay queued until a worker is running.</Notice>
              </CardBody>
            )}
          </Card>

          <Card>
            <CardHeader title="Failed scans" />
            {data.failedScans.length ? (
              <Table caption="Recently failed scans">
                <thead>
                  <tr>
                    <Th>When</Th>
                    <Th>Source</Th>
                    <Th>Organization</Th>
                    <Th>Error</Th>
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  {data.failedScans.map((f) => (
                    <tr key={f.id}>
                      <Td className="whitespace-nowrap text-xs">{formatDateTime(f.createdAt)}</Td>
                      <Td className="text-xs">{PROVIDER_LABELS[f.provider]}</Td>
                      <Td className="font-mono text-xs">{f.organizationId}</Td>
                      <Td className="max-w-md text-xs">{f.errorMessage ?? '—'}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <CardBody>
                <p className="text-sm text-slate-500">No failed scans.</p>
              </CardBody>
            )}
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Ruleset" />
              <CardBody>
                <dl className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Version</dt>
                    <dd className="font-mono">{data.ruleset.version}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Rules</dt>
                    <dd className="font-semibold tabular-nums">{formatNumber(data.ruleset.rules)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Enabled</dt>
                    <dd className="font-semibold tabular-nums">{formatNumber(data.ruleset.enabled)}</dd>
                  </div>
                </dl>
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium text-slate-500">Organizations per plan</p>
                  <BarList ariaLabel="Organizations per plan" items={data.plans.map((p) => ({ key: p.key, label: p.key, value: p.organizations }))} />
                </div>
              </CardBody>
            </Card>
            <PlanAssignment planKeys={data.plans.map((p) => p.key)} />
          </div>
          <Rules />
          <PlatformAudit />
        </div>
      ) : null}
    </>
  );
}
