# ADR-0003: Adopt Alchemy for the Cloudflare deployment and remove Wrangler

## Status

Accepted

## Date

2026-08-10

## Context

The Leenk Worker, the `leenk-static` R2 bucket, and the Analytics Engine
datasets were created and managed with Wrangler. The owner dashboard needs
an infrastructure-as-code home for the Worker, its bindings, the CMS D1
database, and the Cloudflare Access boundary, and the repository should stop
depending on Wrangler.

Research verified Alchemy `2.0.0-beta.70` as the current release and exposed
one package mismatch: the Alchemy Astro guide still names
`@alchemy.run/cloudflare-frameworks` as the build integration, but that
package publishes only `0.0.0`. The published Alchemy package loads its Astro
integration from `@distilled.cloud/astro`, which publishes a real integration
(`0.17.1` at the time of this decision).

## Decision

Migrate the deployment to Alchemy with the `Cloudflare.Website.Astro`
resource in `alchemy.run.ts`, and remove Wrangler from the repository.

- Install `alchemy@2.0.0-beta.70` and `@distilled.cloud/astro@0.17.1` as
  devDependencies. The guide package `@alchemy.run/cloudflare-frameworks` is
  not used; the mismatch is documented in the migration research.
- Pin the Effect ecosystem at `4.0.0-beta.103`: `effect`,
  `@effect/platform-bun`, `@effect/platform-node`,
  `@effect/platform-node-shared`, `@effect/sql-d1`, `@effect/sql-sqlite-do`,
  and `@effect/vitest`. The `@distilled.cloud` packages use
  `Schema.TaggedErrorClass`, which exists through beta.103 and was removed in
  beta.104. Beta.106 (the latest) crashes both the adapter and the Alchemy
  CLI, and patching thousands of vendored call sites is not viable.
- Keep the canonical `astro.config.ts` adapter-free: Alchemy injects the
  adapter programmatically and rejects a user-declared adapter. Add
  `astro.config.local.ts`, which adds `distilledCloudflare()` from
  `@distilled.cloud/astro/cloudflare` so `bun run build` and CI verify the
  real server output without Wrangler. Both files stay in sync manually.
- The stack declares two stages, mirroring the two named Environments:
  `dev` deploys an isolated `dev-leenk` Worker on workers.dev (covered by the
  existing `*-leenk.yusoofsh.workers.dev` Access application) and a separate
  `leenk-cms-dev` D1 database; `prod` deploys the adopted `leenk` Worker
  behind `www.yusoofsh.id`, the `leenk-cms` D1 database, and two new Access
  applications for `/dashboard` and `/api/dashboard`.
- Physical names are pinned exactly: R2 bucket `leenk-static`, Analytics
  Engine datasets `leenk_shortlinks` and `leenk_site_events`. The plan must
  never show a second bucket, a renamed dataset, or a Worker replacement.
  Adoption happens per stage after plan review; broad `--adopt` is never
  used.
- Secrets and configuration arrive through the deploy environment:
  `STATIC_UPLOAD_TOKEN` (required Worker secret), `CLOUDFLARE_ACCOUNT_ID`
  (plain value), and `CLOUDFLARE_ANALYTICS_TOKEN` (optional Worker secret for
  the dashboard's Analytics Engine SQL reads). No token values are
  committed.
- Deployment scripts replace Wrangler: `bun run deploy` targets the
  Development stage and `bun run deploy:prod` targets Production. The
  `types:check` script is removed; `worker-configuration.d.ts` is
  source-owned and kept in sync with the stack.
- A GitHub Actions `deploy.yml` runs the verification suite, then deploys
  the Development stage on `main` pushes and supports a manual Production
  deploy behind a protected `production` environment.

## Alternatives considered

### Keep Wrangler for deployment

Rejected. The dashboard needs declarative D1, Access, and Worker resources
in one stack, and the user requirement is a Wrangler-free repository.

### Pin Effect to a beta older than 103

Rejected after testing. Beta.102 loads the adapter, but the
`@effect/platform-*` line publishes `@effect/platform-node-shared` only from
beta.106, whose Effect peer requires beta.106, so a 102-pinned tree cannot be
consistent. Beta.103 is the newest line whose whole family exists and still
exports `Schema.TaggedErrorClass`.

### Patch the vendored SDK to stop using `TaggedErrorClass`

Rejected. The API appears in more than twenty thousand call sites across the
`@distilled.cloud` packages; a durable patch would be a fork, not a pin.

## Consequences

- The repository deploys through Alchemy and Bun only; Wrangler is absent
  from `package.json`, `wrangler.jsonc` is deleted, and stale Wrangler
  references are removed from scripts and docs.
- The Effect pins are beta versions and must be revisited when the
  `@distilled.cloud` packages or Alchemy publish a build compatible with a
  newer Effect line.
- `dev` and `prod` are the only stages. The Development stage shares the
  adopted R2 bucket and Analytics Engine datasets with Production (they are
  account-level physical resources), so Development previews read and write
  the same objects. The D1 databases and Workers are stage-isolated.
- The existing `leenk - preview` Access application remains unmanaged by
  Alchemy. The new dashboard and dashboard API Access applications are
  created only for the Production stage.
- The live Worker keeps its existing SESSION KV namespace; Alchemy
  auto-provisions a new SESSION namespace for the adopted Worker, which is
  safe because session data is ephemeral.
- Production rollout still requires the plan review, adoption confirmation,
  R2 object inventory, dataset smoke queries, and the fresh approval gate
  documented in the migration research before the first `deploy:prod`.

## Access management moved to the Cloudflare CLI (2026-08-10)

The first Production deploy failed on the Access resources: the Alchemy
profile's OAuth scopes do not include Access read/write, so `OwnerPolicy`,
`DashboardApp`, and `DashboardApiApp` cannot be managed from the stack. The
policy (`Allow Owner`, email include) and the two applications
(`www.yusoofsh.id/dashboard` and `www.yusoofsh.id/api/dashboard`) were
created through the Cloudflare CLI instead and are now verified live.

The Access resources were removed from `alchemy.run.ts` so deploys stay
green. Access is managed through the Cloudflare CLI until the Alchemy
profile is re-authenticated with Access permissions; if that happens, the
resources can move back into the stack with adoption.

## Dashboard authentication moved to worker Basic auth (2026-08-10)

The Access email one-time PIN flow could not deliver codes to the operator's
iCloud-hosted mailbox, and the account had no other identity provider. The
dashboard boundary was replaced with HTTP Basic authentication enforced in
`src/middleware.ts` against the already-bound `STATIC_UPLOAD_TOKEN` Worker
secret: no email delivery, no identity provider, constant-time comparison,
`Cache-Control: no-store`, and a `401` challenge for `/dashboard` and
`/api/dashboard`. The two dashboard Access applications and the `Allow
Owner` policy were deleted through the Cloudflare CLI. The `leenk - preview`
application on workers.dev remains untouched.

## Incident note (2026-08-10)

`alchemy destroy --stage dev` deleted the adopted `leenk-static` R2 bucket
alongside the Development stage resources. Alchemy treats adopted resources
as stack-owned once adopted, so destroy removes their physical cloud
resources, not just the state rows. The static files and shortlink records
were lost; the bucket was recreated and the 31 shared files were re-uploaded
from `~/.agent/diagrams`, with 31 new labeled shortlinks allocated.

Rule for this repository: never run `alchemy destroy` for a stage that has
adopted resources, and never use destroy as a rollback. The Production stage
is permanent and only ever moves forward through `deploy`.

## Addendum (2026-08-25): Bun replaces Nub and Node.js

Local install, scripts, and CI use Bun 1.4.0 (current stable) and `bun.lock`.
`bun run deploy` and `bun run deploy:prod` still call Alchemy. Wrangler stays
out. The Worker `nodejs_compat` flag is unchanged and is not a local Node.js
requirement. ScriptC still needs the `typescript@7.0.2` fifo patch documented
in ADR-0005 until Bun exposes child-process pipe fds.

## Update (2026-08-26): one astro.config.ts with a local-adapter flag

The two-config split (`astro.config.ts` adapter-free, `astro.config.local.ts`
adding `distilledCloudflare()`) was consolidated into a single
`astro.config.ts`. This removes the manual "keep both files in sync" burden and
fixes an asymmetry where `bun run dev` used the adapter-free config and returned
`500 Cannot find module 'cloudflare:workers'` on every route importing it.

The config now adds the Cloudflare adapter only when `LEENK_LOCAL_ADAPTER=1`.
`bun run dev` and `bun run build` set that variable; `alchemy deploy` and
`alchemy plan` leave it unset, so the file Alchemy loads stays adapter-free and
its programmatic adapter injection is never rejected. The original decision to
keep a user-declared adapter out of the deploy path is unchanged; only the file
layout that enforces it is simpler.
