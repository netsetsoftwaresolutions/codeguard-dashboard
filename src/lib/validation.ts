/**
 * Client-side validation using the local API-contract zod schemas.
 * zod is a dependency of shared-types (not of the dashboard), so schemas are typed structurally here.
 */

export type FieldErrors = Record<string, string>;

interface Issue {
  path: (string | number)[];
  message: string;
}

type SafeParseResult<T> = { success: true; data: T } | { success: false; error: { issues: Issue[] } };

export interface SafeParser<T> {
  safeParse: (input: unknown) => SafeParseResult<T>;
}

/** Flattens issues into `{ fieldPath: firstMessage }` for inline form errors. */
export function issuesToFieldErrors(issues: Issue[]): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of issues) {
    const key = issue.path.join('.') || '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function validate<T>(schema: SafeParser<T>, input: unknown): { ok: true; data: T } | { ok: false; errors: FieldErrors } {
  const r = schema.safeParse(input);
  if (r.success) return { ok: true, data: r.data };
  return { ok: false, errors: issuesToFieldErrors(r.error.issues) };
}

/** Only allow same-origin relative redirect targets (prevents open redirects via ?next=). */
export function safeNextPath(next: string | null | undefined, fallback = '/dashboard'): string {
  if (!next) return fallback;
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return fallback;
  if (next.startsWith('/login') || next.startsWith('/register')) return fallback;
  return next;
}

/** Secret-allowlist entries prefixed with `re:` must be valid regular expressions. Returns the invalid ones. */
export function invalidAllowlistEntries(entries: string[]): string[] {
  return entries.filter((e) => {
    if (!e.startsWith('re:')) return false;
    try {
      new RegExp(e.slice(3));
      return false;
    } catch {
      return true;
    }
  });
}
