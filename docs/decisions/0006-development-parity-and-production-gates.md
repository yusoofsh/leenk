# ADR-0006: Development parity and production cutover gates

## Status

Accepted

## Date

2026-08-13

## Context

Issues #35 and #39 require explicit evidence before production cutover and
before the final Wrangler retirement. Repository tests alone cannot prove
Cloudflare resource identity, data preservation, or live route behavior.

## Decision

The Development Environment is the local `nub run dev` environment and the
local verification surface. A remote Development deployment is optional and
is not required for this project. The local Development Environment must pass
these gates before production approval:

1. `nub run verify` passes from a frozen Nub install.
2. `nub exec alchemy plan --stage dev` exits successfully and shows no
   replacement or destructive operation for adopted resources.
3. The local server routes pass public homepage, social redirect, static
   `GET`/`HEAD`, shortlink redirect, dashboard authentication, and dashboard
   API smoke tests.
4. The local static-file tests prove the 100 MiB limit, expiry metadata, and
   `410` behavior without physical deletion.
5. The local CMS tests prove migrations, homepage import, draft save, preview,
   publish, rollback, and Activity Entries.
6. The local Analytics Engine tests prove fixed queries, weighted counts, and
   bounded privacy fields.
7. The local CLI coverage/build checks prove CLI compatibility.
8. Rollback is a forward deployment of the last known-good Alchemy state.
   `alchemy destroy`, force replacement, and a return to Wrangler are not
   rollback actions.

The remote Development Environment may be used for additional parity checks,
but it is not an acceptance gate.

Production cutover requires a fresh approval after these gates. The final
Wrangler retirement check then proves that no Wrangler configuration, script,
dependency, generated type, or deployment documentation remains in the final
repository, while preserving historical research as clearly marked migration
evidence until that check is complete.

## Consequences

The repository can record local Development evidence without claiming that
Production is deployed. Cloudflare provisioning, credentials, migrations,
Access or Better Auth setup, and production cutover remain separate approval
gates.
