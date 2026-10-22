'use client';

import { ShieldLogo } from '../components/primitives';
import {
  Bug,
  Check,
  FileCode,
  GitBranch,
  GitPullRequest,
  KeyRound,
  Package,
  Puzzle,
  ScanSearch,
  ShieldAlert,
  Settings2,
  Upload,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useMeta } from '@/components/meta';
import { ThemeToggle } from '@/components/theme';
import { buttonClass, Notice, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { featureLabel, formatLimit, formatPrice, limitLabel } from '@/lib/plans';
import type { PlanView } from '@/lib/types';

const SCANS = [
  { icon: ShieldAlert, title: 'Malware indicators', body: 'Obfuscation, remote code execution, credential theft, exfiltration and backdoor patterns — reported as indicators for review, with evidence.' },
  { icon: Package, title: 'Vulnerable dependencies', body: 'Manifests and lockfiles matched against the OSV database. Advisory IDs, affected ranges and published fixed versions only.' },
  { icon: KeyRound, title: 'Exposed secrets', body: 'Provider-specific formats and high-entropy strings. Evidence is always masked — full secret values are never stored or shown.' },
  { icon: Settings2, title: 'Configuration risks', body: 'Risky install scripts, CI configuration, exposed files and insecure settings that widen your attack surface.' },
  { icon: GitBranch, title: 'Git history', body: 'Commit-by-commit signals: dependency and install-script changes, new URLs, executables and config changes.' },
  { icon: GitPullRequest, title: 'Pull requests', body: 'Only what a change introduces relative to its target branch, with links to the exact lines in the diff.' },
];

const STEPS = [
  { icon: Upload, title: 'Bring your code', body: 'Upload files, a folder or an archive; paste a GitHub, GitLab, Bitbucket, Dropbox or Google Drive link; or connect a repository.' },
  { icon: ScanSearch, title: 'Isolated scanning', body: 'Workers fetch the source, build an inventory and run rule, secret, dependency and history engines — then score the results.' },
  { icon: FileCode, title: 'Explainable report', body: 'Findings classified as Confirmed, Suspicious or Possible false positive, with coverage and limitations listed alongside.' },
  { icon: Puzzle, title: 'Chrome extension', body: 'Scan the repository, file or pull request you are viewing on GitHub, GitLab or Bitbucket with one click, and open the full report here.' },
];

function Plans() {
  const [plans, setPlans] = useState<PlanView[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    api.plans().then(setPlans).catch(() => setFailed(true));
  }, []);
  if (failed) return <Notice tone="neutral">Plan information is unavailable right now.</Notice>;
  if (!plans) {
    return (
      <div className="grid gap-6 md:grid-cols-3" role="status" aria-label="Loading plans">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-80" />
        ))}
      </div>
    );
  }
  if (!plans.length) return <Notice tone="neutral">No plans are published on this server.</Notice>;
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {plans.map((p) => (
        <div key={p.key} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 dark:border-ink-600 dark:bg-ink-800">
          <h3 className="text-lg font-semibold">{p.name}</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{p.description}</p>
          <p className="mt-4 text-2xl font-semibold">{formatPrice(p.monthlyPriceUsd)}</p>
          <dl className="mt-4 space-y-1.5 text-sm">
            {Object.entries(p.limits ?? {}).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-slate-500 dark:text-slate-400">{limitLabel(k)}</dt>
                <dd className="font-medium tabular-nums">{formatLimit(k, v)}</dd>
              </div>
            ))}
          </dl>
          <ul className="mt-4 space-y-1.5 border-t border-slate-200 pt-4 text-sm dark:border-ink-600">
            {p.features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check size={16} className="mt-0.5 shrink-0 text-green-600 dark:text-green-400" aria-hidden="true" />
                {featureLabel(f)}
              </li>
            ))}
          </ul>
          <Link href="/register" className={buttonClass('outline', 'md', 'mt-6')}>
            Get started
          </Link>
        </div>
      ))}
    </div>
  );
}

export default function LandingPage() {
  const { productName } = useMeta();
  const [signedIn, setSignedIn] = useState(false);
  useEffect(() => {
    api.auth
      .me({ skipAuthRedirect: true })
      .then(() => setSignedIn(true))
      .catch(() => setSignedIn(false));
  }, []);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-ink-600/70 dark:bg-ink-900/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500">
            <ShieldLogo size={28} />
            <span className="font-semibold tracking-tight">{productName}</span>
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-1 sm:gap-2">
            <a href="#scans" className="hidden px-3 py-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white sm:inline">
              What we scan
            </a>
            <a href="#plans" className="hidden px-3 py-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white sm:inline">
              Plans
            </a>
            <ThemeToggle />
            {signedIn ? (
              <Link href="/dashboard" className={buttonClass('primary', 'sm')}>
                Open dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className={buttonClass('ghost', 'sm')}>
                  Sign in
                </Link>
                <Link href="/register" className={buttonClass('primary', 'sm')}>
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.18),transparent_60%)]" aria-hidden="true" />
          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6 sm:pt-28">
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-700 dark:text-brand-400">
              <Bug size={14} aria-hidden="true" /> Source code security scanning
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
              Know what is in the code before you run it.
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
              {productName} inspects uploads, repositories, branches and pull requests for malware indicators, vulnerable dependencies, exposed secrets and
              risky configuration — and explains every finding with evidence, coverage and limitations.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href={signedIn ? '/scans/new' : '/register'} className={buttonClass('primary', 'lg')}>
                {signedIn ? 'Start a scan' : 'Create a free account'}
              </Link>
              <a href="#how" className={buttonClass('outline', 'lg')}>
                How it works
              </a>
            </div>
          </div>
        </section>

        <section id="scans" className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-labelledby="scans-title">
          <h2 id="scans-title" className="text-2xl font-semibold tracking-tight">
            What it scans for
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SCANS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-ink-600 dark:bg-ink-800">
                <Icon size={22} className="text-brand-600 dark:text-brand-400" aria-hidden="true" />
                <h3 className="mt-4 font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="border-y border-slate-200 bg-white py-16 dark:border-ink-600 dark:bg-ink-800/40" aria-labelledby="how-title">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 id="how-title" className="text-2xl font-semibold tracking-tight">
              How it works
            </h2>
            <ol className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <li key={title} className="relative">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">{i + 1}</span>
                    <Icon size={20} className="text-slate-500" aria-hidden="true" />
                  </div>
                  <h3 className="mt-4 font-semibold">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6" aria-labelledby="honest-title">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 sm:p-8">
            <h2 id="honest-title" className="text-lg font-semibold">
              An honest note on what scanning can and cannot do
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              No scanner — including {productName} — can guarantee that code is free of malware or vulnerabilities. Static analysis finds known patterns,
              advisories and indicators; novel or well-hidden threats can be missed, and some matches are false positives. Every report lists which
              engines ran, what was excluded and the known limitations, and the risk score is an additive, explainable measure — not a probability that
              the code is safe. Treat results as input to human review.
            </p>
          </div>
        </section>

        <section id="plans" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6" aria-labelledby="plans-title">
          <h2 id="plans-title" className="text-2xl font-semibold tracking-tight">
            Plans
          </h2>
          <div className="mt-8">
            <Plans />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-brand-600 p-8 text-white sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold">Scan your first project in minutes</h2>
              <p className="mt-1 text-sm text-blue-100">Upload a folder or paste a repository URL. Reports are private to your organization.</p>
            </div>
            <Link href={signedIn ? '/scans/new' : '/register'} className="inline-flex h-11 items-center rounded-lg bg-white px-5 text-sm font-semibold text-brand-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
              {signedIn ? 'Start a scan' : 'Get started'}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-500 dark:border-ink-600 dark:text-slate-400">
        © {new Date().getFullYear()} {productName}. Results are indicators for review, not guarantees.
      </footer>
    </div>
  );
}
