# Leenk runtime invariants

Date: 2026-08-09

This note records the current source contracts that an Alchemy migration and the
operator dashboard must preserve. Current source, configuration, tests, and
repository documentation are the authority. No Cloudflare resource or secret
was inspected or changed.

## Runtime and bindings

- The application is an Astro server build using `@astrojs/cloudflare`, React,
  and `site: https://www.yusoofsh.id/` (`astro.config.ts:1-36`). The Worker is
  named `leenk`, uses compatibility date `2026-07-13`, `nodejs_compat`, smart
  placement, preview URLs, and invocation logs plus traces
  (`wrangler.jsonc:1-25`).
- The current bindings are `STATIC_FILES: R2Bucket` for the exact bucket
  `leenk-static`, `SHORTLINK_ANALYTICS: AnalyticsEngineDataset` for
  `leenk_shortlinks`, and `SITE_ANALYTICS: AnalyticsEngineDataset` for
  `leenk_site_events` (`alchemy.run.ts`, `worker-configuration.d.ts:1-11`).
- There is no D1 binding or CMS store in the current configuration or generated
  environment types. A dashboard CMS backed by D1 is therefore new scope; it
  must not be treated as an existing data migration.
- `worker-configuration.d.ts` is generated from Wrangler today
  (`worker-configuration.d.ts:1-7`). The final migration must generate the
  equivalent typed environment from Alchemy and remove the Wrangler-owned
  deployment path.

## Route and API contracts

| Route                    | Public behavior                                                                                                                                                                                                                                                                        | Authenticated behavior and contract                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/static/<path>`         | `GET` returns the R2 body and metadata; `HEAD` returns the same headers without a body. Missing objects return `404 NOT_FOUND` (`src/pages/static/[...path].ts:71-87`, `src/lib/static.ts:287-340`).                                                                                   | `POST` uploads a raw body and returns `201` JSON with `path`, `size`, `etag`, `expiresAt`, and `url`. `DELETE` is idempotent and returns `204`. Both require `Authorization: Bearer <STATIC_UPLOAD_TOKEN>` (`src/lib/static.ts:113-155`, `src/lib/static.ts:183-255`, `src/lib/static.ts:258-285`).                                                                                                                                                                   |
| `/api/shortlinks`        | No public write path.                                                                                                                                                                                                                                                                  | `POST` requires the upload token and `application/json`. The body must contain exactly one string `path` or `target`; optional fields are future UTC `expiresAt`, `campaign`, and `label`. `Content-Length` is required and capped at 8 KiB. Static targets must exist, and their expiry is the upper bound (`src/pages/api/shortlinks/index.ts:13-41`, `src/lib/shortlinks.ts:427-637`). Success is `201` with `code`, `label`, target, URLs, and optional metadata. |
| `/api/shortlinks/<code>` | The route handler accepts `GET` and `HEAD` through the shared handler, but public shortlink resolution is the root `/<code>` route.                                                                                                                                                    | `DELETE` requires the upload token, removes the R2 record, and returns `204` (`src/pages/api/shortlinks/[code].ts:14-28`, `src/lib/shortlinks.ts:713-755`).                                                                                                                                                                                                                                                                                                           |
| `/<code>`                | `GET` and `HEAD` resolve a valid 4-8 character base62 code and return `302` with a same-origin `Location`. `HEAD` does not write click analytics. Expired links return `410 SHORTLINK_EXPIRED` (`src/pages/[code].ts:13-27`, `src/lib/shortlinks.ts:639-710`).                         | No authenticated read is required.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `/api/analytics/events`  | No public response body. `POST` requires `application/json`, a body no larger than 512 bytes, and an allowlisted event payload. Valid input returns `204`; malformed input returns a typed `4xx` error (`src/pages/api/analytics/events.ts:12-85`, `src/lib/site-analytics.ts:47-93`). | The current site-event endpoint is client-facing and does not use the upload token. The future dashboard must use its owner-only Cloudflare Access boundary and keep the upload token server-side.                                                                                                                                                                                                                                                                    |

The social redirect routes are `/github`, `/linkedin`, and `/twitter`
(`src/pages/github.ts`, `src/pages/linkedin.ts`, `src/pages/twitter.ts`).
Shortlink internal targets may point to validated same-origin paths, but cannot
point to external URLs, management API paths, the reserved shortlink prefix, or
another shortlink (`src/lib/shortlinks.ts:243-288`).

## R2 data layout and object rules

- User objects use the exact key supplied after `/static/`. Keys are limited to
  1,024 characters, cannot contain backslashes, NUL bytes, empty segments, `.`,
  or `..`, and cannot begin with the reserved `__shortlinks/` prefix
  (`src/lib/object-keys.ts:1-19`).
- Shortlink records share the same `leenk-static` bucket under
  `__shortlinks/<code>` (`src/lib/shortlink-constants.ts:1`,
  `src/lib/shortlink-storage.ts:22-53`). Allocation uses R2 `If-None-Match: *`
  so concurrent writers cannot overwrite a code
  (`src/lib/shortlink-storage.ts:34-47`).
- A record contains exactly one target: `path` for a static object or `target`
  for an internal alias. It may also contain `label`, a future ISO UTC
  `expiresAt`, and campaign `name`, `source`, and `medium`
  (`src/lib/shortlinks.ts:33-45`, `src/lib/shortlinks.ts:954-987`).
- Uploads are limited to exactly 100 MiB (`100 * 1024 * 1024`). The request must
  include a valid `Content-Length`; the handler rejects larger or chunked
  uploads before reading the body (`src/lib/static.ts:17-18`,
  `src/lib/static.ts:130-153`, `src/lib/static.ts:392-399`).
- New uploads expire after 14 days by default. `X-Static-Expires-In` accepts
  positive minute, hour, or day values, or `never`. The expiry is stored in R2
  custom metadata as `expiresAt` (`src/lib/static.ts:155-178`,
  `src/lib/static.ts:342-378`). Re-uploading a path replaces the object and
  resets its expiry (`README.md:149-152`).
- An expired object returns `410 EXPIRED`, `Expires`, and
  `X-Static-Expires-At`, uses `Cache-Control: no-store`, and remains in R2.
  Objects without expiry metadata remain readable for legacy compatibility
  (`src/lib/static.ts:287-339`, `src/lib/static.test.ts:401-450`).
- Successful reads preserve content type, content disposition, content
  encoding, content language, ETag, size, last-modified time, and
  `X-Content-Type-Options: nosniff` (`src/lib/static.ts:309-339`).

## Authentication boundary

Mutating static-file and shortlink operations require the Worker secret
`STATIC_UPLOAD_TOKEN` and an exact `Authorization: Bearer ...` header. The
server compares SHA-256 digests with a timing-safe comparison fallback
(`src/lib/http.ts:1-21`, `src/lib/http.ts:41-62`). Missing configuration returns
`503`; an invalid token returns `401 UNAUTHORIZED` with a Bearer challenge.

The CLI accepts a 64-character hexadecimal token. `LEENK_STATIC_TOKEN` takes
precedence over the private config file, and the token is never written when the
environment variable is used (`cli/leenk.ts:83-105`, `cli/leenk.ts:166-183`).
The dashboard must not place this token in browser code. Owner-only Cloudflare
Access is the selected dashboard access model; dashboard server handlers may
use the token only on the server side when they call the existing mutation
contracts.

## Analytics schemas and privacy rules

`SHORTLINK_ANALYTICS` writes the `leenk_shortlinks` dataset. Rows written
before the label migration use the short code as `index1`; newer rows carry
the label. Each click data point is:

```text
blob1: shortlink code
blob2: human-readable link label
blob3: target kind (`static` or `internal`)
blob4: campaign name
blob5: campaign source
blob6: campaign medium
blob7: referrer origin only
double1: 1
index1: human-readable link label
```

The implementation writes those fields on `GET` redirects and does not block
the redirect on analytics failure (`src/lib/shortlinks.ts:699-710`,
`src/lib/shortlinks.ts:858-889`). The previous `leenk_shortlinks` dataset is
historical data and must remain available (`README.md:229-248`).

`SITE_ANALYTICS` writes `leenk_site_events` with this shape:

```text
blob1: event name
blob2: bounded dimension, when applicable
blob3: referrer origin only
blob4: human-readable shortlink label, for lifecycle events
double1: 1
index1: event name
```

The allowlist and dimensions are fixed in `src/lib/site-analytics.ts:1-37`:
bio mode (`full`, `tldr`), content section (`what_i_do`, `selected_work`,
`beyond_work`), scroll depth (`25`, `50`, `75`, `90`), active time (`10`, `30`,
`60`), outbound project (`nadi`, `ydsf`, `electgo`), social network (`github`,
`linkedin`, `twitter`), contact (`email`), internal link (`home`), error page
(`not_found`), client error (`runtime`, `resource`, `promise`), shortlink
lifecycle (`internal`, `static`), and static upload (`with_shortlink`,
`without_shortlink`). `shortlink_deleted` and `static_file_deleted` have no
dimension. The writer stores only the referrer origin and a validated label,
and catches write failures (`src/lib/site-analytics.ts:95-155`). It must not
record email addresses, account names, IP addresses, request bodies, complete
URLs, messages, stack traces, or other identity data (`README.md:280-285`).

Cloudflare Web Analytics remains the separate source for ordinary page views,
referrer, device and browser dimensions, and Web Vitals (`README.md:231-234`).

## CLI contract

The CLI is dependency-free TypeScript compiled by ScriptC into a native binary.
The commands are `upload`, `inspect` or `head`, `delete`, `login`, `logout`,
`status`, `help`, and `version` (`cli/leenk.ts:36-66`, `cli/leenk.ts:327-350`).

- `upload [OPTIONS] FILE [REMOTE_PATH]` defaults the remote path to the local
  basename, creates a shortlink, and uses the Worker 14-day expiry. Options are
  `--expires DURATION|never`, `--no-shortlink`, `--label`, `--campaign`,
  `--source`, and `--medium` (`cli/leenk-core.ts:84-172`, `cli/leenk.ts:49-65`).
- Uploads send `Content-Length`, a detected content type, the bearer token, and
  the shortlink and campaign headers. The client enforces the 100 MiB limit and
  prints the confirmed path, size, ETag, expiry, public URL, short URL, and
  optional label (`cli/leenk.ts:207-245`, `cli/leenk-core.ts:174-190`).
- `inspect REMOTE_PATH` performs public `HEAD` and prints size, content type,
  ETag, last-modified, expiry, and URL (`cli/leenk.ts:247-272`).
- `delete --force REMOTE_PATH` requires an explicit force flag after the caller
  confirms the exact path. It sends authenticated `DELETE` and expects `204`
  (`cli/leenk.ts:274-301`).
- `login` reads the token from stdin and writes the private config with mode
  `0600`; `status` reports only the auth source and origin, never the token
  (`cli/leenk.ts:185-193`, `cli/leenk.ts:303-325`).

## Verification, CI, and deployment

The repository uses Bun 1.4.0 or newer and `bun.lock` as its only lockfile.
Local install and verify do not require Node.js or Nub. The Worker still
sets `nodejs_compat` for the Cloudflare runtime.

The relevant commands are defined in `package.json`:

- Install: `bun install --frozen-lockfile`.
- Local development: `bun run dev`.
- Worker build: `bun run build`.
- Checks: `bun run check`, `bun run test`, `bun run lint`, and
  `bun run format:check`.
- Full local gate: `bun run verify`.
- Development deploy: `bun run deploy`. Production remains
  `bun run deploy:prod` behind a separate approval.

CI runs `bun install --frozen-lockfile`, `bun run verify`, and
`bun audit --audit-level=high` on pull requests and pushes to `main`
(`.github/workflows/ci.yml`).

## Existing worktree state

Before this research file was created, `git status --short --branch` showed
`main...origin/main` with these uncommitted changes:

```text
 M .codex/hooks.json
 M README.md
 M cli/leenk-core.test.ts
 M cli/leenk-core.ts
 M cli/leenk.ts
 M src/lib/shortlinks.test.ts
 M src/lib/shortlinks.ts
 M src/lib/site-analytics.test.ts
 M src/lib/site-analytics.ts
 M src/lib/static.test.ts
 M src/lib/static.ts
 M wrangler.jsonc
?? docs/decisions/0001-shortlink-analytics-labels.md
```

Those files were not modified by this research task. This file is intentionally
uncommitted because no commit or push was authorized.

## Final migration invariants

1. Keep the Worker identity, public domain, route shapes, response semantics,
   R2 key rules, shortlink record format, `leenk-static` bucket, and both
   Analytics Engine dataset names. Preserve the historical `leenk_shortlinks`
   dataset; do not rewrite or drop it.
2. Preserve the 100 MiB upload ceiling, required `Content-Length`, default
   14-day logical expiry, `never`, R2 `expiresAt` metadata, `410` behavior, and
   legacy objects without expiry metadata. Logical expiry must not become an
   automatic R2 deletion.
3. Keep `__shortlinks/<code>` private from `/static/*`. Preserve base62
   allocation from four through eight characters and R2 conditional creation.
4. Keep the bearer-token mutation contract and never expose
   `STATIC_UPLOAD_TOKEN` to browser code. Add the selected owner-only Cloudflare
   Access boundary for `/dashboard`.
5. Keep Analytics Engine field order, allowlists, bounded dimensions, origin-only
   referrers, lifecycle labels, best-effort writes, and no-identity policy.
6. Add D1 only for the new dashboard CMS and any explicitly approved dashboard
   records. Do not mix D1 content with the R2 object or shortlink namespaces.
7. Alchemy must become the final deployment and resource definition path. No
   Wrangler deployment or generated-type dependency remains in the completed
   repository. Production deployment stays behind a separate approval after
   local and staging parity checks.
