# Dashboard implementation

Status: implemented for the owner console described in
`docs/dashboard-design-spec.md`, the data rules in
`docs/research/2026-08-09-dashboard-analytics-data-access.md`, and the CMS
model in `docs/decisions/0002-d1-content-revisions-and-publishing.md`.

## What was built

The dashboard is a server-rendered Astro page at `/dashboard` that mounts a
React shell and nine module views, all backed by server-only API routes that
share the same Better Auth session and capability boundary.

### Page shell

- `src/pages/dashboard/index.astro` renders the shell behind the owner-only
  Access boundary, adds a skip link, and imports the shadcn sidebar layout.
- `src/components/dashboard/dashboard-shell.tsx` implements the
  `SidebarProvider` layout with the Workspace and System groups, a breadcrumb
  header, an environment select (Development Environment / Production
  Environment, persisted in localStorage, defaulting to Development), a theme
  dropdown backed by the existing theme store, and an operator dropdown with
  an avatar. Active nav items carry `aria-current="page"`.
- The shell uses hash routing so each module can be deep-linked and keeps the
  module switching purely client-side.

### Modules

- Overview: weighted shortlink and site event KPI cards, a focus queue from
  recent activity, and a recent changes table. Every count is labeled as a
  weighted Analytics Engine count with the selected range.
- Content: revision table with state badges, a read-only published preview
  with full/TL;DR tabs, a draft editor sheet with block list editing, Save
  Draft with optimistic concurrency, a publish confirm dialog, and a rollback
  dialog that clones an archived revision into a new draft. Sonner toasts
  surface results and the stale-draft conflict.
- Files: R2 object table with upload wired to the existing upload API and
  delete through a typed confirm dialog.
- Shortlinks: record table with label, code, target kind, campaign, expiry,
  and a recent clicks column; create and delete dialogs use the existing
  shortlink API.
- Campaigns: ranked campaign/source/medium breakdown with a bar chart and a
  table, sourced from the campaign report.
- Analytics: tabs for Shortlinks, Site events, and Historical (legacy
  code-indexed) reports, a 7/30/90-day range selector, charts, ranked tables,
  and link-outs to Cloudflare Web Analytics and Workers Observability.
- Activity: keyset-paged D1 activity entries with kind badges.
- Operations: read-only binding health cards for the renderer, R2, D1, and
  Analytics Engine, plus Cloudflare dashboard link-outs.
- Settings: operator preferences (environment, default analytics range, write
  token). The write token is held in memory for the session and is never
  written to disk or local storage.

Every module runs its own data hook, so a failing report or binding shows an
inline error with Retry and never tears down the rest of the page.

### Server API routes

Read routes return `Cache-Control: private, max-age=60,
stale-while-revalidate=300`; mutations use `no-store`. Browser mutations use
the Better Auth session and require a same-origin `Origin` or `Referer` signal.
Machine clients use the `Authorization: Bearer` upload-token path. The token
is never sent to browser code or stored in local storage.

| Route                                         | Method | Purpose                                                 |
| --------------------------------------------- | ------ | ------------------------------------------------------- |
| `/api/dashboard/analytics/shortlinks`         | GET    | shortlink clicks by day and label in `leenk_shortlinks` |
| `/api/dashboard/analytics/site-events`        | GET    | site events by day, event, dimension                    |
| `/api/dashboard/analytics/shortlinks/history` | GET    | legacy `leenk_shortlinks` code-indexed report           |
| `/api/dashboard/analytics/campaigns`          | GET    | campaign, source, medium breakdown                      |
| `/api/dashboard/shortlinks`                   | GET    | R2 shortlink records with recent clicks                 |
| `/api/dashboard/files`                        | GET    | R2 object listing                                       |
| `/api/dashboard/cms`                          | GET    | document, published revision, revision summaries        |
| `/api/dashboard/cms/revisions/:id`            | GET    | one revision with blocks                                |
| `/api/dashboard/cms/drafts`                   | POST   | save a draft with optimistic concurrency                |
| `/api/dashboard/cms/publish`                  | POST   | atomic publish                                          |
| `/api/dashboard/cms/rollback`                 | POST   | clone an archived revision into a draft                 |
| `/api/dashboard/activity`                     | GET    | paged activity entries                                  |

All date inputs are validated to `YYYY-MM-DD`, `start < end`, a 30-day
default, and a 90-day maximum. Analytics queries use the documented UTC
`toDateTime` literals and weighted `SUM(_sample_interval * double1)` counts.
Upstream errors are never echoed; the client only ever sees normalized typed
JSON with a `source`, `range`, and `sampled` marker.

## Data sources

- Analytics Engine: `leenk_shortlinks` (single dataset, legacy rows included)
  and `leenk_site_events`, queried through the account-scoped SQL API with the
  `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_ANALYTICS_TOKEN` bindings.
- R2: the `STATIC_FILES` bucket holds static objects and shortlink records
  under the `__shortlinks/` prefix.
- D1: the `CMS` binding holds the Content Document, Content Revisions,
  Content Blocks, and Activity Entries per the canonical schema in
  `d1/migrations/0001_init.sql`.
- Cloudflare Web Analytics and Workers Observability are linked out to rather
  than queried, per the research rules.

## How to run

```bash
nub install --frozen-lockfile
nub run dev
```

Open `/dashboard`. Reads use the environment select in the header; the write
token is entered in Settings under the Write token tab and is held in memory.

## What is intentionally not implemented

- Web Analytics RUM and Workers Logs or Traces are not queried; the dashboard
  links to those products instead, because neither has a supported
  first-release data path from the Worker.
- GraphQL analytics are not wired in; that is a separate future integration
  after checking the live schema and account entitlements.
- There are no user, billing, team, or automation surfaces; the module list
  is fixed at the nine modules in the spec.
- Autosave for drafts is not implemented per ADR-0002; Save Draft is explicit.
- There is no hard-delete for revisions or activity entries per ADR-0002.
- The environment selector is an operator preference, not a data source
  switch; Development and Production stages share the account-level R2 bucket
  and Analytics Engine datasets.
- The D1 binding and Analytics Engine tokens are runtime configuration and
  are deliberately not present in this repository.

## Verification

```text
$ nub run check
$ tsc --noEmit

(no errors)

$ nub run lint
$ oxlint --type-aware --deny-warnings .

(no errors)

$ nub run test
 Test Files  13 passed (13)
      Tests  129 passed (129)

$ nub run format:check
(oxfmt reports formatting issues only in AGENTS.md and
docs/research/2026-08-09-alchemy-cloudflare-migration.md, which are owned by
the Alchemy migration workstream and were already unformatted in the shared
worktree. All dashboard files pass.)

$ nub run build
 [build] ✓ Completed in 1.56s.
 [build] Server built in 1.64s
 [build] Complete!
```

The production build emits a warning that some chunks exceed 500 kB after
minification. That is expected for a dashboard bundle that includes recharts
and the shadcn sidebar tree and does not affect correctness.
