# Leenk

A minimalist personal portfolio for Yusoof Moh, built with Astro and deployed as a Cloudflare Worker.

## Stack

- Astro 7 with server-side rendering
- React 19 islands
- Tailwind CSS 4 and typography styles
- Cloudflare Workers through Alchemy and the `@distilled.cloud/astro` adapter
- TypeScript 7, Oxlint, Oxfmt, Husky, and lint-staged
- Vite 8 with Rolldown and Vitest 4
- Cloudflare Web Analytics page/performance telemetry, Workers Analytics Engine for privacy-preserving engagement and lifecycle events, and a self-hosted Plus Jakarta Sans font

## Requirements

- Latest stable Nub
- Node.js 26.5.0 or newer

The repository uses the latest Nub lockfile format in `nub.lock` as its only
package-manager lockfile.

## Development

```bash
nub install --frozen-lockfile
nub run dev
```

The development server is available at <http://localhost:4321> by default.

## Commands

| Task                               | Command                |
| ---------------------------------- | ---------------------- |
| Start the Astro development server | `nub run dev`          |
| Build the production Worker        | `nub run build`        |
| Run the TypeScript check           | `nub run check`        |
| Run unit tests                     | `nub run test`         |
| Run Oxlint                         | `nub run lint`         |
| Check Oxfmt formatting             | `nub run format:check` |
| Run all local verification gates   | `nub run verify`       |
| Apply lint and formatting fixes    | `nub run quality`      |
| Show the Alchemy deployment plan   | `nub run plan`         |
| Deploy the Development Environment | `nub run deploy`       |
| Deploy the Production Environment  | `nub run deploy:prod`  |

Oxfmt formats supported JavaScript, TypeScript, CSS, Markdown, and configuration files. It currently skips `.astro` files, which remain validated by Astro's compiler and production build. CI runs linting, formatting, TypeScript checks, unit tests, the production build, and a high-severity dependency audit.

## Project Structure

```text
src/
├── components/        React islands and visual components
├── layouts/           Shared document layout and metadata
├── lib/               Stores and utilities
├── pages/             Astro routes and social redirects
└── styles/            Global Tailwind styles

public/                Static assets copied into the Worker bundle
alchemy.run.ts         Alchemy stack: Worker, R2, datasets, D1, Access
d1/migrations/         D1 SQL migrations for the dashboard CMS
```

## Static file hosting

Files uploaded to `/static/<path>` are stored in the `leenk-static` R2 bucket and served directly
from the same URL. Reads are public; uploads and deletes require the `STATIC_UPLOAD_TOKEN` Worker
secret. Uploads accept a raw request body up to 100 MiB.

### Leenk CLI

The repository includes a dependency-free TypeScript CLI compiled by
[ScriptC](https://scriptc.dev/quickstart) into a self-contained native binary:

```bash
nub install --frozen-lockfile
nub run cli:build
nub run cli:install
```

Authenticate without placing the upload token in shell history:

```bash
printf '%s' "$LEENK_STATIC_TOKEN" | leenk login
leenk status
```

The private config is stored under `$XDG_CONFIG_HOME/leenk/config.json` or
`~/.config/leenk/config.json`. In CI, set `LEENK_STATIC_TOKEN` instead of using
`login`; the environment variable takes precedence and is never written to disk.

Upload a filesystem path or local `file://` URI. Uploads create a shortlink and
use the Worker's 14-day expiration by default:

```bash
leenk upload ./document.pdf
leenk upload --label electgo_runner_options ./runner-options.html
leenk upload file:///Users/me/Documents/report.pdf reports/report.pdf
leenk upload --expires never --no-shortlink ./logo.png assets/logo.png
```

The command prints the confirmed path, size, ETag, expiration, public URL, and
short URL. Inspect public metadata or permanently delete an exact path:

```bash
leenk inspect reports/report.pdf
leenk delete --force reports/report.pdf
```

Deletion is intentionally non-interactive and requires `--force`; callers must
confirm the exact production path before invoking it. Credential rotation remains
an administrative deployment operation and is not part of the portable client.

ScriptC 0.0.22 supports this HTTPS CLI on macOS arm64 and cross-compiled Linux
arm64/x86_64. Its Windows target does not yet implement `http`, `https`, or `tls`,
so ScriptC cannot currently produce a functional Windows build of this client.
See [ScriptC platform support](https://scriptc.dev/platforms).

With Zig installed, produce Linux artifacts from macOS:

```bash
nub run cli:build:linux-arm64
nub run cli:build:linux-x64
```

New uploads expire from public access after 14 days by default. The Worker stores the expiry in R2
custom metadata and returns `410 Gone` after that time without deleting the R2 object. Set
`X-Static-Expires-In` to a duration such as `30m`, `12h`, or `30d` to override the default, or to
`never` for a permanent public object. Legacy objects uploaded before expiration support remain
readable.

The `leenk-static` R2 bucket already exists in the Yusoof Moh account. The
bucket, the Analytics Engine datasets, and the live Worker are adopted by the
Alchemy stack (`alchemy.run.ts`) with their exact physical names. Deployment
reads `STATIC_UPLOAD_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` from the environment
(CI secrets or `.env`); `CLOUDFLARE_ANALYTICS_TOKEN` is optional until the
dashboard analytics reports are enabled:

```bash
export STATIC_UPLOAD_TOKEN=<the existing Worker secret value>
export CLOUDFLARE_ACCOUNT_ID=<account id>
```

Upload any binary file while preserving its media type:

```bash
printf 'header = "Authorization: Bearer %s"\n' "$STATIC_UPLOAD_TOKEN" | \
  curl --config - https://www.yusoofsh.id/static/docs/guide.pdf \
    -X POST \
    -H "Content-Type: application/pdf" \
    -H "X-Static-Expires-In: 30d" \
    --data-binary @guide.pdf
```

The same URL supports public `GET` and `HEAD`. Uploading the same path again replaces the existing
file and resets its expiry. Successful reads expose `X-Static-Expires-At`; expiring objects use
`Cache-Control: no-store` so a cache cannot serve one after its deadline. Authenticated deletion is
the only operation that removes an object, is idempotent, and returns `204 No Content`:

```bash
printf 'header = "Authorization: Bearer %s"\n' "$STATIC_UPLOAD_TOKEN" | \
  curl --config - https://www.yusoofsh.id/static/docs/guide.pdf \
    -X DELETE \
    -H "Content-Type: application/octet-stream"
```

## Short links

Short links use the same R2 bucket as static files. Create one for an existing
static object with the authenticated API:

```bash
printf 'header = "Authorization: Bearer %s"\n' "$STATIC_UPLOAD_TOKEN" | \
  curl --config - https://www.yusoofsh.id/api/shortlinks \
    -X POST \
    -H "Content-Type: application/json" \
    --data '{"path":"docs/guide.pdf"}'
```

The response contains a random base62 code. Allocation starts at four
characters and grows only when the shorter namespace cannot find a free code:

```json
{
  "code": "aB3x",
  "path": "docs/guide.pdf",
  "shortUrl": "https://www.yusoofsh.id/aB3x",
  "targetUrl": "https://www.yusoofsh.id/static/docs/guide.pdf"
}
```

`GET` and `HEAD` requests to `/{code}` redirect publicly to the static object.
The generator verifies that the target already exists, so it cannot create a
link to a missing file. Revoke a link with the same upload token:

```bash
printf 'header = "Authorization: Bearer %s"\n' "$STATIC_UPLOAD_TOKEN" | \
  curl --config - https://www.yusoofsh.id/api/shortlinks/aB3x \
    -X DELETE
```

Shortlink records can include a future UTC expiration and campaign metadata:

```json
{
  "label": "electgo_runner_options",
  "path": "docs/guide.pdf",
  "expiresAt": "2099-01-01T00:00:00.000Z",
  "campaign": {
    "name": "spring",
    "source": "newsletter",
    "medium": "email"
  }
}
```

The target file's own expiration is authoritative: a shortlink cannot live
longer than its static object. Same-origin application aliases can use a
validated `target` path instead of `path`; external URLs and management API
paths are rejected:

```json
{ "target": "/github?source=profile" }
```

Uploads can optionally allocate a shortlink in the same response by sending
`X-Static-Shortlink: true`. The upload endpoint accepts the same campaign
headers (`X-Shortlink-Label`, `X-Shortlink-Campaign`, `X-Shortlink-Source`, and
`X-Shortlink-Medium`). If no label is supplied, the Worker derives one from the
target path. Labels use at most 64 letters, numbers, dots, underscores, or
hyphens. Campaign clicks are recorded by the configured `SHORTLINK_ANALYTICS`
Analytics Engine binding without blocking redirects; only the referrer origin
is retained.

## Analytics

Cloudflare Web Analytics remains responsible for ordinary page views, referrer,
device/browser dimensions, and Web Vitals. The `SHORTLINK_ANALYTICS` binding
writes to the `leenk_shortlinks` dataset. Its data points use this shape:

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

Rows recorded before the label migration still carry the short code as
`index1` and age out with Analytics Engine's three-month retention. The
separate `SITE_ANALYTICS` Analytics Engine binding (`leenk_site_events`)
records only allowlisted custom events. Its data points use this shape:

```text
blob1: event name
blob2: bounded dimension, when applicable
blob3: referrer origin only
blob4: human-readable shortlink label, for lifecycle events
double1: 1
index1: event name
```

The current custom event taxonomy is:

- `bio_mode_viewed` / `bio_mode_changed`: `full` or `tldr`.
- `content_section_viewed`: `what_i_do`, `selected_work`, or `beyond_work`.
- `scroll_depth_reached`: `25`, `50`, `75`, or `90` percent.
- `time_on_page_reached`: `10`, `30`, or `60` active seconds.
- `outbound_link_clicked`: `nadi`, `ydsf`, or `electgo`.
- `social_link_clicked`: `github`, `linkedin`, or `twitter`.
- `contact_link_clicked`: `email`.
- `internal_link_clicked`: `home` (404 recovery).
- `error_page_viewed`: `not_found`.
- `client_error`: `runtime`, `resource`, or `promise`, without messages or
  stack traces.
- `shortlink_created`: `internal` or `static`.
- `shortlink_deleted`: no path or code recorded in the site-events dataset;
  the bounded label is recorded when available.
- `static_file_uploaded`: `with_shortlink` or `without_shortlink`.
- `static_file_deleted`.

Social networks intentionally use the single `social_link_clicked` event with
a bounded dimension instead of separate `github_clicked`,
`linkedin_clicked`, or `twitter_clicked` event names. Analytics never records
email addresses, account names, IP addresses, request bodies, complete URLs,
messages, stack traces, or other user identity. Writes are best-effort and
never block navigation, redirects, uploads, or deletes.

The owner dashboard reads those datasets in two ways. Named Analytics Engine
SQL reports still supply the labeled shortlink, campaign, and site-event
tables. `GET /api/dashboard/analytics/volume` queries Cloudflare GraphQL
`workersAnalyticsEngineAdaptiveGroups` for sampled dataset totals only. The
Worker does not query Web Analytics RUM GraphQL nodes or Workers Logs.

## Deployment

The build produces an Astro server entry point and static assets in `dist/`.
`nub run build` uses `astro.config.local.ts`, which adds the same
`@distilled.cloud/astro` Cloudflare adapter the Alchemy stack injects at
deploy time, so the repository never needs Wrangler.

Show the plan for a stage before deploying:

```bash
nub run build
nub run plan -- --stage dev
```

The Development Environment deploys to an isolated `dev-leenk` Worker on
workers.dev:

```bash
nub run deploy
```

Production deployment is intentionally explicit and adopts the live `leenk`
Worker and its custom domain:

```bash
nub run deploy:prod
```

Deploy only after local and CI verification pass. Both commands change live
state and require approval when run by an agent; the Production deploy
additionally requires the GitHub `production` environment approval gate.

## Dashboard login

The owner dashboard at `/dashboard` and its API at `/api/dashboard` are
protected by Better Auth sessions. Sign in at `/login` with the operator
email and password; the first operator is provisioned once through
`POST /api/auth/bootstrap` (owner email, 12+ character password, guarded by
the upload token). Roles (`owner`, `admin`, `member`) and the `Leenk`
organization are defined in `src/lib/auth-roles.ts`. The upload token keeps
guarding the CLI and machine upload paths.

## Contributing

1. Create a short-lived branch.
2. Make a focused change.
3. Run `nub run verify`.
4. Commit with a conventional commit message.
5. Open a pull request and wait for CI.

## Security

Report vulnerabilities privately using the process in [SECURITY.md](SECURITY.md).

## License

This project is private and is not currently licensed for public use.
