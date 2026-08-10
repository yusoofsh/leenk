# ADR-0002: Use D1 content revisions for controlled homepage publishing

## Status

Accepted

## Date

2026-08-09

## Context

The homepage is currently rendered from source and has two authored modes:
`full` and `tldr`. The dashboard needs to let an Operator manage this content
without making presentation code, analytics identifiers, or deployment steps
part of ordinary content editing.

The CMS also needs a durable history. Operators must be able to preview and
publish a draft, recover an earlier revision, and see who changed the content.
The current repository has no D1 CMS store, so this is a new dashboard data
model rather than a migration of an existing content database.

## Decision

Persist the dashboard CMS in D1. Model the homepage as one Content Document.
Every Content Revision contains two fixed, ordered block lists: `full` and
`tldr`. Operators cannot add variants. The document always has one Published
Revision after the initial migration.

Allow only these Content Blocks:

- Intro
- Section
- Paragraph
- Bullet List
- Contact

The CMS must not accept arbitrary HTML or JavaScript. Layout, presentation,
analytics identifiers, and theme behavior remain system-owned.

Version the display title, SEO title, SEO description, SEO keywords, social
copy, and controlled profile metadata with each revision. Keep canonical URLs,
robots rules, analytics keys, manifest data, and theme behavior system-owned.

Represent content links as typed, validated values for external URLs, email,
Internal Routes, and Shortlinks. Project links do not need to use Shortlinks.
Validate every link target before a revision can be published.

Content Revisions keep an immutable content payload and authoring record after
creation. An explicit Save Draft action creates a new revision, archives the
previous draft, and uses optimistic concurrency to prevent a stale tab from
overwriting newer work. The first release has no autosave.

Serve a saved Draft Revision through Cloudflare Access using the same public
renderer as the homepage. Preview responses use `noindex` and `no-store`.

Publishing requires explicit confirmation. Validate the blocks, links, and
Asset references first. Then use one D1 atomic operation to archive the
current Published Revision, publish the selected Draft Revision, update the
Content Document pointer, and write an Activity Entry. The operation must
preserve the invariant that the homepage has one Published Revision.

Rollback clones an Archived Revision into a new Draft Revision. The Operator
can preview that draft and publish it through the normal confirmation and
validation path. The system never rewrites revision history.

The homepage cannot be unpublished or deleted. Unwanted drafts are archived.
Keep every Content Revision and Activity Entry in the first release, and do
not provide a hard-delete action for either record.

Import the existing homepage and both authored variants as the first Published
Revision. The import must be idempotent and verify content hashes before it
creates or accepts the resulting records.

## Alternatives considered

### Source-controlled Markdown

- Pros: Familiar review workflow, clear history, and no new persistence layer.
- Cons: Every operator edit needs a code change and deployment, which makes
  preview and publishing slower and keeps routine content work outside the
  dashboard.
- Rejected: The dashboard needs owner-managed publishing with a durable D1
  history and Activity Entries.

### Arbitrary HTML or JavaScript

- Pros: Maximum authoring flexibility and an easy path for unusual layouts.
- Cons: It bypasses block and link validation, expands the content attack
  surface, and lets content changes alter system-owned behavior.
- Rejected: The first release needs a constrained, predictable public
  renderer.

### Mutable single row

- Pros: Small schema and simple reads and writes.
- Cons: It loses revision history, makes rollback ambiguous, and allows stale
  tabs to overwrite one another unless extra coordination is added.
- Rejected: Revision-level publishing, optimistic concurrency, and durable
  Activity Entries are required behavior.

### Separate documents for `full` and `tldr`

- Pros: Each mode can evolve independently.
- Cons: Shared metadata and publication state would be duplicated, and the
  two modes could drift or publish at different times.
- Rejected: The modes are two fixed views of one homepage document and must be
  published together.

### Autosave

- Pros: Reduces the chance of losing unsaved editor changes.
- Cons: It creates revision noise, makes the Operator's intended save point
  unclear, and increases concurrency and retention costs.
- Rejected for the first release: explicit Save Draft provides a clear,
  auditable boundary. Autosave can be reconsidered with a separate decision.

## Consequences

- D1 becomes the source of truth for homepage content, revision history,
  publication pointers, and Activity Entries. It must be added as new
  dashboard infrastructure; existing R2 objects and shortlink records stay in
  their current namespaces.
- The public renderer can serve published content and Access-protected
  previews through one rendering path, which reduces preview drift. Preview
  caching and indexing must remain disabled.
- Constrained blocks and typed links improve validation and security but limit
  editor flexibility. New block types or variants need an explicit model
  change and decision.
- Immutable payloads and retained history make rollback and audit reliable,
  but D1 storage grows with every explicit save and Activity Entry. The first
  release accepts that retention cost and provides no hard delete.
- Atomic publication makes the document pointer and revision states change as
  one unit. The implementation must handle optimistic concurrency, validation
  failures, and transaction conflicts without exposing a partially published
  homepage.
- The initial import can be safely retried because it is idempotent and
  hash-verified. The migration still needs a separately approved production
  execution and a proof that the imported output matches the current source.
