'use client';

import { Check, CloudOff, RefreshCw, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button, buttonClass, Notice, Skeleton } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { featureLabel, formatLimit, formatPrice, limitLabel } from '@/lib/plans';
import type { PlanView } from '@/lib/types';

export function Plans() {
  const [plans, setPlans] = useState<PlanView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api.plans(controller.signal)
      .then((data) => { if (!controller.signal.aborted) setPlans(data); })
      .catch((e: unknown) => { if (!controller.signal.aborted) setError(errorMessage(e)); });
    return () => controller.abort();
  }, [attempt]);

  if (error) {
    return (
      <div role="status" className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center dark:border-ink-600 dark:bg-ink-800">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-ink-700 dark:text-slate-400">
          <CloudOff size={22} aria-hidden="true" />
        </span>
        <h3 className="mt-4 text-lg font-semibold">We couldn’t load our plans</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Something went wrong on our side. Please try again in a moment.</p>
        <Button variant="outline" size="lg" className="mt-5" onClick={() => { setError(null); setAttempt((value) => value + 1); }}>
          <RefreshCw size={15} aria-hidden="true" /> Try again
        </Button>
      </div>
    );
  }

  if (!plans) {
    return (
      <div className="grid gap-6 lg:grid-cols-3" role="status" aria-label="Loading plans">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-80" />
        ))}
      </div>
    );
  }

  if (!plans.length) return <Notice tone="neutral">No plans are published on this server.</Notice>;

  const allFeatures = Array.from(new Set(plans.flatMap((p) => p.features)));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {plans.map((p) => {
        const included = new Set(p.features);
        const missing = allFeatures.filter((f) => !included.has(f));
        return (
          <div key={p.key} className="landing-surface group flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-6 hover:border-brand-500/50 hover:shadow-lg hover:shadow-brand-500/5 dark:border-ink-600 dark:bg-ink-800 dark:hover:border-brand-400/50 dark:hover:shadow-brand-500/10 lg:row-span-6 lg:grid lg:grid-rows-subgrid lg:gap-y-0">
            <h3 className="text-lg font-semibold">{p.name}</h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{p.description}</p>
            <p className="mt-4 text-2xl font-semibold">{formatPrice(p.monthlyPriceUsd)}</p>
            <dl className="mt-4 space-y-1.5 text-sm">
              {Object.entries(p.limits ?? {}).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">{limitLabel(k)}</dt>
                  <dd className="shrink-0 text-right font-medium tabular-nums">{formatLimit(k, v)}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-4 space-y-2 border-t border-slate-200 pt-4 text-sm dark:border-ink-600">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white dark:bg-emerald-500 dark:text-ink-900">
                    <Check size={11} strokeWidth={3} aria-hidden="true" />
                  </span>
                  <span className="text-slate-800 dark:text-slate-200">{featureLabel(f)}</span>
                </li>
              ))}
              {missing.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-slate-400 dark:text-slate-500">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-400 dark:bg-ink-600 dark:text-slate-500">
                    <X size={10} strokeWidth={3} aria-hidden="true" />
                  </span>
                  <span className="line-through decoration-slate-300 dark:decoration-slate-600">{featureLabel(f)}</span>
                </li>
              ))}
            </ul>
            <Link href="/register" className={buttonClass('outline', 'lg', 'landing-control mt-6 hover:border-brand-600 hover:bg-brand-600 hover:text-white active:brightness-95 dark:hover:border-brand-500 dark:hover:bg-brand-500 dark:hover:text-white')}>
              Get started
            </Link>
          </div>
        );
      })}
    </div>
  );
}
