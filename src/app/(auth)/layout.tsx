'use client';

import { ShieldLogo } from '../../components/primitives';
import { Check } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMeta } from '@/components/meta';
import { ThemeToggle } from '@/components/theme';

const POINTS = [
  'Scan uploaded code, URLs and repositories',
  'Every report lists findings, coverage and limitations',
  'Connect providers to scan private sources',
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { productName } = useMeta();
  const logo = (
    <Link href="/" className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
      <ShieldLogo size={28} />
      <span className="font-semibold tracking-tight">{productName}</span>
    </Link>
  );
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[5fr_6fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-slate-200 bg-brand-50 p-10 dark:border-ink-600 dark:bg-ink-800 lg:flex">
        {logo}
        <div className="max-w-md">
          <h2 className="text-3xl font-semibold tracking-tight">Know what&apos;s in your code.</h2>
          <ul className="mt-6 space-y-3 text-sm text-slate-700 dark:text-slate-300">
            {POINTS.map((p) => (
              <li key={p} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600/10 text-brand-600 dark:text-brand-400">
                  <Check size={12} strokeWidth={3} aria-hidden="true" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">Scan results are indicators for review.</p>
        <ShieldLogo size={420} className="pointer-events-none absolute -bottom-24 -right-24 opacity-[0.06]" />
      </aside>
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-4">
          <div className="lg:invisible">{logo}</div>
          <ThemeToggle />
        </header>
        <main id="main" className="flex flex-1 items-center justify-center px-6 pb-16 pt-6">
          <div className="w-full max-w-sm [&_h1]:text-2xl [&_h1]:tracking-tight">{children}</div>
        </main>
      </div>
    </div>
  );
}
