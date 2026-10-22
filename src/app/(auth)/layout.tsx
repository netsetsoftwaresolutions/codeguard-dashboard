'use client';

import { ShieldLogo } from '../../components/primitives';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { useMeta } from '@/components/meta';
import { ThemeToggle } from '@/components/theme';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const { productName } = useMeta();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
          <ShieldLogo size={28} />
          <span className="font-semibold tracking-tight">{productName}</span>
        </Link>
        <ThemeToggle />
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-4 pb-16 pt-6 sm:items-center">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-ink-600 dark:bg-ink-800 sm:p-8">{children}</div>
      </main>
    </div>
  );
}
