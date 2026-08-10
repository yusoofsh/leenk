# ADR-0004: Better Auth for operator sessions, roles, and tenancy

## Status

Accepted

## Date

2026-08-10

## Context

The dashboard boundary started as Cloudflare Access with email one-time
PINs, which could not deliver codes to the operator's iCloud-hosted mailbox,
and moved to HTTP Basic authentication against the upload token. Neither
model provides sessions, roles, or a tenant boundary, and the dashboard API
mutations could not be authorized from the browser at all. The operator
model in `CONTEXT.md` needs a real identity layer.

## Decision

Adopt Better Auth (1.7.0-rc.4) as the identity layer, running inside the
Worker with the existing D1 database:

- Sessions and email-and-password sign-in replace the Basic auth boundary.
  `BETTER_AUTH_SECRET` is a new Worker secret, generated and stored in the
  GitHub Actions secrets; sign-up is disabled and the owner is seeded through
  a token-guarded bootstrap endpoint.
- One seeded organization (`Leenk`) provides the tenant boundary. The
  organization plugin's access control defines three roles: `owner`
  (everything), `admin` (content, files, shortlinks, settings), and `member`
  (read-only modules). A single capability matrix in `src/lib/auth-roles.ts`
  drives both the better-auth roles and the dashboard guards.
- The Astro middleware requires a session and an active membership for
  `/dashboard` and `/api/dashboard`, redirecting pages to `/login` and
  returning 401 for API calls.
- Dashboard mutation routes no longer require `X-Upload-Token`; the upload
  and shortlink APIs accept either the bearer token or an authenticated
  operator with the matching capability (`files:manage` or
  `shortlinks:manage`), so the browser-based Files and Shortlinks modules
  work while the CLI keeps its token path.
- Activity entry actors move from the static `operator` label to the signed
  in operator's identity where available.
- Schema tables for `user`, `session`, `account`, `verification`,
  `organization`, `member`, and `invitation` ship as
  `d1/migrations/0002_better_auth.sql`, applied by the Alchemy deploy.

## Alternatives considered

### Keep Cloudflare Access with a different identity provider

Rejected: the account has only the built-in email one-time PIN provider, and
creating Google or GitHub OAuth providers requires external application
credentials the operator does not want to manage.

### Keep Basic auth

Rejected: no sessions, no roles, no tenant boundary, and dashboard
mutations remain browser-hostile.

## Consequences

- The operator logs in with an email and password; sessions are cookie-based
  and the dashboard shell shows the signed in identity with a sign-out
  action.
- The first operator is provisioned once via
  `POST /api/auth/bootstrap` with the upload token, restricted to the owner
  email and a 12-character minimum password.
- The upload token remains valid for the CLI and machine clients; rotating
  it no longer affects dashboard access.
- The version is a release candidate; upgrade notes live in the research
  docs when a stable release ships.
