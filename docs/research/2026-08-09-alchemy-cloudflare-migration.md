# Alchemy Cloudflare migration research

Date: 2026-08-09

Ticket: [Verify Alchemy's current Cloudflare resource model and migration primitives](https://github.com/yusoofsh/leenk/issues/27)

Scope: verify the Alchemy model for adopting Leenk's Cloudflare deployment, preserve the existing R2 and Analytics Engine data, define the staging and rollback path, and identify the changes needed for the future `/dashboard`.

## Executive answer

Alchemy can own the Astro Worker and the Cloudflare resources needed by the requested dashboard. The safe path is to declare stable physical names, use an isolated Alchemy stage first, inspect the plan for replacements, and run data and route smoke tests before production approval.

The final repository should not use Wrangler. Wrangler can be present only as
migration evidence while the Alchemy stage is being verified. The final
deployment and type-generation path should use Alchemy and Bun.

The current package and documentation have a package-name mismatch. The Alchemy `2.0.0-beta.70` published package describes the Astro adapter as `@distilled.cloud/astro` and carries `@distilled.cloud/astro` `0.13.7` in its package metadata. The current Alchemy Astro guide instructs users to install `@alchemy.run/cloudflare-frameworks`; its npm package currently publishes only `0.0.0`. The migration must resolve this mismatch in a non-production stage before the dependency choice is locked.

## Verified facts

### Versions and package identity

- The npm registry reports `alchemy` version `2.0.0-beta.70` as both the `latest` and `next` dist-tag. The package metadata was modified on 2026-08-06. [Published `alchemy` metadata](https://registry.npmjs.org/alchemy)
- The published `alchemy@2.0.0-beta.70` package identifies its repository as `https://github.com/alchemy-run/alchemy`, exposes the `alchemy` CLI binary, and depends on `@distilled.cloud/cloudflare` `1.0.0-rc.2`, `@distilled.cloud/cloudflare-runtime` `0.16.1`, and `@distilled.cloud/cloudflare-vite-plugin` `0.16.1`. [Versioned package metadata](https://registry.npmjs.org/alchemy/2.0.0-beta.70)
- The versioned package's `Cloudflare.Website.Astro` declaration documents `@distilled.cloud/astro` as the build package. [Published `Astro.d.ts` source](https://registry.npmjs.org/alchemy/-/alchemy-2.0.0-beta.70.tgz)
- The current Alchemy Astro guide instead declares `devDeps = "@alchemy.run/cloudflare-frameworks"` and tells users to install that package. [Alchemy Astro guide](https://alchemy.run/cloudflare/frontend/astro/), [Astro guide source](https://github.com/alchemy-run/alchemy/blob/main/website/src/content/docs/cloudflare/frontend/astro.mdx)
- The npm registry reports `@distilled.cloud/astro` `0.17.1` as latest and `@alchemy.run/cloudflare-frameworks` `0.0.0` as latest. [Published `@distilled.cloud/astro` metadata](https://registry.npmjs.org/@distilled.cloud%2fastro), [published `@alchemy.run/cloudflare-frameworks` metadata](https://registry.npmjs.org/@alchemy.run%2fcloudflare-frameworks)

The source/package mismatch is material. Do not change the repository dependency or deploy the first stack until a staging install proves that the chosen package exports the Astro integration expected by `Cloudflare.Website.Astro`.

### Astro Worker resource

- `Cloudflare.Website.Astro` is a server-rendered Astro Worker integration. It builds the Astro project, runs server-rendered pages in the Worker, and deploys prerendered pages and client assets as static assets. The integration is designed to be Wrangler-free. [Astro guide](https://alchemy.run/cloudflare/frontend/astro/)
- The published `AstroProps` type extends `WorkerProps` while omitting the Worker `vite`, `main`, `assets`, `source`, `script`, and `bundle` fields. It exposes the `astro` options `site`, `base`, `output`, `srcDir`, `publicDir`, `outDir`, and `trailingSlash`. [Published `Astro.d.ts` source](https://registry.npmjs.org/alchemy/-/alchemy-2.0.0-beta.70.tgz)
- `astro.output` defaults to `"server"`; `astro.output = "static"` produces an assets-only deployment. The published type documentation says the Worker compatibility flag `nodejs_compat` is always included for the server runtime. [Published `Astro.d.ts` source](https://registry.npmjs.org/alchemy/-/alchemy-2.0.0-beta.70.tgz)
- Astro code can read bindings through `Astro.locals.runtime.env` or `cloudflare:workers`. The guide shows `Cloudflare.InferEnv<typeof Website>` for `App.Locals` typing. [Astro guide](https://alchemy.run/cloudflare/frontend/astro/)
- The Worker props inherited by Astro include `env`, `domain`, and `routes`. `domain` accepts a string, a `{ name, aliases?, redirects? }` object, or `null`. `routes` accepts `{ pattern, zoneId?, zoneName?, zone? }` entries. [Published `Worker.d.ts` source](https://registry.npmjs.org/alchemy/-/alchemy-2.0.0-beta.70.tgz)
- A custom Worker domain requires a Cloudflare zone that already exists. A route pattern can use a zone name, zone ID, or zone reference. [Published `Worker.d.ts` source](https://registry.npmjs.org/alchemy/-/alchemy-2.0.0-beta.70.tgz)
- Astro sessions auto-provision a KV namespace under `SESSION` unless a binding is supplied or `sessionKVBindingName: false` is set. [Astro guide](https://alchemy.run/cloudflare/frontend/astro/), [published `Astro.d.ts` source](https://registry.npmjs.org/alchemy/-/alchemy-2.0.0-beta.70.tgz)

For Leenk, the intended declaration is one `Cloudflare.Website.Astro` resource with the existing R2 and Analytics Engine bindings. The domain and any zone route must be declared only after the live route and DNS inventory is confirmed.

### Existing R2 static bucket

- The repository currently declares R2 binding `STATIC_FILES` with physical bucket name `leenk-static` in `wrangler.jsonc`. The Worker uses that binding for static files and shortlinks. This is local repository evidence, not an Alchemy claim.
- Alchemy's R2 resource is `Cloudflare.R2.Bucket`. Its `name` property sets the physical bucket name; the resource also supports custom domains, lifecycle rules, and CORS. [R2 guide](https://alchemy.run/cloudflare/data/r2/), [published `Bucket.d.ts` source](https://registry.npmjs.org/alchemy/-/alchemy-2.0.0-beta.70.tgz)
- Alchemy recovers an existing resource from a fresh state store when the provider can prove that the resource belongs to the same stack, stage, and logical ID. A foreign resource returns `OwnedBySomeoneElse` unless the deploy uses `--adopt`. [Adopting resources guide](https://alchemy.run/cli/adopting-resources/)
- The v1-to-v2 migration guide requires explicit physical `name` values because the v1 and v2 default names differ. It says `--adopt` takes over an existing resource by physical name and recommends testing on a non-production stage first. [Migration guide](https://alchemy.run/migrating-from-v1/)
- Alchemy's rename operation moves a state row while preserving the instance ID and physical resource. It does not convert a resource row to a different resource type. [Renaming resources guide](https://alchemy.run/infrastructure-as-code/renaming/)

Because the current bucket was created and managed through Wrangler, it cannot be assumed to have Alchemy ownership markers. The staging plan must declare `Cloudflare.R2.Bucket` with `name: "leenk-static"`, use `--adopt` only after the exact live bucket has been confirmed, and prove that the plan contains no bucket replacement. The bucket's objects and custom metadata must remain unchanged. In particular, Leenk's existing logical expiry metadata and `410 Gone` behavior must remain intact.

### Analytics Engine datasets

- The repository currently declares `SHORTLINK_ANALYTICS` as dataset `leenk_shortlinks` and `SITE_ANALYTICS` as dataset `leenk_site_events`. These names are in the current `alchemy.run.ts` and README. The label migration was briefly staged under a `leenk_shortlinks_v2` dataset name and merged back to `leenk_shortlinks`; see ADR-0001.
- Alchemy's `Cloudflare.AnalyticsEngine.Dataset` accepts an optional `dataset` name and produces a Worker binding. The published type says it does not provision a separate Cloudflare API resource. [Analytics Engine guide](https://alchemy.run/cloudflare/observability/analytics-engine/), [published `Dataset.d.ts` source](https://registry.npmjs.org/alchemy/-/alchemy-2.0.0-beta.70.tgz)
- Analytics Engine writes use `writeDataPoint()` with optional `indexes`, `blobs`, and `doubles`. The binding is write-only; queries use Cloudflare's Analytics Engine SQL API. [Analytics Engine guide](https://alchemy.run/cloudflare/observability/analytics-engine/), [Cloudflare SQL API](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/)

The migration must declare both existing dataset names exactly. It must not rename, recreate, or treat them as D1 tables. The dashboard analytics read path will need a server-side SQL API credential or a separately approved query service; the Worker binding alone cannot read historical data. Historical rows remain outside Alchemy's state and must be checked with a before/after query during staging.

### D1 for the dashboard CMS

- The current `wrangler.jsonc` has no D1 binding. The CMS D1 database is therefore a new dashboard capability, not an existing resource to adopt from the current deployment.
- Alchemy's D1 resource is `Cloudflare.D1.Database`. It supports a physical `name`, `migrationsDir`, a custom migration table, SQL import files, and clone-on-create. [D1 guide](https://alchemy.run/cloudflare/data/d1/), [published `Database.d.ts` source](https://registry.npmjs.org/alchemy/-/alchemy-2.0.0-beta.70.tgz)
- Alchemy applies numeric-prefix SQL migrations in order and records applied migrations in a Wrangler-compatible table. It does not un-apply migrations when `migrationsDir` is removed. [D1 guide](https://alchemy.run/cloudflare/data/d1/), [published `Database.d.ts` source](https://registry.npmjs.org/alchemy/-/alchemy-2.0.0-beta.70.tgz)

Recommendation: add D1 only after the dashboard schema is agreed. Use a stage-specific database name for preview stages and an explicit production name after a backup and migration review. Do not introduce a production D1 migration as part of the R2 adoption change.

### Cloudflare Access for the owner-only dashboard

- The published `Cloudflare.Access.Application` type supports `type: "self_hosted"`, a `domain`, reusable policy IDs, identity-provider restrictions, session duration, and an `adopt` option. [Published `Application.d.ts` source](https://registry.npmjs.org/alchemy/-/alchemy-2.0.0-beta.70.tgz)
- The published source documents Access policy resources as standalone resources referenced by an application. It also says an existing application recovered by domain is considered unowned unless adoption is enabled. [Published `Application.ts` source](https://github.com/alchemy-run/alchemy/blob/main/packages/alchemy/src/Cloudflare/Access/Application.ts)

Recommendation: protect `/dashboard` with a `self_hosted` Access application and one allow policy for the owner identity. Keep the upload token server-side. Do not expose `STATIC_UPLOAD_TOKEN` to browser code or put it in public environment variables.

### Secrets and Alchemy state

- The Astro guide shows `Config.redacted("API_KEY")` in `env` to bind an environment value as a Worker secret. [Astro guide](https://alchemy.run/cloudflare/frontend/astro/)
- The published package includes Cloudflare Secrets Store resources. `Cloudflare.SecretsStore.Secret` treats the value as redacted and sends it to Cloudflare only at create time. [Published `Secret.d.ts` source](https://registry.npmjs.org/alchemy/-/alchemy-2.0.0-beta.70.tgz)
- The standard Stack shape uses `state: Cloudflare.state()`. [Getting started guide](https://alchemy.run/getting-started/), [published state source](https://registry.npmjs.org/alchemy/-/alchemy-2.0.0-beta.70.tgz)
- The CI guide states that `Cloudflare.state()` uses the Cloudflare Secrets Store for the state-store worker credentials and that the credential needs Secrets Store Write to bind those secrets to the state-store worker. [CI guide](https://alchemy.run/environments/ci/)

The state store is separate from the application's D1 database. Its creation, account permissions, and credentials are a setup gate. The migration must never print or commit state-store tokens, Cloudflare API tokens, upload tokens, or Analytics SQL API credentials.

### Stages and GitHub Actions

- Alchemy stages isolate state, physical names, logs, and metrics. The documented patterns include `staging`, `prod`, and `pr-<number>`. [Stages guide](https://alchemy.run/environments/stages/)
- The CI guide computes `STAGE` as `pr-{number}` for pull requests, `prod` for pushes to `main`, and the branch name for other branches. It runs `alchemy deploy --stage ...` and destroys only the preview stage after a pull request closes. [CI guide](https://alchemy.run/environments/ci/)
- The documented GitHub Actions workflow passes `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `GITHUB_TOKEN`, `PULL_REQUEST`, and `GITHUB_SHA` to the deploy step. [CI guide](https://alchemy.run/environments/ci/)
- The GitHub provider can manage repositories, Actions secrets and variables, environments, webhooks, and PR comments. [GitHub guide](https://alchemy.run/github/)

The current repository has a verification-only GitHub workflow. A separate Alchemy deployment workflow is needed for staging and production, with a production environment approval gate. The existing CI checks should remain as pre-deploy checks.

### Bun invocation

- The repository's package manager is Bun and its lockfile is `bun.lock`.
  Current stable Bun is 1.4.0.
- Alchemy is a project dependency. The repository-native invocation is
  `bunx alchemy deploy --stage <stage>` or `bun run deploy` /
  `bun run deploy:prod`.
- Alchemy's official guides document `bun alchemy` among other runners.
  [Getting started guide](https://alchemy.run/getting-started/),
  [CI guide](https://alchemy.run/environments/ci/)

### Docker and Command relevance

- The Docker provider shells out to the active Docker CLI context and manages Docker images, containers, networks, and volumes. It is separate from the Cloudflare provider. [Docker guide](https://alchemy.run/docker/)
- The Command provider manages local `Build`, `Exec`, and `Dev` processes. The docs state that `Command.providers()` is already merged into `Cloudflare.providers()`. [Command guide](https://alchemy.run/command/)

Neither provider is required to deploy an Astro Worker or adopt the existing R2 and Analytics Engine bindings. `Command.Build` may be useful for a separately managed build artifact, but `Cloudflare.Website.Astro` already owns the Astro build. Docker is relevant only if the dashboard adds a local service that needs a Docker context.

## Recommended implementation path

1. **Read-only inventory.** Record the live Worker name, custom domain and routes, R2 bucket name, R2 object count and metadata sample, Analytics Engine dataset names, existing Access application state, and all current secrets by name only. Do not print secret values.
2. **Resolve the Astro package mismatch.** Install the guide's package and the published package required by the beta package only in a disposable or staging branch. Run a minimal `Cloudflare.Website.Astro` typecheck and build. Keep the working choice and version in the migration ADR.
3. **Create an Alchemy stack for a non-production stage.** Use `Cloudflare.providers()` and `Cloudflare.state()`. Declare `Cloudflare.Website.Astro`, `Cloudflare.R2.Bucket({ name: "leenk-static" })`, `Cloudflare.AnalyticsEngine.Dataset({ dataset: "leenk_shortlinks" })`, and `Cloudflare.AnalyticsEngine.Dataset({ dataset: "leenk_site_events" })`. Declare the dashboard D1 and Access resources only when their schema and identity policy are approved.
4. **Adopt and inspect the plan.** Run the Alchemy deploy with the exact stage and `--adopt` only for resources confirmed to be existing and foreign-owned. Stop if the plan creates a second bucket, changes either dataset name, replaces the Worker unexpectedly, changes the domain, or schedules destructive work.
5. **Run staging smoke tests.** Prove the public static read path, authenticated upload/delete path, expiry metadata and `410 Gone` behavior, shortlink creation and redirect analytics, site analytics writes, dashboard Access, and the CMS D1 migration in the staging stage. Query the Analytics Engine datasets before and after the test.
6. **Add the GitHub workflow.** Keep verification in CI. Add stage-aware Alchemy deployment and preview cleanup. Require a protected production environment for the production job. Use GitHub Actions secrets for Cloudflare credentials and never persist token values in the repository.
7. **Request fresh production approval.** Show the final Alchemy plan, the staging smoke-test results, the dataset comparison, the R2 metadata comparison, and the rollback procedure. Do not deploy production automatically from this research ticket.
8. **Remove Wrangler after parity.** Remove the Wrangler deployment and type-generation path, `wrangler.jsonc`, and stale Wrangler references only after the Alchemy staging and production gates pass. The final repository uses Alchemy and Bun.

## Failure and rollback risks

- **Wrong package or adapter version:** the docs/source mismatch can fail at build time or change the generated Worker entrypoint. Mitigation: stage-only install, typecheck, and build before changing the production dependency.
- **Wrong physical name:** Alchemy can create a second bucket or Worker if the declared name differs. Mitigation: inventory exact names and pin them explicitly.
- **Foreign ownership:** a Wrangler-created resource can be unowned to Alchemy. `--adopt` changes ownership and must be limited to the known resource after plan review. Mitigation: stage first, inspect the plan, and do not use broad adoption against an unknown account.
- **State-store loss or wrong stage:** a fresh or incorrect state store can cause recovery or create plans that are hard to interpret. Mitigation: use distinct stage names, preserve the state-store credentials, export or record state before production, and never destroy the old resource stack as a rollback step.
- **R2 data loss:** replacing or destroying an R2 bucket risks the static files, shortlinks, and expiry metadata. Mitigation: reject any replacement in the plan, verify object and metadata samples, and keep an independent object inventory before production.
- **Analytics continuity:** changing either dataset name splits reporting and loses the dashboard's historical view. Mitigation: declare `leenk_shortlinks` and `leenk_site_events` exactly and compare SQL query results before and after.
- **D1 migration damage:** D1 schema changes are durable and Alchemy does not un-apply migrations. Mitigation: keep CMS schema work separate, review SQL, back up or clone before production, and test the migration against a staging database.
- **Access lockout:** an incorrect Access policy can block the owner or expose the dashboard. Mitigation: test the owner identity in staging, keep an approved break-glass procedure, and require explicit security approval before changing production Access.
- **Domain cutover:** a custom domain or zone route can point traffic at the wrong Worker. Mitigation: verify the zone, route patterns, DNS, and HTTPS behavior before the production plan; use a staging host or workers.dev preview first.
- **Rollback after cutover:** once Alchemy owns the Worker, rollback should be a redeploy of the last known-good Alchemy stack and stage, not a return to Wrangler. Do not run `alchemy destroy` as a rollback action.

## Decision

Use Alchemy `2.0.0-beta.70` with an explicit, non-production adoption stage. Preserve the existing R2 bucket name `leenk-static` and the Analytics Engine dataset names `leenk_shortlinks` and `leenk_site_events`. Use `Cloudflare.Website.Astro` for the Worker, `Cloudflare.state()` for Alchemy state, Cloudflare Access for the owner-only dashboard, and D1 for the CMS only after its schema is approved. Use `bunx alchemy` in the repository. Remove Wrangler from the final repository after parity and production approval.

The package mismatch is resolved: the repository installs
`@distilled.cloud/astro@0.17.1` and pins the Effect ecosystem at
`4.0.0-beta.103`, and the adapter build is verified. See
[ADR-0003](../decisions/0003-alchemy-cloudflare-migration.md).

## Live verification (2026-08-10, via the Cloudflare CLI)

The Cloudflare CLI (`cf`, OAuth user `me@yusoofsh.id`) verified the target
account state read-only:

- Account `Yusoof Moh` (`662932437092ddb243ba32ae7e986e75`) hosts the
  `leenk` Worker with bindings `ASSETS`, `SESSION` (KV), `SHORTLINK_ANALYTICS`
  (dataset `leenk_shortlinks`), `SITE_ANALYTICS` (dataset `leenk_site_events`),
  `STATIC_FILES` (bucket `leenk-static`), and the `STATIC_UPLOAD_TOKEN`
  secret. The live dataset is still the legacy `leenk_shortlinks`; the v2
  dataset will exist after the first deployment of the label migration.
- The `leenk` Worker serves the custom domain `www.yusoofsh.id` (zone
  `yusoofsh.id`) with no zone routes.
- The `leenk-static` bucket exists (created 2026-07-13) and is the only R2
  bucket on the account. Object-level inventory still requires an R2 S3
  parent access key, which is not configured.
- `cf analytics_engine sql query` works on the account. The legacy shortlink
  dataset shows 72 weighted clicks across 20 codes in the last 30 days;
  `leenk_site_events` shows the documented event taxonomy flowing.
- One Access application exists (`leenk - preview` for
  `*-leenk.yusoofsh.workers.dev`); no dashboard application exists yet.
- An Alchemy `default` profile is logged in with Cloudflare OAuth. `alchemy
plan --stage dev` evaluates the stack, provisions the Alchemy state store,
  and reports one adoption (the bucket) plus the new Development resources.

## Sources

- [Alchemy setup](https://alchemy.run/cloudflare/setup/)
- [Alchemy getting started](https://alchemy.run/getting-started/)
- [Alchemy Astro](https://alchemy.run/cloudflare/frontend/astro/)
- [Alchemy R2](https://alchemy.run/cloudflare/data/r2/)
- [Alchemy D1](https://alchemy.run/cloudflare/data/d1/)
- [Alchemy Analytics Engine](https://alchemy.run/cloudflare/observability/analytics-engine/)
- [Alchemy adopting resources](https://alchemy.run/cli/adopting-resources/)
- [Alchemy renaming resources](https://alchemy.run/infrastructure-as-code/renaming/)
- [Alchemy stages](https://alchemy.run/environments/stages/)
- [Alchemy CI](https://alchemy.run/environments/ci/)
- [Alchemy GitHub](https://alchemy.run/github/)
- [Alchemy Docker](https://alchemy.run/docker/)
- [Alchemy Command](https://alchemy.run/command/)
- [Alchemy package metadata](https://registry.npmjs.org/alchemy/2.0.0-beta.70)
- [Alchemy published package](https://registry.npmjs.org/alchemy/-/alchemy-2.0.0-beta.70.tgz)
- [Alchemy package source](https://github.com/alchemy-run/alchemy/tree/main/packages/alchemy)
- [Cloudflare Analytics Engine SQL API](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/)
