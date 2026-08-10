# ADR-0001: Use human-readable labels in shortlink analytics

## Status

Accepted

## Date

2026-08-09

## Context

Shortlink click events used the random shortlink code as the Analytics Engine
index. Cloudflare dashboards therefore grouped clicks under values such as
`xucU`, which are useful for exact lookup but poor for reporting.

Analytics Engine data points are append-only for this workflow. Renaming the
existing dataset would mix old code-indexed rows with new label-indexed rows.

## Decision

Write future click events with a bounded, human-readable label as `index1`.
Keep the random code in `blob1` for exact investigation. Store target kind,
campaign fields, and the referrer origin in additional blobs. The dataset
name stayed `leenk_shortlinks` (see the addendum below).

Shortlink labels accept at most 64 letters, numbers, dots, underscores, or
hyphens. The Worker derives a label from the target when the caller does not
provide one. Authenticated API and CLI callers can provide an explicit label.

Lifecycle events store the same label in the site-events dataset without
recording the shortlink code or target path.

## Alternatives considered

### Keep the existing dataset and change `index1`

This needs less configuration work but mixes cryptic historical indexes with
human-readable future indexes. It also makes dashboard trends harder to read.

### Keep only SQL aliases

SQL aliases improve query output but do not change labels in Cloudflare's
built-in dashboard views. They also require every dashboard query to repeat
the alias mapping.

## Consequences

- New dashboard groups use stable, readable labels.
- Historical code-indexed rows remain queryable in `leenk_shortlinks`.
- The random code remains available for exact link investigation.
- Labels must stay curated and bounded to avoid leaking private paths or query
  strings into analytics.

## Addendum (2026-08-10): single dataset name

The label migration originally used a new `leenk_shortlinks_v2` dataset to
keep code-indexed and label-indexed rows apart. That separation was rolled
back on operator request: new clicks are written to the original
`leenk_shortlinks` dataset with the label as `index1`. The two row
generations share one table until Analytics Engine's three-month retention
ages the legacy rows out. The dashboard labels this mixed view truthfully and
does not claim legacy codes are human-readable labels. The `v2` dataset name
is gone from the stack, queries, and documentation.
