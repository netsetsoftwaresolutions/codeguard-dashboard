> This reference was carried over from the original project. Use the repository README for standalone setup and paths.

# CodeGuard Web Dashboard

`apps/web-dashboard` — Next.js 15 (App Router), React 19, TypeScript, Tailwind 3. All data is fetched client-side from the
CodeGuard API (NestJS, MongoDB-backed); the dashboard has no database of its own and builds without the API running.

## Running

```bash
npm install
docker compose -f ../codeguard-api/docker-compose.yml up -d --wait mongo redis                 # MongoDB + Redis for the API (see docker-compose.yml)
(cd ../codeguard-api && npm run dev)                  # API on http://localhost:4000
npm run dev                  # dashboard on http://localhost:3000
```

| Env var | Default | Purpose |
| --- | --- | --- |
| `API_INTERNAL_URL` | `http://localhost:4000` | Where Next.js proxies `/api/*`. Read at build/start time by `next.config.mjs` rewrites. In Docker set it to the API service URL (e.g. `http://api:4000`). |
| `NODE_ENV` | — | `production` drops `'unsafe-eval'`/websocket allowances from the CSP and adds HSTS. |

Other commands (from the repo root):

```bash
npm run typecheck   # tsc --noEmit
npm test        # vitest (jsdom)
npm run build       # next build (output: 'standalone')
```

The production server is `.next/standalone/apps/web-dashboard/server.js` (copy `.next/static` and `public` alongside it as usual for standalone output).

## Architecture

| Path | Role |
| --- | --- |
| `next.config.mjs` | `/api/:path*` → `${API_INTERNAL_URL}/api/:path*` rewrite (session cookie stays first-party), security headers, `output: 'standalone'` |
| `src/lib/api.ts` | Fetch-based API client, typed helper per endpoint, error parsing, 401 handling, CSRF header |
| `src/lib/upload.ts` | Multipart body builder + XHR upload with progress (`/api/scans/upload`) |
| `src/lib/drop.ts` | Drag-and-drop folder traversal (`webkitGetAsEntry`) → files + relative paths |
| `src/lib/findings-filter.ts` | Findings filter state ↔ `FindingsQuerySchema` query; client-side filtering for in-memory lists |
| `src/lib/roles.ts` | Role → permission matrix (mirrors the API docs; UI only hides/disables, the API enforces) |
| `src/lib/validation.ts` | Runs the shared zod schemas from `@codeguard/shared-types` for inline form errors; safe `?next=` handling |
| `src/components/auth.tsx` | `AuthProvider` (`GET /api/auth/me`), organization switcher state (localStorage `codeguard.organizationId`, fallback first org) |
| `src/components/meta.tsx` | `GET /api/meta` → product name (default "CodeGuard"), feature flags, upload limit |
| `src/components/theme.tsx` | Dark (default) / light theme, persisted in localStorage `codeguard.theme`, applied by an inline `<head>` script before paint |
| `src/components/app-shell.tsx` | Sidebar + top bar (org switcher, notification bell with unread count, theme toggle, user menu), mobile drawer |
| `src/components/*` | Findings list/drawer, finding detail, scan report sections, branch table, commit list, comparison view, SVG charts, UI primitives |

Identifiers (organizations, projects, scans, findings, …) are treated as opaque strings. With the MongoDB backend they are
24-character hex ObjectIds, but the dashboard never validates or parses their format.

### Auth & CSRF model

* The API sets an httpOnly `cg_session` cookie on login/register. Because the dashboard proxies `/api/*` through its own
  origin, the cookie is first-party; the client always uses relative `/api/...` URLs with `credentials: 'include'`.
* Every non-GET/HEAD/OPTIONS request (fetch **and** the XHR upload) sends `X-CodeGuard-CSRF: 1`.
* Error bodies `{ statusCode, message, errors }` become an `ApiError` (`status`, `message`, `errors[{path,message}]`); forms render field errors.
* A `401` redirects to `/login?next=<current path>` (except on auth pages and when a public page probes the session with `skipAuthRedirect`).
  `?next=` only accepts same-origin relative paths.
* Role-aware UI: actions the current organization role cannot perform are hidden or disabled. Platform admin (`user.isPlatformAdmin`) unlocks `/admin`.

### Polling

* `/scans/[id]`: `GET /api/scans/:id/status` every 2 s while the scan is non-terminal; full `GET /api/scans/:id` once terminal.
* `/scans/groups/[groupId]`: `GET /api/scans/groups/:groupId` every 2 s while any scan in the group runs.
* Dashboard overview: every 10 s while `scansInProgress > 0`. Notification bell: every 60 s. Admin overview: every 30 s.

### Theming

Tailwind `darkMode: 'class'` with the shared preset `@codeguard/ui/tailwind-preset` (brand/ink palettes; dark background
`#0B1020`). Severity colours come from `@codeguard/ui` (critical red, high orange, medium yellow, low blue, resolved green).
Charts are inline SVG (risk trend line with tooltip and an accessible table; bar lists; score gauge) — no chart library.

### Security headers

CSP `default-src 'self'; script-src 'self' 'unsafe-inline'` (+`'unsafe-eval'` in dev only — Next.js bootstrap and the theme script
are inline), `style-src 'self' 'unsafe-inline'`, `img-src 'self' data: blob:`, `connect-src 'self'`, `frame-ancestors 'none'`,
`object-src 'none'`, `base-uri 'self'`, `form-action 'self'`; plus `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`,
`Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `Cross-Origin-Opener-Policy`, HSTS in production.
External links from scan data are rendered only when they are `http(s)` URLs.

## Page map → API endpoints

| Route | API endpoints |
| --- | --- |
| `/` | `GET /meta`, `GET /plans`, `GET /auth/me` (probe, no redirect) |
| `/login`, `/register` | `POST /auth/login` (`client: "web"`), `POST /auth/register`; GitHub button → `GET /auth/oauth/github/start` only if `features.githubOAuthLogin` |
| `/forgot-password`, `/reset-password?token=` | `POST /auth/password-reset/request`, `POST /auth/password-reset/confirm` |
| `/invite/[token]` | `GET /auth/me`, `POST /invitations/accept` |
| (shell) | `GET /auth/me`, `POST /organizations` (first org), `GET /notifications?unread=true`, `POST /auth/logout` |
| `/dashboard` | `GET /dashboard/overview?organizationId=` |
| `/projects` | `GET /projects?organizationId=` |
| `/projects/new` | `POST /projects` |
| `/projects/[id]` | `GET /projects/:id`; Overview `GET /projects/:id/findings`; History `GET /projects/:id/history`; Branches `GET /projects/:id/branches`; Monitoring `GET/POST /projects/:id/schedules`, `DELETE /schedules/:id`, `PATCH /projects/:id/sources/:sourceId`; Settings `PATCH /projects/:id`, `DELETE /projects/:id` |
| `/scans/new` (+ `/upload`, `/url`, `/repository`) | `POST /scans/upload` (multipart, XHR), `POST /scans/url`, `POST /sources/inspect`, `POST /scans/repository`, `POST /scans/pull-request`, `GET /projects` (target picker) |
| `/scans/[id]` | `GET /scans/:id`, `GET /scans/:id/status`, `GET /scans/:id/findings`, `GET /findings/:id`, `PATCH /findings/:id/status`, `POST /findings/:id/explain`, `GET /scans/:id/files`, `GET /scans/:id/commits`, `GET /projects/:id/history` (compare picker), `GET /scans/:id/report?format=json|csv|pdf`, `POST /scans/:id/share`, `POST /scans/:id/rescan`, `POST /scans/:id/cancel`, `DELETE /scans/:id` |
| `/scans/[id]/commits` | `GET /scans/:id`, `GET /scans/:id/commits` |
| `/scans/[id]/compare?base=` | `GET /scans/:id`, `GET /scans/:base`, `GET /scans/:id/compare/:base` |
| `/scans/groups/[groupId]` | `GET /scans/groups/:groupId`, `GET /projects/:id` (default branch) |
| `/integrations` | `GET /integrations?organizationId=`, `POST /integrations/<github|gitlab|bitbucket|dropbox|google-drive>/connect` (only when `configured`), `DELETE /integrations/:connectionId` |
| `/notifications` | `GET /notifications`, `POST /notifications/:id/read`, `POST /notifications/read-all`, `GET/PUT /notifications/preferences` |
| `/team` | `GET/PATCH/DELETE /organizations/:orgId/members[/:memberId]`, `GET/POST/DELETE /organizations/:orgId/invitations[/:id]`, `GET /organizations/:orgId/audit-logs?page=` |
| `/settings` | `PATCH /organizations/:orgId`, `DELETE /organizations/:orgId`, `POST /organizations`, `POST /auth/logout` |
| `/billing` | `GET /organizations/:orgId/subscription`, `GET /plans` |
| `/admin` | `GET /admin/overview`, `GET /admin/rules`, `PATCH /admin/rules/:id`, `GET /admin/audit-logs?page=`, `PATCH /admin/organizations/:id/plan` |

### Response shapes assumed beyond `packages/shared-types`

| Endpoint | Assumed shape |
| --- | --- |
| `GET /auth/me` | `{ user: UserView, organizations: OrganizationView[] }` |
| `GET /plans` | `PlanDefinition[]` (`key, name, description, monthlyPriceUsd, limits, features`); `{ plans: [...] }` / `{ items }` also accepted |
| `GET /projects/:id/schedules` | `{ id, projectSourceId, intervalHours, enabled, nextRunAt?, lastRunAt? }[]` (or `{ items }`) |
| `GET/PUT /notifications/preferences` | `{ emailEnabled, inAppEnabled, minSeverity }` |
| `GET /findings/:id` | `FindingView & { evidence?: {kind, content, startLine}[], vulnerableRange?, metadata?.vulnerableRange? }` |
| `GET /scans/:id/status` | `{ id, status, stage, progress, errorMessage }` |
| `GET /admin/rules` | `{ id, enabled, ruleId?, title?/name?, category?, severity? }[]` (or `{ items }`) |
| `GET /admin/audit-logs` | `Paginated<AuditLogView & { organizationId? }>` |
| OAuth / integration callbacks | Redirect back to `/integrations` (optionally `?status=`/`?error=`) and `/dashboard` (login); `/login?error=` shows a generic failure |

## Feature status

| Area | Status | Notes |
| --- | --- | --- |
| Landing page (scans, how it works incl. extension, honesty statement, plans, CTA) | Implemented | Plans from `GET /api/plans` |
| Login / register / forgot / reset password, GitHub OAuth button | Implemented | OAuth button only when `features.githubOAuthLogin` |
| App shell: org switcher, notifications bell, user menu, theme toggle, mobile nav | Implemented | |
| Dashboard (stats, severity bars, 30-day SVG risk trend, top-risk projects, recent/in-progress scans, quick actions) | Implemented | |
| Projects list / create / detail tabs (overview, history + compare, branches, monitoring, settings, delete) | Implemented | |
| Upload scan (files, folder with `relativePaths`, archive, drag & drop incl. folders, size limit, progress, cancel) | Implemented | |
| URL scan (live `parseSourceUrl` preview, inspect) | Implemented | |
| Repository scan (ref / specific branches / all branches, path, history depth, AI opt-in, PR URLs) | Implemented | |
| Scan progress timeline + cancel; security report (summary, risk components, coverage & limitations, findings, detail drawer, triage, AI explanation, exports, share, rescan, delete) | Implemented | |
| Files, commits, compare tabs; commit investigation page; comparison page | Implemented | |
| Pull-request analysis header and "only new" filter | Implemented | Counts via `GET /scans/:id/findings?onlyNew=true` |
| Branch comparison (`/scans/groups/[groupId]`) with highlighting | Partial | `BranchSummaryView` has no default-branch flag; uses the project source's `defaultBranch`, else `main`/`master`/`develop`/`trunk` |
| Integrations, notifications (+ preferences), team (+ invites, audit log), settings, billing | Implemented | Retention days input is write-only (current value isn't in `OrganizationView`) |
| Platform admin (totals, by source/status, failed scans, queue, worker heartbeat staleness >60 s, engine versions, ruleset + rules toggle, plan assignment, audit log) | Partial | Plan assignment takes an organization ID typed by the admin (no admin org listing endpoint exists) |
| Public shared-report page | Not implemented | Not required; share links require sign-in |
| Online payments | Not implemented | Billing notice shown when `billingEnabled` is false |
| End-to-end tests against a live API | Not implemented | Unit/component tests only (`apps/web-dashboard/test`) |
