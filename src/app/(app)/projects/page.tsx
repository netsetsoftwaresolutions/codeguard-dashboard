'use client';

import { EmptyState, formatRelativeTime, RiskBadge, ScanStatusBadge, SeverityCountsRow } from '../../../components/primitives';
import { FolderKanban, FolderPlus, Search } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAuth } from '@/components/auth';
import { isTerminal } from '@/components/scan-bits';
import { Card, ErrorState, Input, LinkButton, LoadingBlock, PageHeader, Table, tbodyClass, Td, Th } from '@/components/ui';
import { api } from '@/lib/api';
import { formatNumber, sevTotal } from '@/lib/format';
import { useApi } from '@/lib/hooks';

export default function ProjectsPage() {
  const { currentOrg, can } = useAuth();
  const orgId = currentOrg?.id ?? null;
  const { data, error, loading, reload } = useApi(orgId ? `projects:${orgId}` : null, () => api.projects.list(orgId as string));
  const [q, setQ] = useState('');
  const projects = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (data ?? []).filter((p) => !needle || p.name.toLowerCase().includes(needle) || (p.description ?? '').toLowerCase().includes(needle));
  }, [data, q]);

  return (
    <>
      <PageHeader
        title="Projects"
        description="Each project groups the sources you scan and their history."
        actions={
          can('createProject') ? (
            <LinkButton href="/projects/new" icon={<FolderPlus size={16} aria-hidden="true" />}>
              New project
            </LinkButton>
          ) : null
        }
      />
      {error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading && !data ? (
        <LoadingBlock rows={5} label="Loading projects" />
      ) : data && data.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={28} aria-hidden="true" />}
          title="No projects yet"
          description="Projects are created automatically when you start a scan, or you can create one now."
          action={can('createProject') ? <LinkButton href="/projects/new">Create a project</LinkButton> : undefined}
        />
      ) : (
        <Card>
          <div className="border-b border-slate-200 p-4 dark:border-ink-600">
            <div className="relative max-w-sm">
              <label htmlFor="project-search" className="sr-only">
                Search projects
              </label>
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <Input id="project-search" className="pl-8" placeholder="Search projects" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
          </div>
          <Table caption="Projects">
            <thead>
              <tr>
                <Th>Project</Th>
                <Th>Latest scan</Th>
                <Th>Risk</Th>
                <Th>Open findings</Th>
                <Th align="right">Scans</Th>
              </tr>
            </thead>
            <tbody className={tbodyClass}>
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-ink-700/40">
                  <Td className="max-w-xs">
                    <Link href={`/projects/${p.id}`} className="font-medium text-slate-900 hover:text-brand-600 hover:underline dark:text-white dark:hover:text-brand-400">
                      {p.name}
                    </Link>
                    {p.description && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{p.description}</p>}
                  </Td>
                  <Td>
                    {p.latestScan ? (
                      <div className="flex flex-col gap-1">
                        <ScanStatusBadge status={p.latestScan.status} />
                        <span className="text-xs text-slate-500 dark:text-slate-400">{formatRelativeTime(p.latestScan.createdAt)}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">Never scanned</span>
                    )}
                  </Td>
                  <Td>
                    {p.latestScan?.summary && isTerminal(p.latestScan.status) ? (
                      <RiskBadge level={p.latestScan.summary.risk.level} score={p.latestScan.summary.risk.score} />
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </Td>
                  <Td>
                    {p.openFindings ? (
                      <div className="space-y-1">
                        <span className="text-xs font-semibold tabular-nums">{formatNumber(sevTotal(p.openFindings))}</span>
                        <SeverityCountsRow counts={p.openFindings} compact />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </Td>
                  <Td align="right">{formatNumber(p.scanCount ?? null)}</Td>
                </tr>
              ))}
              {projects.length === 0 && (
                <tr>
                  <Td colSpan={5} className="py-8 text-center text-slate-500">
                    No projects match “{q}”.
                  </Td>
                </tr>
              )}
            </tbody>
          </Table>
        </Card>
      )}
    </>
  );
}
