'use client';

import { SEVERITIES } from '../../../contracts';
import { EmptyState, formatRelativeTime, ProgressBar, RiskBadge, SEVERITY_STYLES } from '../../../components/primitives';
import { Activity, FolderKanban, FolderPlus, GitBranch, Link2, ScanSearch, ShieldAlert, Upload } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/auth';
import { BarList, RiskTrendChart } from '@/components/charts';
import { isTerminal, ScanSourceCell, ScanTable } from '@/components/scan-bits';
import { Card, CardBody, CardHeader, ErrorState, LinkButton, LoadingBlock, PageHeader, Skeleton, StatCard, Table, tbodyClass, Td, Th } from '@/components/ui';
import { api } from '@/lib/api';
import { STAGE_LABELS, formatNumber, sevTotal } from '@/lib/format';
import { useApi, useInterval } from '@/lib/hooks';

export default function DashboardPage() {
  const { currentOrg, can } = useAuth();
  const orgId = currentOrg?.id ?? null;
  const { data, error, loading, reload } = useApi(orgId ? `overview:${orgId}` : null, () => api.dashboard.overview(orgId as string));
  useInterval(reload, 10_000, !!data && data.scansInProgress > 0);

  const canScan = can('scan');
  const actions = canScan ? (
    <>
      <LinkButton href="/scans/new/upload" variant="outline" icon={<Upload size={16} aria-hidden="true" />}>
        Upload code
      </LinkButton>
      <LinkButton href="/scans/new/repository" icon={<ScanSearch size={16} aria-hidden="true" />}>
        New scan
      </LinkButton>
    </>
  ) : null;

  return (
    <>
      <PageHeader title="Dashboard" description={currentOrg ? `Security posture for ${currentOrg.name}` : undefined} actions={actions} />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
          <Skeleton className="h-72" />
        </div>
      ) : data ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Projects" value={formatNumber(data.projectCount)} icon={<FolderKanban size={18} aria-hidden="true" />} href="/projects" />
            <StatCard label="Scans (30 days)" value={formatNumber(data.scansLast30Days)} icon={<ScanSearch size={18} aria-hidden="true" />} />
            <StatCard label="In progress" value={formatNumber(data.scansInProgress)} icon={<Activity size={18} aria-hidden="true" />} />
            <StatCard
              label="Open findings"
              value={formatNumber(sevTotal(data.openFindings))}
              hint={`${formatNumber((data.openFindings.CRITICAL ?? 0) + (data.openFindings.HIGH ?? 0))} critical or high`}
              icon={<ShieldAlert size={18} aria-hidden="true" />}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Risk trend" description="Average risk score of completed scans per day, last 30 days. Gaps are days without scans." />
              <CardBody>
                {data.riskTrend.some((p) => p.scans > 0) ? (
                  <RiskTrendChart points={data.riskTrend} />
                ) : (
                  <EmptyState title="No completed scans in the last 30 days" description="The trend appears once scans complete." />
                )}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Open findings by severity" />
              <CardBody>
                <BarList
                  ariaLabel="Open findings by severity"
                  emptyLabel="No open findings in the latest scans."
                  items={SEVERITIES.map((s) => ({ key: s, label: SEVERITY_STYLES[s].label, value: data.openFindings[s] ?? 0, color: SEVERITY_STYLES[s].dot }))}
                />
              </CardBody>
            </Card>
          </div>

          {(() => {
            const inProgress = data.recentScans.filter((s) => !isTerminal(s.status));
            if (!inProgress.length) return null;
            return (
              <Card>
                <CardHeader title="Scans in progress" />
                <ul className="divide-y divide-slate-100 dark:divide-ink-700">
                  {inProgress.map((s) => (
                    <li key={s.id} className="grid gap-3 px-5 py-3 sm:grid-cols-[1fr_220px] sm:items-center">
                      <ScanSourceCell scan={s} showProject />
                      <div>
                        <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span>{s.stage ? STAGE_LABELS[s.stage] : 'Queued'}</span>
                          <span className="tabular-nums">{s.progress}%</span>
                        </div>
                        <ProgressBar value={s.progress} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })()}

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader title="Recent scans" action={<Link href="/projects" className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400">All projects</Link>} />
              {data.recentScans.length ? (
                <ScanTable scans={data.recentScans} showProject caption="Recent scans" />
              ) : (
                <CardBody>
                  <EmptyState
                    title="No scans yet"
                    description="Upload code or scan a repository URL to get your first report."
                    action={canScan ? <LinkButton href="/scans/new">Start a scan</LinkButton> : undefined}
                  />
                </CardBody>
              )}
            </Card>
            <div className="space-y-6">
              <Card>
                <CardHeader title="Top-risk projects" />
                {data.topRiskProjects.length ? (
                  <Table caption="Projects with the highest latest risk score">
                    <thead>
                      <tr>
                        <Th>Project</Th>
                        <Th align="right">Risk</Th>
                      </tr>
                    </thead>
                    <tbody className={tbodyClass}>
                      {data.topRiskProjects.map((p) => (
                        <tr key={p.projectId}>
                          <Td>
                            <Link href={`/projects/${p.projectId}`} className="font-medium text-slate-900 hover:underline dark:text-white">
                              {p.name}
                            </Link>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Last scan {formatRelativeTime(p.lastScanAt)}</p>
                          </Td>
                          <Td align="right">
                            <RiskBadge level={p.riskLevel} score={p.riskScore} />
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <CardBody>
                    <p className="text-sm text-slate-500 dark:text-slate-400">No scored projects yet.</p>
                  </CardBody>
                )}
              </Card>
              {canScan && (
                <Card>
                  <CardHeader title="Quick actions" />
                  <CardBody className="grid gap-2">
                    <LinkButton href="/scans/new/upload" variant="outline" className="justify-start" icon={<Upload size={16} aria-hidden="true" />}>
                      Upload files, folder or archive
                    </LinkButton>
                    <LinkButton href="/scans/new/url" variant="outline" className="justify-start" icon={<Link2 size={16} aria-hidden="true" />}>
                      Scan a URL
                    </LinkButton>
                    <LinkButton href="/scans/new/repository" variant="outline" className="justify-start" icon={<GitBranch size={16} aria-hidden="true" />}>
                      Scan a repository or PR
                    </LinkButton>
                    {can('createProject') && (
                      <LinkButton href="/projects/new" variant="outline" className="justify-start" icon={<FolderPlus size={16} aria-hidden="true" />}>
                        Create a project
                      </LinkButton>
                    )}
                  </CardBody>
                </Card>
              )}
            </div>
          </div>
        </div>
      ) : (
        <LoadingBlock />
      )}
    </>
  );
}
