'use client';

import { Check, Minus } from 'lucide-react';
import { useAuth } from '@/components/auth';
import { Card, CardBody, CardHeader, ErrorState, LoadingBlock, Notice, PageHeader, Pill, Table, tbodyClass, Td, Th } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatNumber } from '@/lib/format';
import { useApi } from '@/lib/hooks';
import { featureLabel, formatLimit, formatPrice, limitLabel } from '@/lib/plans';
import { cx } from '../../../components/primitives';

function Meter({ label, used, limit }: { label: string; used: number; limit: number }) {
  const unlimited = !Number.isFinite(limit) || limit < 0;
  const pct = unlimited || limit === 0 ? 0 : Math.min(100, (used / limit) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="tabular-nums">
          {formatNumber(used)} / {unlimited ? 'unlimited' : formatNumber(limit)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-ink-600" role="meter" aria-label={label} aria-valuenow={used} aria-valuemin={0} aria-valuemax={unlimited ? undefined : limit}>
        <div className={cx('h-full rounded-full', pct >= 90 ? 'bg-red-600' : pct >= 75 ? 'bg-amber-500' : 'bg-brand-600')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function BillingPage() {
  const { currentOrg } = useAuth();
  const orgId = currentOrg?.id ?? null;
  const sub = useApi(orgId ? `subscription:${orgId}` : null, () => api.organizations.subscription(orgId as string));
  const plans = useApi('plans', () => api.plans());
  const s = sub.data;
  const allFeatures = Array.from(new Set((plans.data ?? []).flatMap((p) => p.features)));
  const limitKeys = Array.from(new Set((plans.data ?? []).flatMap((p) => Object.keys(p.limits ?? {}))));

  return (
    <>
      <PageHeader title="Billing & plan" />
      {sub.error ? (
        <ErrorState error={sub.error} onRetry={sub.reload} />
      ) : sub.loading || !s ? (
        <LoadingBlock rows={4} />
      ) : (
        <div className="space-y-6">
          {!s.billingEnabled && (
            <Notice tone="info">Online payments are not enabled on this deployment; contact your administrator to change plans.</Notice>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Current plan" />
              <CardBody className="space-y-3">
                <div className="flex items-center gap-2">
                  <p className="text-2xl font-semibold">{s.plan.name}</p>
                  <Pill>{s.status.toLowerCase()}</Pill>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300">{s.plan.description}</p>
                <p className="text-xs text-slate-500">Current period started {formatDate(s.currentPeriodStart)}</p>
                <ul className="grid gap-1.5 pt-2 text-sm sm:grid-cols-2">
                  {s.plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check size={16} className="mt-0.5 shrink-0 text-green-600" aria-hidden="true" />
                      {featureLabel(f)}
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
            <Card>
              <CardHeader title="Usage" />
              <CardBody className="space-y-5">
                <Meter label="Scans this period" used={s.usage.scansThisPeriod} limit={s.usage.scansLimit} />
                <Meter label="Projects" used={s.usage.projects} limit={s.usage.projectsLimit} />
                <Meter label="Members" used={s.usage.members} limit={s.usage.membersLimit} />
              </CardBody>
            </Card>
          </div>
          <Card>
            <CardHeader title="Compare plans" />
            {plans.error ? (
              <CardBody>
                <ErrorState error={plans.error} onRetry={plans.reload} />
              </CardBody>
            ) : plans.loading || !plans.data ? (
              <CardBody>
                <LoadingBlock rows={4} />
              </CardBody>
            ) : (
              <Table caption="Plan comparison">
                <thead>
                  <tr>
                    <Th>
                      <span className="sr-only">Feature</span>
                    </Th>
                    {plans.data.map((p) => (
                      <Th key={p.key} align="center">
                        {p.name}
                        {p.key === s.plan.key && <span className="ml-1 text-brand-600">(current)</span>}
                      </Th>
                    ))}
                  </tr>
                </thead>
                <tbody className={tbodyClass}>
                  <tr>
                    <Td className="font-medium">Price</Td>
                    {plans.data.map((p) => (
                      <Td key={p.key} align="center">
                        {formatPrice(p.monthlyPriceUsd)}
                      </Td>
                    ))}
                  </tr>
                  {limitKeys.map((k) => (
                    <tr key={k}>
                      <Td>{limitLabel(k)}</Td>
                      {plans.data!.map((p) => (
                        <Td key={p.key} align="center">
                          {p.limits[k] !== undefined ? formatLimit(k, p.limits[k]) : '—'}
                        </Td>
                      ))}
                    </tr>
                  ))}
                  {allFeatures.map((f) => (
                    <tr key={f}>
                      <Td>{featureLabel(f)}</Td>
                      {plans.data!.map((p) => (
                        <Td key={p.key} align="center">
                          {p.features.includes(f) ? (
                            <Check size={16} className="mx-auto text-green-600" aria-label="Included" />
                          ) : (
                            <Minus size={16} className="mx-auto text-slate-400" aria-label="Not included" />
                          )}
                        </Td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card>
        </div>
      )}
    </>
  );
}
