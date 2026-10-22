# CodeGuard Web Dashboard

Next.js dashboard for accounts, organizations, projects, source uploads, repository scans, reports,
triage, comparisons, integrations, notifications, teams, plans and administration.

```bash
npm ci
cp .env.example .env
npm run dev
```

Open http://localhost:3000. Set `API_INTERNAL_URL` to the API address (default
`http://localhost:4000`). Next.js proxies `/api/*`, keeping session cookies on the dashboard origin.
The API and scanner must be running to create scans and receive results.

```bash
npm run typecheck
npm test
npm run build
npm start
```

## Repository structure

This is an independent repository: no workspace, private npm package, sibling checkout, or
`@codeguard/*` dependency is required. API models and validation live in `src/contracts` as ordinary
local source files. Each frontend owns its UI components in `src/components/primitives`.

The four repositories are:
- https://github.com/netsetsoftwaresolutions/codeguard-extension
- https://github.com/netsetsoftwaresolutions/codeguard-dashboard
- https://github.com/netsetsoftwaresolutions/codeguard-api
- https://github.com/netsetsoftwaresolutions/codeguard-scanner

## Service compatibility

This initial split preserves the existing runtime protocol. The extension and dashboard call the
API over HTTP. The API queues jobs in Redis/BullMQ; the scanner consumes them and writes progress,
findings and reports to MongoDB. Both backend repositories currently own a local copy of the Prisma
schema, queue types, storage helpers, settings and rules needed for their responsibilities. There is
no shared package dependency. Changes to the queue contract or database schema must be coordinated
across the two backend repositories. API-only database ownership via internal scanner endpoints is
a future refactor, not part of this source split.

For local development, the API and scanner must use the same `DATABASE_URL`, `REDIS_URL`,
`CREDENTIALS_ENCRYPTION_KEY`, and uploaded-file storage. Set `STORAGE_LOCAL_DIR` in both to the same
absolute directory, or configure both for the same S3 bucket. On separate machines use S3 or a
shared mounted directory. Do not run an API production worker against an unrelated database.

## Configuration

Use Node.js 22 (`nvm use`) and npm 10 or newer. Commit only `.env.example`; keep credentials in local `.env`
or your deployment's secret configuration. AI, SMTP and provider OAuth are optional. Subscription
entitlements are implemented; online payment processing is not connected.

## CI template

`infrastructure/github-actions/ci.yml` is an inactive GitHub Actions template. The upload credential
does not have GitHub's `workflow` permission, so it cannot publish active workflows. To enable CI,
use an appropriately authorized credential and move this file to `.github/workflows/ci.yml`.

## Server deployment

See the [server deployment guide](https://github.com/netsetsoftwaresolutions/codeguard-api/blob/main/deployment/README.md) for Ubuntu, Docker Compose, HTTPS, MongoDB Atlas, environment configuration, updates, backups, and extension distribution.
