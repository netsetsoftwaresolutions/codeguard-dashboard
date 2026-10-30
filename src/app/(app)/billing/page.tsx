'use client';

import { Check, X } from 'lucide-react';
import { useAuth } from '@/components/auth';
import { Card, CardBody, ErrorState, LoadingBlock, Notice, PageHeader, Pill } from '@/components/ui';
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
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="text-slate-600 dark:text-slate-300">{label}</span>
        <span className="tabular-nums">
          {formatNumber(used)} / {unlimited ? 'unlimited' : formatNumber(limit)}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-ink-600" role="meter" aria-label={label} aria-valuenow={used} aria-valuemin={0} aria-valuemax={unlimited ? undefined : limit}>
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
          <Card>
            <CardBody>
              <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-semibold">{s.plan.name}</h2>
                    <Pill>{s.status.toLowerCase()}</Pill>
                  </div>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{s.plan.description}</p>
                </div>
                <p className="text-xs text-slate-500">Current period started {formatDate(s.currentPeriodStart)}</p>
              </div>
              <div className="mt-5 grid gap-5 border-t border-slate-200 pt-5 dark:border-ink-600 sm:grid-cols-3">
                <Meter label="Scans this period" used={s.usage.scansThisPeriod} limit={s.usage.scansLimit} />
                <Meter label="Projects" used={s.usage.projects} limit={s.usage.projectsLimit} />
                <Meter label="Members" used={s.usage.members} limit={s.usage.membersLimit} />
              </div>
            </CardBody>
          </Card>
          <section aria-label="Compare plans">
            <h2 className="mb-3 text-sm font-semibold">Compare plans</h2>
            {plans.error ? (
              <ErrorState error={plans.error} onRetry={plans.reload} />
            ) : plans.loading || !plans.data ? (
              <LoadingBlock rows={4} />
            ) : (
              <div className="grid gap-6 lg:grid-cols-3">
                {plans.data.map((p) => {
                  const current = p.key === s.plan.key;
                  const included = new Set(p.features);
                  return (
                    <Card key={p.key} as="article" className={cx('flex min-w-0 flex-col p-5', current && 'border-brand-500/60 ring-1 ring-brand-500/30')}>
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-lg font-semibold">{p.name}</h3>
                        {current && <Pill className="bg-brand-600/10 text-brand-700 dark:text-brand-400">Current</Pill>}
                      </div>
                      <p className="mt-1 text-2xl font-semibold">{formatPrice(p.monthlyPriceUsd)}</p>
                      <dl className="mt-4 space-y-1.5 text-sm">
                        {limitKeys.map((k) => (
                          <div key={k} className="flex justify-between gap-3">
                            <dt className="text-slate-500 dark:text-slate-400">{limitLabel(k)}</dt>
                            <dd className="shrink-0 font-medium tabular-nums">{p.limits?.[k] !== undefined ? formatLimit(k, p.limits[k]) : '—'}</dd>
                          </div>
                        ))}
                      </dl>
                      <ul className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm dark:border-ink-600">
                        {allFeatures.map((f) =>
                          included.has(f) ? (
                            <li key={f} className="flex items-start gap-2.5">
                              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                                <Check size={11} strokeWidth={3} aria-hidden="true" />
                              </span>
                              <span className="sr-only">Included: </span>
                              {featureLabel(f)}
                            </li>
                          ) : (
                            <li key={f} className="flex items-start gap-2.5 text-slate-400 dark:text-slate-500">
                              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-400 dark:bg-ink-600 dark:text-slate-500">
                                <X size={10} strokeWidth={3} aria-hidden="true" />
                              </span>
                              <span className="sr-only">Not included: </span>
                              <span className="line-through decoration-slate-300 dark:decoration-slate-600">{featureLabel(f)}</span>
                            </li>
                          ),
                        )}
                      </ul>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </>
  );
}
