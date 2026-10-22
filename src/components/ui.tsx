'use client';

import { cx } from './primitives';
import { Check, ChevronLeft, ChevronRight, CircleAlert, Copy, Info, RefreshCw, TriangleAlert, X } from 'lucide-react';
import Link from 'next/link';
import {
  forwardRef,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { errorMessage } from '@/lib/api';

export { cx };

/* ---------------------------------------------------------------- Buttons */

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm disabled:bg-brand-600/50',
  secondary:
    'bg-slate-100 text-slate-900 hover:bg-slate-200 dark:bg-ink-700 dark:text-slate-100 dark:hover:bg-ink-600 disabled:opacity-50',
  outline:
    'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 dark:border-ink-500 dark:bg-transparent dark:text-slate-200 dark:hover:bg-ink-700 disabled:opacity-50',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-ink-700 dark:hover:text-white disabled:opacity-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm disabled:bg-red-600/50',
};
const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-9 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
};

export const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-ink-900';

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cx(
    'inline-flex items-center justify-center whitespace-nowrap rounded-lg font-medium transition-colors disabled:cursor-not-allowed',
    focusRing,
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, icon, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button ref={ref} type={type} className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" /> : icon}
      {children}
    </button>
  );
});

export function LinkButton({
  href,
  variant = 'primary',
  size = 'md',
  className,
  children,
  icon,
  external,
}: {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
  icon?: ReactNode;
  external?: boolean;
}) {
  if (external) {
    return (
      <a href={href} className={buttonClass(variant, size, className)} target="_blank" rel="noopener noreferrer">
        {icon}
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {icon}
      {children}
    </Link>
  );
}

/* ---------------------------------------------------------------- Layout */

export function Card({ children, className, as: As = 'section' }: { children: ReactNode; className?: string; as?: 'section' | 'div' | 'article' }) {
  return (
    <As className={cx('rounded-xl border border-slate-200 bg-white shadow-sm dark:border-ink-600 dark:bg-ink-800', className)}>{children}</As>
  );
}

export function CardHeader({ title, description, action, icon }: { title: ReactNode; description?: ReactNode; action?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-ink-600">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          {icon}
          {title}
        </h2>
        {description && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function CardBody({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx('p-5', className)}>{children}</div>;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: { href: string; label: string }[];
}) {
  return (
    <div className="mb-6">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2 flex flex-wrap items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
          {breadcrumb.map((b, i) => (
            <span key={b.href} className="inline-flex items-center gap-1">
              {i > 0 && <ChevronRight size={12} aria-hidden="true" />}
              <Link href={b.href} className="hover:text-slate-900 hover:underline dark:hover:text-white">
                {b.label}
              </Link>
            </span>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{title}</h1>
          {description && <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Feedback */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx('animate-pulse rounded-md bg-slate-200 dark:bg-ink-700', className)} aria-hidden="true" />;
}

export function LoadingBlock({ rows = 3, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-live="polite" className="space-y-3">
      <span className="sr-only">{label}…</span>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={cx('h-10', i % 2 ? 'w-11/12' : 'w-full')} />
      ))}
    </div>
  );
}

export function ErrorState({ error, onRetry, title = 'Could not load data' }: { error: unknown; onRetry?: () => void; title?: string }) {
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/5 p-5 text-sm">
      <div className="flex items-center gap-2 font-semibold text-red-700 dark:text-red-300">
        <CircleAlert size={16} aria-hidden="true" />
        {title}
      </div>
      <p className="text-slate-600 dark:text-slate-300">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} icon={<RefreshCw size={14} aria-hidden="true" />}>
          Retry
        </Button>
      )}
    </div>
  );
}

type Tone = 'info' | 'warning' | 'danger' | 'success' | 'neutral';
const TONES: Record<Tone, string> = {
  info: 'border-blue-500/30 bg-blue-500/5 text-blue-900 dark:text-blue-200',
  warning: 'border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-200',
  danger: 'border-red-500/30 bg-red-500/5 text-red-900 dark:text-red-200',
  success: 'border-green-500/30 bg-green-500/5 text-green-900 dark:text-green-200',
  neutral: 'border-slate-300 bg-slate-50 text-slate-700 dark:border-ink-500 dark:bg-ink-700/50 dark:text-slate-300',
};

export function Notice({ tone = 'info', title, children, className, icon }: { tone?: Tone; title?: ReactNode; children?: ReactNode; className?: string; icon?: ReactNode }) {
  const Icon = tone === 'warning' || tone === 'danger' ? TriangleAlert : tone === 'success' ? Check : Info;
  return (
    <div className={cx('flex gap-3 rounded-lg border p-3 text-sm', TONES[tone], className)} role={tone === 'danger' ? 'alert' : undefined}>
      <span className="mt-0.5 shrink-0" aria-hidden="true">
        {icon ?? <Icon size={16} />}
      </span>
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed opacity-90">{children}</div>}
      </div>
    </div>
  );
}

export function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  const fieldErrors = (error as { errors?: { path: string; message: string }[] }).errors ?? [];
  return (
    <Notice tone="danger">
      <p>{errorMessage(error)}</p>
      {fieldErrors.length > 0 && (
        <ul className="mt-1 list-disc pl-4">
          {fieldErrors.map((e, i) => (
            <li key={i}>
              {e.path ? <code className="font-mono text-xs">{e.path}</code> : null} {e.message}
            </li>
          ))}
        </ul>
      )}
    </Notice>
  );
}

/* ---------------------------------------------------------------- Forms */

const inputBase =
  'block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:cursor-not-allowed disabled:opacity-60 dark:border-ink-500 dark:bg-ink-900 dark:text-slate-100 dark:placeholder:text-slate-500';

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
  required,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  htmlFor: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700 dark:text-slate-200">
        {label}
        {required && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <p id={`${htmlFor}-hint`} className="text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }>(function Input(
  { className, invalid, ...rest },
  ref,
) {
  return <input ref={ref} className={cx(inputBase, invalid && 'border-red-500 focus:ring-red-500/40', className)} aria-invalid={invalid || undefined} {...rest} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea({ className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(inputBase, 'min-h-[88px]', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cx(inputBase, 'pr-8', className)} {...rest}>
      {children}
    </select>
  );
});

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  id?: string;
}) {
  const auto = useId();
  const cid = id ?? auto;
  return (
    <div className="flex items-start gap-3">
      <input
        id={cid}
        type="checkbox"
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-2 focus:ring-brand-500 dark:border-ink-500 dark:bg-ink-900"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-describedby={description ? `${cid}-desc` : undefined}
      />
      <div className="text-sm">
        <label htmlFor={cid} className={cx('font-medium text-slate-800 dark:text-slate-200', disabled && 'opacity-60')}>
          {label}
        </label>
        {description && (
          <p id={`${cid}-desc`} className="text-xs text-slate-500 dark:text-slate-400">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
  srOnlyLabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
  srOnlyLabel?: boolean;
}) {
  return (
    <label className={cx('inline-flex items-center gap-2 text-sm', disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={srOnlyLabel ? label : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
          focusRing,
          checked ? 'bg-brand-600' : 'bg-slate-300 dark:bg-ink-500',
        )}
      >
        <span className={cx('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5')} />
      </button>
      {!srOnlyLabel && <span className="text-slate-700 dark:text-slate-200">{label}</span>}
    </label>
  );
}

/* ---------------------------------------------------------------- Tabs */

export interface TabItem {
  key: string;
  label: ReactNode;
  href?: string;
  count?: number;
}

export function Tabs({ items, active, onChange, label }: { items: TabItem[]; active: string; onChange?: (k: string) => void; label: string }) {
  return (
    <div className="-mx-1 mb-5 overflow-x-auto border-b border-slate-200 dark:border-ink-600">
      <div role="tablist" aria-label={label} className="flex min-w-max gap-1 px-1">
        {items.map((t) => {
          const selected = t.key === active;
          const cls = cx(
            'inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors',
            focusRing,
            selected
              ? 'border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-400'
              : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200',
          );
          const content = (
            <>
              {t.label}
              {t.count !== undefined && (
                <span className="rounded-full bg-slate-100 px-1.5 text-xs tabular-nums text-slate-600 dark:bg-ink-700 dark:text-slate-300">{t.count}</span>
              )}
            </>
          );
          return t.href ? (
            <Link key={t.key} href={t.href} role="tab" aria-selected={selected} className={cls}>
              {content}
            </Link>
          ) : (
            <button key={t.key} type="button" role="tab" aria-selected={selected} className={cls} onClick={() => onChange?.(t.key)}>
              {content}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Tables */

export function Table({ children, caption, className }: { children: ReactNode; caption?: string; className?: string }) {
  return (
    <div className={cx('overflow-x-auto', className)}>
      <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-ink-600">
        {caption && <caption className="sr-only">{caption}</caption>}
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className, align = 'left' }: { children?: ReactNode; className?: string; align?: 'left' | 'right' | 'center' }) {
  return (
    <th
      scope="col"
      className={cx(
        'whitespace-nowrap px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({ children, className, align = 'left', colSpan }: { children?: ReactNode; className?: string; align?: 'left' | 'right' | 'center'; colSpan?: number }) {
  return (
    <td
      colSpan={colSpan}
      className={cx(
        'px-4 py-3 align-middle text-slate-700 dark:text-slate-300',
        align === 'right' ? 'text-right tabular-nums' : align === 'center' ? 'text-center' : 'text-left',
        className,
      )}
    >
      {children}
    </td>
  );
}

export const tbodyClass = 'divide-y divide-slate-100 dark:divide-ink-700';

export function Pagination({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  if (total <= pageSize && page === 1) return null;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm dark:border-ink-600">
      <p className="text-slate-500 dark:text-slate-400">
        Page <span className="font-medium text-slate-800 dark:text-slate-200">{page}</span> of {pages} · {total} total
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)} icon={<ChevronLeft size={14} aria-hidden="true" />}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
          Next
          <ChevronRight size={14} aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}

/* ---------------------------------------------------------------- Overlays */

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
}

function useFocusOnOpen(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>('input, select, textarea, button:not([data-close]), a[href]');
    (first ?? el)?.focus();
    return () => prev?.focus?.();
  }, [open]);
  return ref;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'md' | 'lg';
}) {
  useEscape(open, onClose);
  const ref = useFocusOnOpen(open);
  const titleId = useId();
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx(
          'relative max-h-[90vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white shadow-xl focus:outline-none dark:border-ink-600 dark:bg-ink-800 sm:rounded-2xl',
          size === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-md',
        )}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-ink-600">
          <h2 id={titleId} className="text-base font-semibold text-slate-900 dark:text-white">
            {title}
          </h2>
          <button type="button" data-close onClick={onClose} className={cx('rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-ink-700', focusRing)} aria-label="Close dialog">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-ink-600">{footer}</div>}
      </div>
    </div>
  );
}

export function Drawer({ open, onClose, title, children, label }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; label: string }) {
  useEscape(open, onClose);
  const ref = useFocusOnOpen(open);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="absolute inset-y-0 right-0 flex w-full max-w-2xl flex-col border-l border-slate-200 bg-white shadow-2xl focus:outline-none dark:border-ink-600 dark:bg-ink-800"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-ink-600">
          <div className="min-w-0 flex-1">{title}</div>
          <button type="button" data-close onClick={onClose} className={cx('rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-ink-700', focusRing)} aria-label="Close panel">
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  confirmText,
  danger = true,
  busy,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  /** When set, the user must type this text to enable the confirm button. */
  confirmText?: string;
  danger?: boolean;
  busy?: boolean;
  error?: unknown;
}) {
  const [typed, setTyped] = useState('');
  const id = useId();
  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);
  const enabled = !confirmText || typed === confirmText;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={!enabled} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
        <div>{description}</div>
        {confirmText && (
          <Field htmlFor={id} label={<>Type <code className="rounded bg-slate-100 px-1 font-mono dark:bg-ink-700">{confirmText}</code> to confirm</>}>
            <Input id={id} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </Field>
        )}
        {error ? <FormError error={error} /> : null}
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------- Misc */

export function CopyButton({ value, label = 'Copy', size = 'sm' }: { value: string; label?: string; size?: Size }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      variant="outline"
      size={size}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        } catch {
          setCopied(false);
        }
      }}
      icon={copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
    >
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </Button>
  );
}

export function StatCard({ label, value, hint, icon, href }: { label: string; value: ReactNode; hint?: ReactNode; icon?: ReactNode; href?: string }) {
  const inner = (
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
        {hint && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
      </div>
      {icon && <div className="rounded-lg bg-brand-600/10 p-2 text-brand-600 dark:text-brand-400">{icon}</div>}
    </div>
  );
  const cls = 'block rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-ink-600 dark:bg-ink-800';
  return href ? (
    <Link href={href} className={cx(cls, 'transition-colors hover:border-brand-500/50', focusRing)}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

export function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-ink-700 dark:text-slate-300', className)}>
      {children}
    </span>
  );
}

export function Mono({ children, className }: { children: ReactNode; className?: string }) {
  return <code className={cx('rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800 dark:bg-ink-700 dark:text-slate-200', className)}>{children}</code>;
}

export function ExternalA({ href, children, className }: { href: string | null; children: ReactNode; className?: string }) {
  if (!href) return <span className={className}>{children}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cx('text-brand-600 hover:underline dark:text-brand-400', className)}>
      {children}
    </a>
  );
}

export function DescriptionList({ items }: { items: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {items.map((it) => (
        <div key={it.label} className="min-w-0">
          <dt className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{it.label}</dt>
          <dd className="mt-0.5 break-words text-slate-800 dark:text-slate-200">{it.value}</dd>
        </div>
      ))}
    </dl>
  );
}
