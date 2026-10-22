import type {
  AdminOverview,
  AuditLogView,
  AuthResponse,
  BranchSummaryView,
  CommitView,
  DashboardOverview,
  FindingStatus,
  FindingView,
  IntegrationView,
  InvitationView,
  LoginInput,
  MemberView,
  MetaView,
  NotificationView,
  OrganizationView,
  OrgRole,
  Paginated,
  ProjectView,
  PullRequestScanInput,
  RegisterInput,
  RepositoryScanInput,
  ScanComparisonView,
  ScanCreatedResponse,
  ScanFileView,
  ScanGroupView,
  ScanView,
  SourceInspection,
  SubscriptionView,
  UrlScanInput,
} from '../contracts';
import type {
  AdminAuditLogView,
  AdminRuleView,
  ApiErrorBody,
  ExportFormat,
  FindingDetailView,
  InvitationCreatedResponse,
  MeResponse,
  NotificationPreferences,
  PlanView,
  ScanStatusView,
  ScheduleView,
  ShareResponse,
} from './types';

export const CSRF_HEADER = 'X-CodeGuard-CSRF';
export const API_BASE = '/api';

/** Error thrown for any non-2xx API response. `message` is always human readable. */
export class ApiError extends Error {
  readonly status: number;
  readonly errors: { path: string; message: string }[];
  readonly body: ApiErrorBody | null;

  constructor(status: number, message: string, errors: { path: string; message: string }[] = [], body: ApiErrorBody | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.body = body;
  }
}

const STATUS_FALLBACK: Record<number, string> = {
  400: 'The request was invalid.',
  401: 'You need to sign in.',
  403: 'You do not have permission to do this.',
  404: 'Not found, or not visible to you.',
  409: 'This conflicts with the current state.',
  413: 'The upload is too large.',
  429: 'Too many requests or plan quota reached. Try again later.',
  500: 'The server encountered an error.',
  502: 'The API is unreachable.',
  503: 'The service is temporarily unavailable.',
};

/** Turns an error response body (`{statusCode,message,errors}`) into an ApiError. */
export function parseErrorBody(status: number, body: unknown): ApiError {
  const b = (body && typeof body === 'object' ? body : null) as ApiErrorBody | null;
  let message = '';
  if (b) {
    if (Array.isArray(b.message)) message = b.message.join('; ');
    else if (typeof b.message === 'string') message = b.message;
    else if (typeof b.error === 'string') message = b.error;
  } else if (typeof body === 'string' && body.trim() && body.length < 300 && !body.trim().startsWith('<')) {
    message = body.trim();
  }
  const errors = Array.isArray(b?.errors)
    ? b.errors
        .filter((e) => e && typeof e.message === 'string')
        .map((e) => ({ path: Array.isArray(e.path) ? e.path.join('.') : (e.path ?? ''), message: e.message }))
    : [];
  return new ApiError(status, message || STATUS_FALLBACK[status] || `Request failed (${status}).`, errors, b);
}

export function isMutating(method: string): boolean {
  const m = method.toUpperCase();
  return m !== 'GET' && m !== 'HEAD' && m !== 'OPTIONS';
}

const PUBLIC_PATH_PREFIXES = ['/login', '/register', '/forgot-password', '/reset-password'];

/** Navigates to the login page, remembering where the user was. No-op on auth pages. */
export function redirectToLogin(): void {
  if (typeof window === 'undefined') return;
  const { pathname, search } = window.location;
  if (PUBLIC_PATH_PREFIXES.some((p) => pathname.startsWith(p))) return;
  const next = `${pathname}${search}`;
  window.location.assign(`/login?next=${encodeURIComponent(next)}`);
}

export type QueryValue = string | number | boolean | null | undefined;

export function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const url = `${API_BASE}${p}`;
  if (!query) return url;
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue;
    qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `${url}?${s}` : url;
}

export interface RequestOptions {
  method?: string;
  body?: unknown;
  query?: Record<string, QueryValue>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** Do not redirect to /login on 401 (used by public pages probing the session). */
  skipAuthRedirect?: boolean;
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const method = (opts.method ?? 'GET').toUpperCase();
  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers };
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    if (typeof FormData !== 'undefined' && opts.body instanceof FormData) {
      body = opts.body;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(opts.body);
    }
  }
  if (isMutating(method)) headers[CSRF_HEADER] = '1';

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), { method, headers, body, credentials: 'include', signal: opts.signal });
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e;
    throw new ApiError(0, 'Unable to reach the CodeGuard API. Check your connection or try again shortly.');
  }

  if (res.status === 401 && !opts.skipAuthRedirect) redirectToLogin();

  const contentType = res.headers.get('content-type') ?? '';
  if (!res.ok) {
    let parsed: unknown = null;
    try {
      parsed = contentType.includes('json') ? await res.json() : await res.text();
    } catch {
      parsed = null;
    }
    throw parseErrorBody(res.status, parsed);
  }
  if (res.status === 204 || (res.status === 202 && !contentType.includes('json'))) return undefined as T;
  if (contentType.includes('json')) {
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
  return (await res.text()) as unknown as T;
}

const get = <T>(path: string, query?: Record<string, QueryValue>, extra?: Omit<RequestOptions, 'query'>) =>
  apiRequest<T>(path, { ...extra, query });
const post = <T>(path: string, body?: unknown, extra?: RequestOptions) => apiRequest<T>(path, { ...extra, method: 'POST', body });
const patch = <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PATCH', body });
const put = <T>(path: string, body?: unknown) => apiRequest<T>(path, { method: 'PUT', body });
const del = <T = void>(path: string) => apiRequest<T>(path, { method: 'DELETE' });

const enc = encodeURIComponent;

/** Normalises list endpoints that may return either an array or `{ items }`. */
export function asArray<T>(v: T[] | { items?: T[]; plans?: T[] } | null | undefined): T[] {
  if (Array.isArray(v)) return v;
  if (v && Array.isArray(v.items)) return v.items;
  if (v && Array.isArray(v.plans)) return v.plans;
  return [];
}

export interface FindingsQuery {
  page?: number;
  pageSize?: number;
  severity?: string;
  category?: string;
  status?: string;
  classification?: string;
  search?: string;
  onlyNew?: 'true' | 'false';
}

/** Typed helpers per endpoint (docs/API_DOCUMENTATION.md). */
export const api = {
  meta: () => get<MetaView>('/meta', undefined, { skipAuthRedirect: true }),
  plans: async () => asArray(await get<PlanView[] | { plans: PlanView[] }>('/plans', undefined, { skipAuthRedirect: true })),

  auth: {
    me: (opts?: { skipAuthRedirect?: boolean }) => get<MeResponse>('/auth/me', undefined, opts),
    login: (input: LoginInput) => post<AuthResponse>('/auth/login', { ...input, client: 'web' }, { skipAuthRedirect: true }),
    register: (input: RegisterInput) => post<AuthResponse>('/auth/register', input, { skipAuthRedirect: true }),
    logout: () => post<void>('/auth/logout', undefined, { skipAuthRedirect: true }),
    requestPasswordReset: (email: string) => post<void>('/auth/password-reset/request', { email }, { skipAuthRedirect: true }),
    confirmPasswordReset: (token: string, password: string) =>
      post<void>('/auth/password-reset/confirm', { token, password }, { skipAuthRedirect: true }),
    githubStartUrl: () => buildUrl('/auth/oauth/github/start'),
  },

  organizations: {
    list: () => get<OrganizationView[]>('/organizations'),
    create: (name: string) => post<OrganizationView>('/organizations', { name }),
    update: (orgId: string, body: { name?: string; retentionDays?: number }) => patch<OrganizationView>(`/organizations/${enc(orgId)}`, body),
    remove: (orgId: string) => del(`/organizations/${enc(orgId)}`),
    members: (orgId: string) => get<MemberView[]>(`/organizations/${enc(orgId)}/members`),
    updateMember: (orgId: string, memberId: string, role: OrgRole) =>
      patch<MemberView>(`/organizations/${enc(orgId)}/members/${enc(memberId)}`, { role }),
    removeMember: (orgId: string, memberId: string) => del(`/organizations/${enc(orgId)}/members/${enc(memberId)}`),
    invitations: (orgId: string) => get<InvitationView[]>(`/organizations/${enc(orgId)}/invitations`),
    invite: (orgId: string, email: string, role: Exclude<OrgRole, 'OWNER'>) =>
      post<InvitationCreatedResponse>(`/organizations/${enc(orgId)}/invitations`, { email, role }),
    revokeInvitation: (orgId: string, id: string) => del(`/organizations/${enc(orgId)}/invitations/${enc(id)}`),
    auditLogs: (orgId: string, page: number) => get<Paginated<AuditLogView>>(`/organizations/${enc(orgId)}/audit-logs`, { page }),
    subscription: (orgId: string) => get<SubscriptionView>(`/organizations/${enc(orgId)}/subscription`),
  },
  acceptInvitation: (token: string) => post<OrganizationView>('/invitations/accept', { token }),

  projects: {
    list: (organizationId: string) => get<ProjectView[]>('/projects', { organizationId }),
    create: (body: { organizationId: string; name: string; description?: string }) => post<ProjectView>('/projects', body),
    get: (id: string) => get<ProjectView>(`/projects/${enc(id)}`),
    update: (id: string, body: { name?: string; description?: string; settings?: ProjectView['settings'] }) =>
      patch<ProjectView>(`/projects/${enc(id)}`, body),
    remove: (id: string) => del(`/projects/${enc(id)}`),
    history: (id: string, page: number, pageSize = 20) => get<Paginated<ScanView>>(`/projects/${enc(id)}/history`, { page, pageSize }),
    findings: (id: string, q: FindingsQuery) =>
      get<Paginated<FindingView>>(`/projects/${enc(id)}/findings`, q as Record<string, QueryValue>),
    branches: (id: string) => get<BranchSummaryView[]>(`/projects/${enc(id)}/branches`),
    schedules: async (id: string) => asArray(await get<ScheduleView[] | { items: ScheduleView[] }>(`/projects/${enc(id)}/schedules`)),
    createSchedule: (id: string, body: { projectSourceId: string; intervalHours: number; enabled: boolean }) =>
      post<ScheduleView>(`/projects/${enc(id)}/schedules`, body),
    deleteSchedule: (scheduleId: string) => del(`/schedules/${enc(scheduleId)}`),
    updateSource: (id: string, sourceId: string, body: { monitorPushes?: boolean; monitorPullRequests?: boolean }) =>
      patch<unknown>(`/projects/${enc(id)}/sources/${enc(sourceId)}`, body),
  },

  sources: {
    inspect: (url: string, organizationId?: string) => post<SourceInspection>('/sources/inspect', { url, organizationId }),
  },

  scans: {
    list: (q: { organizationId?: string; projectId?: string; page?: number; pageSize?: number }) => get<Paginated<ScanView>>('/scans', q),
    url: (body: UrlScanInput) => post<ScanCreatedResponse>('/scans/url', body),
    repository: (body: RepositoryScanInput) => post<ScanCreatedResponse>('/scans/repository', body),
    pullRequest: (body: PullRequestScanInput) => post<ScanCreatedResponse>('/scans/pull-request', body),
    group: (groupId: string) => get<ScanGroupView>(`/scans/groups/${enc(groupId)}`),
    get: (id: string) => get<ScanView>(`/scans/${enc(id)}`),
    status: (id: string) => get<ScanStatusView>(`/scans/${enc(id)}/status`),
    findings: (id: string, q: FindingsQuery) => get<Paginated<FindingView>>(`/scans/${enc(id)}/findings`, q as Record<string, QueryValue>),
    files: (id: string, page: number, status?: string) => get<Paginated<ScanFileView>>(`/scans/${enc(id)}/files`, { page, status }),
    commits: (id: string) => get<CommitView[]>(`/scans/${enc(id)}/commits`),
    compare: (id: string, baseScanId: string) => get<ScanComparisonView>(`/scans/${enc(id)}/compare/${enc(baseScanId)}`),
    reportUrl: (id: string, format: ExportFormat) => buildUrl(`/scans/${enc(id)}/report`, { format }),
    cancel: (id: string) => post<ScanView>(`/scans/${enc(id)}/cancel`),
    rescan: (id: string) => post<ScanCreatedResponse>(`/scans/${enc(id)}/rescan`),
    share: (id: string, expiresInDays: number) => post<ShareResponse>(`/scans/${enc(id)}/share`, { expiresInDays }),
    remove: (id: string) => del(`/scans/${enc(id)}`),
  },

  findings: {
    get: (id: string) => get<FindingDetailView>(`/findings/${enc(id)}`),
    updateStatus: (id: string, body: { status: FindingStatus; note?: string; applyToFuture: boolean }) =>
      patch<FindingView>(`/findings/${enc(id)}/status`, body),
    explain: (id: string) => post<{ aiExplanation: string }>(`/findings/${enc(id)}/explain`),
  },

  integrations: {
    list: (organizationId: string) => get<IntegrationView[]>('/integrations', { organizationId }),
    connect: (providerSlug: string, organizationId: string) =>
      post<{ url: string }>(`/integrations/${enc(providerSlug)}/connect`, { organizationId }),
    disconnect: (connectionId: string) => del(`/integrations/${enc(connectionId)}`),
  },

  notifications: {
    list: (unread?: boolean) => get<NotificationView[]>('/notifications', unread ? { unread: 'true' } : undefined),
    markRead: (id: string) => post<void>(`/notifications/${enc(id)}/read`),
    markAllRead: () => post<void>('/notifications/read-all'),
    preferences: () => get<NotificationPreferences>('/notifications/preferences'),
    savePreferences: (p: NotificationPreferences) => put<NotificationPreferences>('/notifications/preferences', p),
  },

  dashboard: {
    overview: (organizationId: string) => get<DashboardOverview>('/dashboard/overview', { organizationId }),
  },

  admin: {
    overview: () => get<AdminOverview>('/admin/overview'),
    rules: async () => asArray(await get<AdminRuleView[] | { items: AdminRuleView[] }>('/admin/rules')),
    setRule: (id: string, enabled: boolean) => patch<AdminRuleView>(`/admin/rules/${enc(id)}`, { enabled }),
    auditLogs: (page: number) => get<Paginated<AdminAuditLogView>>('/admin/audit-logs', { page }),
    setPlan: (organizationId: string, planKey: string) => patch<unknown>(`/admin/organizations/${enc(organizationId)}/plan`, { planKey }),
  },
};

/** Human-readable message for any thrown value. */
export function errorMessage(e: unknown): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof Error) return e.message;
  return 'Something went wrong.';
}
