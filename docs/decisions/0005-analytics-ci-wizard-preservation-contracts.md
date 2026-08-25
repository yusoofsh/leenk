# ADR-0005: Analytics, delivery, setup, and migration preservation contracts

## Status

Accepted

## Date

2026-08-13

## Context

Issues #32, #33, #34, and #38 asked for the contracts that were still
implicit across the analytics research, Alchemy stack, GitHub workflows, and
runtime compatibility notes. The repository already has working local
reports, a Bun-only verification path, and an Alchemy deployment stack. The
remaining risk was contract drift: a dashboard could promise data that the
Worker cannot query, CI could own credentials in two places, a setup wizard
could perform a production action, or an Alchemy adoption could replace an
existing resource.

Current source and tests are authoritative. Cloudflare account state and
production parity are separate verification gates; repository documentation
cannot prove them.

## Decision

### Analytics query and retention contract (#32)

- The dashboard exposes named, server-side analytics reports only. Clients
  cannot provide SQL, GraphQL, dataset names, columns, `FORMAT`, or an
  arbitrary filter.
- The supported datasets are `leenk_shortlinks` and `leenk_site_events`.
  Legacy code-indexed shortlink rows remain in `leenk_shortlinks` and are
  reported through the explicit history view. No `leenk_shortlinks_v2`
  dataset is part of the final contract.
- Reports use a 30-day default range and a 90-day maximum range. Counts use
  `SUM(_sample_interval * double1)` and are labelled as sampled Analytics
  Engine counts. The documented three-month Analytics Engine retention is an
  upper bound, not an all-time history promise.
- The Worker uses a scoped `Account Analytics Read` token and a non-secret
  account ID. Neither value reaches browser code or dashboard responses.
- Cloudflare Web Analytics and Workers Logs or Traces remain link-outs until
  a separate supported, scoped query integration is approved. The dashboard
  must not scrape their private dashboards or call the Web Analytics beacon.
- Instrumentation keeps the existing privacy rules: allowlisted event names,
  bounded dimensions, referrer origins only, and no email addresses, account
  names, IP addresses, request bodies, full URLs, messages, or stack traces.

### CI deployment and secret ownership (#33)

- Bun and `bun.lock` are the only package-manager path. Pull requests and
  pushes to `main` run `bun install --frozen-lockfile`, `bun run verify`, and
  the high-severity dependency audit.
- Deployment is a separate, manual `workflow_dispatch` action. The selected
  stage is `dev` or `prod`; `prod` uses the protected GitHub `production`
  environment. A push to `main` does not deploy by itself.
- GitHub Actions environment secrets provide deployment inputs:
  `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `BETTER_AUTH_SECRET`,
  `STATIC_UPLOAD_TOKEN`, and optional `CLOUDFLARE_ANALYTICS_TOKEN`.
  Secret values are never committed, printed, or passed to browser code.
- Alchemy owns the Worker bindings and redacted runtime secret delivery.
  GitHub owns CI secret storage and environment approval. The existing
  `STATIC_UPLOAD_TOKEN` remains the machine-client credential; Better Auth
  owns dashboard sessions.
- A deployment is authorized only after the plan and verification gates for
  that stage pass. Production deployment remains a fresh approval boundary.

### Human-only setup and wizard boundary (#34)

- A repeatable setup wizard may guide a human through obtaining the
  Cloudflare API token and account ID, configuring Alchemy state access,
  creating the Development and protected Production GitHub environments, and
  storing the exact CI secret names above. Secret entry must be hidden and
  values must be written only to their approved destination.
- The wizard may also guide the one-time Better Auth owner bootstrap, but it
  must never print the upload token or password.
- The wizard must stop before deployment, Alchemy adoption, resource
  replacement, database migration, production cutover, credential rotation,
  or any Cloudflare Access policy change. Each action needs its own approval
  and read-back evidence.
- Cloudflare Access is not a current dashboard dependency. Better Auth
  sessions are the active dashboard boundary, so no Access-creation wizard is
  required. A future Access change remains a separate security-gated task.
- No durable wizard is added until the exact current Cloudflare and GitHub UI
  steps are verified. A temporary operator-run checklist is safer than a
  script that invents provider UI or silently performs a gated action.

### Migration preservation and compatibility contract (#38)

The Alchemy-only migration must preserve these identities and observable
behaviours:

- Worker identity and public host: the adopted `leenk` Worker and
  `www.yusoofsh.id`, plus the existing public route shapes.
- R2: physical bucket `leenk-static`; object keys for static files and
  `__shortlinks/<code>` records; public `GET` and `HEAD`; authenticated
  mutation paths; and the 100 MiB upload ceiling with required
  `Content-Length`.
- Expiry: default 14-day logical expiry, `never`, `expiresAt` custom metadata,
  `X-Static-Expires-At`, `410 Gone` after expiry, `Cache-Control: no-store`
  for expired reads, and no automatic physical deletion by lifecycle rules.
- Shortlinks: collision-safe base62 allocation, existing API and CLI command
  shapes, bearer-token mutation compatibility, target validation, campaign
  fields, and redirect status and headers.
- Analytics: exact dataset names `leenk_shortlinks` and
  `leenk_site_events`, both current row layouts, legacy query compatibility,
  field order, allowlists, bounded dimensions, best-effort writes, and the
  three-month retention limit.
- Dashboard and CMS: D1 remains the source for content revisions and
  Activity Entries; R2 remains the source for Assets. Better Auth tables and
  sessions remain separate from the R2 and shortlink namespaces.

Before a production approval, the Development Environment must provide a
plan with no replacement or destructive operation, route and API smoke tests,
an R2 object and metadata comparison, Analytics Engine before/after queries,
CLI compatibility checks, expiry and `410` checks, and a tested forward-only
rollback procedure. `alchemy destroy` and forced replacement are never
rollback actions for an adopted resource.

## Consequences

- The current source, tests, README, and dashboard research can be checked
  against one compact contract instead of inferring policy from issue text.
- Analytics reports remain truthful and privacy-bounded, but the dashboard
  does not promise Web Analytics, logs, traces, or all-time history.
- CI can verify every change without granting automatic production deploy
  authority. Human setup remains explicit and auditable.
- Cloudflare account verification, Development parity, and production
  cutover remain open gates. This ADR does not claim those external checks
  have passed.

## References

- [Analytics data-access research](../research/2026-08-09-dashboard-analytics-data-access.md)
- [Runtime invariants](../research/2026-08-09-leenk-runtime-invariants.md)
- [Alchemy migration ADR](0003-alchemy-cloudflare-migration.md)
- [Better Auth ADR](0004-better-auth-operator-access.md)
- `.github/workflows/ci.yml`
- `.github/workflows/deploy.yml`
- `alchemy.run.ts`

## Addendum (2026-08-25): GraphQL dataset volume

Named GraphQL Analytics reports are now part of the analytics contract, with
the same privacy and client-input rules as SQL reports.

- Clients still cannot provide a GraphQL document, dataset name, or filter.
  The only GraphQL report is `GET /api/dashboard/analytics/volume`.
- The query is fixed to `workersAnalyticsEngineAdaptiveGroups` for
  `leenk_shortlinks` and `leenk_site_events`. The node can return Adaptive
  Groups `count` by dataset and day. It cannot replace SQL for labels,
  campaigns, or engagement dimensions.
- Web Analytics RUM GraphQL nodes and Workers Logs or traces remain
  link-outs.
- A missing or disabled node is a documented empty report, not a fake series.

## Addendum (2026-08-25): Bun package manager

CI and local verification use Bun 1.4.0 and `bun.lock`. The previous Nub and
Node.js toolchain is retired. `bun audit --audit-level=high` remains the
high-severity audit.

`extract-zip` has no upstream patched release for GHSA-jmr9-qjv8-65gv
(symlink targets were not checked). A local copy at `vendor/extract-zip`
(version 2.0.2) overrides the 2.0.1 that `@puppeteer/browsers` pulls in.
The override rejects symlink targets outside the destination and refuses
to write through an existing symlink leaf. Drop the vendor copy if npm
ever publishes a fixed `extract-zip`.

ScriptC coverage and native CLI builds spawn TypeScript 7's sync RPC. Bun
1.4.0 leaves `stdout._handle.fd` unset on child pipes, so `typescript@7.0.2`
is patched to talk over POSIX fifos instead of Node internals. Drop that
patch only after Bun ships oven-sh/bun#39760 or equivalent.
