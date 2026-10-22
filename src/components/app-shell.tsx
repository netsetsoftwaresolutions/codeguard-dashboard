'use client';

import { cx, ShieldLogo } from './primitives';
import {
  Bell,
  ChevronDown,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Plug,
  ScanSearch,
  Settings,
  ShieldEllipsis,
  User,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { api } from '@/lib/api';
import { useInterval } from '@/lib/hooks';
import { ROLE_LABELS } from '@/lib/roles';
import { AuthProvider, useAuth } from './auth';
import { useMeta } from './meta';
import { ThemeToggle } from './theme';
import { Button, ErrorState, Field, FormError, focusRing, Input, Skeleton } from './ui';

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  match?: (p: string) => boolean;
}

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/scans/new', label: 'New scan', icon: ScanSearch, match: (p) => p.startsWith('/scans/new') },
  { href: '/integrations', label: 'Integrations', icon: Plug },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/team', label: 'Team', icon: Users },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function isActive(item: NavItem, pathname: string) {
  if (item.match) return item.match(pathname);
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

function NavLinks({ onNavigate, isAdmin }: { onNavigate?: () => void; isAdmin: boolean }) {
  const pathname = usePathname() ?? '';
  const items = isAdmin ? [...NAV, { href: '/admin', label: 'Platform admin', icon: ShieldEllipsis }] : NAV;
  return (
    <nav aria-label="Main" className="flex flex-col gap-0.5">
      {items.map((item) => {
        const active = isActive(item, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cx(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              focusRing,
              active
                ? 'bg-brand-600/10 text-brand-700 dark:bg-brand-500/15 dark:text-brand-400'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-ink-700 dark:hover:text-white',
            )}
          >
            <Icon size={18} aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  const { productName } = useMeta();
  return (
    <Link href="/dashboard" className={cx('flex items-center gap-2 rounded-lg', focusRing)}>
      <ShieldLogo size={28} />
      <span className="text-base font-semibold tracking-tight text-slate-900 dark:text-white">{productName}</span>
    </Link>
  );
}

function OrgSwitcher() {
  const { organizations, currentOrg, setCurrentOrgId } = useAuth();
  if (!organizations.length) return null;
  return (
    <div className="min-w-0">
      <label htmlFor="org-switcher" className="sr-only">
        Organization
      </label>
      <select
        id="org-switcher"
        value={currentOrg?.id ?? ''}
        onChange={(e) => setCurrentOrgId(e.target.value)}
        className="max-w-[12rem] truncate rounded-lg border border-slate-300 bg-white py-1.5 pl-3 pr-8 text-sm font-medium text-slate-800 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 dark:border-ink-500 dark:bg-ink-800 dark:text-slate-100 sm:max-w-[16rem]"
      >
        {organizations.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name} · {ROLE_LABELS[o.role]}
          </option>
        ))}
      </select>
    </div>
  );
}

function NotificationBell() {
  const [unread, setUnread] = useState<number | null>(null);
  const load = useCallback(() => {
    api.notifications
      .list(true)
      .then((n) => setUnread(n.filter((x) => !x.readAt).length))
      .catch(() => setUnread(null));
  }, []);
  useEffect(load, [load]);
  useInterval(load, 60_000, true);
  const label = unread ? `Notifications, ${unread} unread` : 'Notifications';
  return (
    <Link
      href="/notifications"
      aria-label={label}
      title={label}
      className={cx(
        'relative inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-ink-700 dark:hover:text-white',
        focusRing,
      )}
    >
      <Bell size={18} aria-hidden="true" />
      {unread ? (
        <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-[18px] text-white">
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </Link>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  if (!user) return null;
  const initial = (user.name || user.email).charAt(0).toUpperCase();
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cx('flex items-center gap-2 rounded-lg p-1 pr-2 hover:bg-slate-100 dark:hover:bg-ink-700', focusRing)}
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white" aria-hidden="true">
          {initial}
        </span>
        <span className="sr-only">Account menu for {user.email}</span>
        <ChevronDown size={14} className="text-slate-500" aria-hidden="true" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg dark:border-ink-600 dark:bg-ink-800">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-ink-600">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{user.name || 'Signed in'}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user.email}</p>
          </div>
          <Link role="menuitem" href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-ink-700">
            <User size={16} aria-hidden="true" /> Profile & settings
          </Link>
          <button role="menuitem" type="button" onClick={() => void logout()} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-ink-700">
            <LogOut size={16} aria-hidden="true" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function CreateFirstOrganization() {
  const { refresh, setCurrentOrgId } = useAuth();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 dark:border-ink-600 dark:bg-ink-800">
      <h1 className="text-lg font-semibold">Create an organization</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Projects, scans and team members belong to an organization. You are not a member of any organization yet.
      </p>
      <form
        className="mt-4 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (name.trim().length < 2) {
            setError(new Error('Organization name must be at least 2 characters.'));
            return;
          }
          setBusy(true);
          setError(null);
          try {
            const org = await api.organizations.create(name.trim());
            setCurrentOrgId(org.id);
            await refresh();
          } catch (err) {
            setError(err);
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field htmlFor="org-name" label="Organization name" required>
          <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
        </Field>
        <FormError error={error} />
        <Button type="submit" loading={busy}>
          Create organization
        </Button>
      </form>
    </div>
  );
}

function ShellInner({ children }: { children: ReactNode }) {
  const { user, organizations, loading, error, refresh } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setMobileOpen(false), [pathname]);

  if (loading) {
    return (
      <div className="flex min-h-screen" role="status" aria-live="polite">
        <span className="sr-only">Loading your workspace…</span>
        <div className="hidden w-64 border-r border-slate-200 p-4 dark:border-ink-600 lg:block">
          <Skeleton className="mb-6 h-8 w-32" />
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="mb-2 h-8 w-full" />
          ))}
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="mb-6 h-8 w-64" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (!user) {
    return (
      <main id="main" className="mx-auto max-w-lg p-8">
        {error ? (
          <ErrorState error={new Error(error)} onRetry={() => void refresh()} title="Could not load your session" />
        ) : (
          <p className="text-sm text-slate-500" role="status">
            Redirecting to sign in…
          </p>
        )}
      </main>
    );
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white px-3 py-4 dark:border-ink-600 dark:bg-ink-900 lg:flex">
        <div className="mb-6 px-2">
          <Brand />
        </div>
        <NavLinks isAdmin={user.isPlatformAdmin} />
        <p className="mt-auto px-3 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
          Scan results are indicators for review. No scan can guarantee code is free of malware.
        </p>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-white px-3 py-4 shadow-xl dark:bg-ink-900">
            <div className="mb-6 flex items-center justify-between px-2">
              <Brand />
              <button type="button" onClick={() => setMobileOpen(false)} className={cx('rounded-md p-1 text-slate-500', focusRing)} aria-label="Close navigation">
                <X size={20} aria-hidden="true" />
              </button>
            </div>
            <NavLinks isAdmin={user.isPlatformAdmin} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/90 px-4 backdrop-blur dark:border-ink-600 dark:bg-ink-900/90 sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className={cx('rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-ink-700 lg:hidden', focusRing)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <OrgSwitcher />
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {organizations.length === 0 ? <CreateFirstOrganization /> : children}
        </main>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ShellInner>{children}</ShellInner>
    </AuthProvider>
  );
}

