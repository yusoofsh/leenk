# Dashboard analytics data access

Research date: 2026-08-09

## Decision summary

Use a server-only adapter for Workers Analytics Engine. Keep Cloudflare Web
Analytics RUM and Workers observability as separate products with separate
access paths.

The dashboard should expose a small allowlist of named reports. It should not
accept SQL, a dataset name, a selected column list, or a raw Cloudflare API
request from the browser.

The current data sources are:

- `leenk_shortlinks`: shortlink click events, with a readable label as
  `index1` for rows written after the label migration. Legacy rows in the
  same dataset still use the random short code as `index1` and age out with
  retention.
- `leenk_site_events`: allowlisted engagement, error, and authenticated
  lifecycle events, with the event name as `index1`.
- Cloudflare Web Analytics: browser RUM and Web Vitals shown in Cloudflare's
  Web Analytics product. It is not a supported custom data source for this
  Worker dashboard.
- Workers Logs and Traces: operational telemetry shown in Cloudflare
  Observability. They are not Analytics Engine tables.

## Analytics Engine SQL API

Cloudflare documents one account-scoped SQL endpoint:

```text
POST https://api.cloudflare.com/client/v4/accounts/<account_id>/analytics_engine/sql
Authorization: Bearer <token>
```

The SQL text is the POST body. Cloudflare documents `JSON`, `JSONEachRow`, and
`TabSeparated` output through the SQL `FORMAT` clause. `SHOW TABLES` lists
datasets, but it must remain an operator-only diagnostic and must not become a
browser API.

Sources: [Workers Analytics Engine SQL API](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/),
[SQL statements](https://developers.cloudflare.com/analytics/analytics-engine/sql-reference/statements/),
and [querying Analytics Engine from a Worker](https://developers.cloudflare.com/analytics/analytics-engine/worker-querying/).

### Authentication and permissions

The token needs the account-level `Account | Account Analytics | Read`
permission. The token is a Cloudflare API bearer token, not the existing
`STATIC_UPLOAD_TOKEN`. Cloudflare recommends storing the account ID as a Worker
environment value and the API token as a Worker secret when a Worker calls the
SQL API.

The future dashboard adapter should therefore have:

- a non-secret account identifier, such as `CLOUDFLARE_ACCOUNT_ID`;
- a secret containing only the scoped `Account Analytics Read` token;
- no Cloudflare token in browser JavaScript, HTML, local storage, or dashboard
  API responses.

Source: [Querying Workers Analytics Engine from a Worker](https://developers.cloudflare.com/analytics/analytics-engine/worker-querying/).

### Table shape and sampling

Each Analytics Engine dataset becomes a table after the Worker writes data.
The documented columns are `dataset`, `timestamp`, `_sample_interval`, one
`index1`, `blob1` through `blob20`, and `double1` through `double20`.

`_sample_interval` is the number of original rows represented by a sampled
row. Count and sum queries must use it. For this repository, `double1` is
always `1`, so a weighted event count is:

```sql
SUM(_sample_interval * double1)
```

Do not present a raw `COUNT()` as an exact event total. Index-based sampling
uses the dataset index as its sampling key, so the shortlink label and the
site event name are also the sampling boundaries.

Source: [SQL API table structure and sampling](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/).

### Current dataset schemas

The current repository documents and implements these layouts:

`leenk_shortlinks`, written by `src/lib/shortlinks.ts` through the
`SHORTLINK_ANALYTICS` binding. Rows written before the label migration
predate this shape: their `blob2` is the campaign name and their `index1` is
the short code. Both generations share the table until retention expires;
there is no query-side marker that separates them:

```text
blob1: random shortlink code
blob2: bounded human-readable shortlink label
blob3: target kind (`static` or `internal`)
blob4: campaign name
blob5: campaign source
blob6: campaign medium
blob7: referrer origin only
double1: 1
index1: human-readable shortlink label
```

`leenk_site_events`, written by `src/lib/site-analytics.ts` through the
`SITE_ANALYTICS` binding:

```text
blob1: event name
blob2: bounded dimension, when applicable
blob3: referrer origin only
blob4: bounded human-readable shortlink label for lifecycle events
double1: 1
index1: event name
```

The accepted event names and dimensions are the allowlists in
`src/lib/site-analytics.ts`. The browser event route is POST-only,
JSON-only, and capped at `512` bytes by
`src/pages/api/analytics/events.ts`. Lifecycle events are recorded by the
server-side upload, shortlink, and delete paths.

The repository's current custom taxonomy is:

- `bio_mode_viewed` and `bio_mode_changed`: `full` or `tldr`.
- `content_section_viewed`: `what_i_do`, `selected_work`, or `beyond_work`.
- `scroll_depth_reached`: `25`, `50`, `75`, or `90`.
- `time_on_page_reached`: `10`, `30`, or `60` active seconds.
- `outbound_link_clicked`: `nadi`, `ydsf`, or `electgo`.
- `social_link_clicked`: `github`, `linkedin`, or `twitter`.
- `contact_link_clicked`: `email`.
- `internal_link_clicked`: `home`.
- `error_page_viewed`: `not_found`.
- `client_error`: `runtime`, `resource`, or `promise`.
- `shortlink_created`: `internal` or `static`.
- `shortlink_deleted`.
- `static_file_uploaded`: `with_shortlink` or `without_shortlink`.
- `static_file_deleted`.

### Historical compatibility

Rows written before the label migration use this layout. They share the
`leenk_shortlinks` dataset with label-indexed rows written after the
migration:

```text
blob1: random shortlink code
blob2: campaign name
blob3: campaign source
blob4: campaign medium
blob5: referrer origin only
double1: 1
index1: random shortlink code
```

The dashboard presents one shortlink report over the shared dataset. Legacy
rows appear with the short code in the label column, and the UI says plainly
that codes predate the label migration. There is no query-side marker that
separates the row generations, and Analytics Engine retention clears the
legacy rows within three months. ADR-0001 records this decision and its
2026-08-10 addendum records the merge back to the single dataset name.

## Query examples for fixed reports

These examples use documented Analytics Engine date and time functions and
return JSON. The dashboard adapter should bind validated dates into a known
query template, not concatenate arbitrary user SQL.

### Shortlink clicks by day and label

```sql
SELECT
  toStartOfInterval(timestamp, INTERVAL '1' DAY) AS day,
  index1 AS label,
  SUM(_sample_interval * double1) AS clicks
FROM leenk_shortlinks
WHERE timestamp >= toDateTime('2026-07-10 00:00:00')
  AND timestamp < toDateTime('2026-08-09 00:00:00')
GROUP BY day, label
ORDER BY day ASC, label ASC
LIMIT 1000
FORMAT JSON
```

The `toDateTime` literals are UTC. The endpoint should validate an ISO date,
convert it to a UTC SQL literal, require `start < end`, and enforce its own
maximum range. A `30` day default and `90` day maximum fit within Analytics
Engine's documented retention, but those are application limits, not Cloudflare
limits.

### Shortlink campaign breakdown

```sql
SELECT
  index1 AS label,
  blob4 AS campaign,
  blob5 AS source,
  blob6 AS medium,
  SUM(_sample_interval * double1) AS clicks
FROM leenk_shortlinks
WHERE timestamp >= toDateTime('2026-07-10 00:00:00')
  AND timestamp < toDateTime('2026-08-09 00:00:00')
GROUP BY label, campaign, source, medium
ORDER BY clicks DESC, label ASC
LIMIT 100
FORMAT JSON
```

### Site events by day, event, and dimension

```sql
SELECT
  toStartOfInterval(timestamp, INTERVAL '1' DAY) AS day,
  blob1 AS event,
  blob2 AS dimension,
  SUM(_sample_interval * double1) AS events
FROM leenk_site_events
WHERE timestamp >= toDateTime('2026-07-10 00:00:00')
  AND timestamp < toDateTime('2026-08-09 00:00:00')
GROUP BY day, event, dimension
ORDER BY day ASC, event ASC, dimension ASC
LIMIT 1000
FORMAT JSON
```

Sources: [date and time functions](https://developers.cloudflare.com/analytics/analytics-engine/sql-reference/date-time-functions/),
[SQL statements](https://developers.cloudflare.com/analytics/analytics-engine/sql-reference/statements/),
and the repository schema in `README.md`, `src/lib/shortlinks.ts`, and
`src/lib/site-analytics.ts`.

### Pagination and limits

Analytics Engine SQL supports `LIMIT` and `OFFSET`, but its documented API
does not provide a cursor token or a response continuation protocol. The
dashboard should avoid row pagination for charts. Fixed aggregate reports
should use a result cap such as `1000` rows for a time series and `100` rows for
a ranked breakdown.

If a future investigation table needs pages, use a server-enforced page size,
an absolute maximum offset, a stable `ORDER BY`, and an opaque server cursor.
Do not pass a client-provided offset directly to an unbounded query. An
append-only dataset can change between pages, so offset pages are not a stable
snapshot. Prefer a keyset cursor over a stable timestamp and tie-breaker when
raw rows are truly required.

Analytics Engine's published write limits are twenty blobs, twenty doubles,
one index, `16 KB` total blob data per data point, a `96` byte maximum index,
and `250` data points per Worker invocation. Its documented data retention is
three months. Those limits apply to the current datasets and explain why the
dashboard must not promise arbitrary long-term event history.

Sources: [SQL statements](https://developers.cloudflare.com/analytics/analytics-engine/sql-reference/statements/)
and [Analytics Engine limits and retention](https://developers.cloudflare.com/analytics/analytics-engine/limits/).

## Recommended server API

The first implementation should add server-only, owner-protected endpoints
with named report identifiers, for example:

```text
GET /api/dashboard/analytics/shortlinks?start=YYYY-MM-DD&end=YYYY-MM-DD
GET /api/dashboard/analytics/site-events?start=YYYY-MM-DD&end=YYYY-MM-DD
GET /api/dashboard/analytics/shortlinks/history?start=YYYY-MM-DD&end=YYYY-MM-DD
```

Each route should:

1. Require the same owner-only Cloudflare Access boundary as `/dashboard`.
2. Validate dates, range, and any bounded label or event filter.
3. Select one query template from code. Never accept `sql`, `dataset`,
   `SELECT`, `FROM`, `ORDER BY`, or arbitrary field names from the client.
4. Call the Analytics Engine SQL API from the Worker with the server secret.
5. Validate the response shape, drop unneeded columns, and return a small
   typed JSON object for the shadcn dashboard.
6. Return `Cache-Control: private, max-age=60, stale-while-revalidate=300` for
   successful read reports. Do not use a shared cache for Access-protected
   data, and do not cache authentication failures or upstream errors.
7. Use `Cache-Control: no-store` for mutation responses and any response that
   contains operational details beyond the normalized report.

The dashboard should show the query's time range and a sampling note. If the
response has weighted totals, label them as Analytics Engine counts. Do not
call them unique visitors, exact page views, revenue, or all-time totals.

The API must not expose `SHOW TABLES`, arbitrary `FORMAT`, raw SQL errors,
Cloudflare tokens, upstream response headers, account IDs, or raw data points.

## Cloudflare Web Analytics

Cloudflare Web Analytics is privacy-first browser RUM. Its beacon reports page
views, performance metrics, dimensions, and Web Vitals to Cloudflare. The
official FAQ states that the RUM endpoint is an ingestion endpoint for the
beacon and that Cloudflare does not support custom integrations directly with
it. A dashboard Worker must not call `/cdn-cgi/rum`, scrape Cloudflare's private
dashboard requests, or claim that the RUM data is available through the
Analytics Engine SQL endpoint.

The official Web Analytics FAQ also states:

- Web Analytics shows client-side analytics. Server-side URL breakdowns need
  the advanced HTTP traffic analytics available to Pro, Business, and
  Enterprise customers.
- The current Web Analytics access window is the previous six months.
- Unsampled beacon data is kept for seven days, then long-term data is
  aggregated to around ten percent of the original volume.
- Dashboard and GraphQL aggregation can apply dynamic sampling from `0.0001%`
  to `100%`, and the GraphQL response exposes `sampleInterval`.
- Web Analytics does not currently log UTM query parameters or support custom
  events.
- RUM measures the initial client request and cannot measure Worker
  subrequests.

The Cloudflare GraphQL Analytics API is a separate account and zone analytics
API at `https://api.cloudflare.com/client/v4/graphql`. A 2026-08-25 check of
the public schema shows `workersAnalyticsEngineAdaptiveGroups` as a beta
account node ("Custom Events with adaptive sampling"). Its documented fields
are `count` and `dimensions` (`dataset`, `date`, and several datetime
buckets). It does not expose Analytics Engine blobs, doubles, or `index1`.

The dashboard therefore uses GraphQL only for allowlisted dataset volume
(`leenk_shortlinks` and `leenk_site_events`) on
`GET /api/dashboard/analytics/volume`. Label, campaign, and engagement
breakdowns stay on the Analytics Engine SQL reports. The Worker does not
query RUM nodes (`rumPageloadEventsAdaptiveGroups`,
`rumPerformanceEventsAdaptiveGroups`, `rumWebVitalsEventsAdaptive*`),
Workers invocation traces, or Log Explorer. If the node is missing or
disabled for an account, the volume report returns empty data with
`meta.entitlement` rather than placeholder counts.

Sources: [Web Analytics overview](https://developers.cloudflare.com/web-analytics/about/),
[Web Analytics data and metrics](https://developers.cloudflare.com/web-analytics/data-metrics/),
[Web Analytics FAQ](https://developers.cloudflare.com/web-analytics/faq/),
[GraphQL Analytics API](https://developers.cloudflare.com/analytics/graphql-api/),
and [GraphQL API limits](https://developers.cloudflare.com/analytics/graphql-api/limits/).

For `/dashboard`, show the Analytics Engine SQL reports plus GraphQL dataset
volume when the Adaptive Groups node is entitled. Keep Cloudflare Web
Analytics as a product link for RUM and Web Vitals. Do not duplicate RUM
cards.

## Workers Logs and Traces

The current `wrangler.jsonc` enables invocation logs and traces. That proves
collection is configured, not that the Worker can query those records through
its bindings.

Workers Logs are visible in the Cloudflare Workers Observability dashboard.
The Query Builder searches the Workers Observability dataset. Cloudflare also
documents a separate Log Explorer SQL API at:

```text
POST https://api.cloudflare.com/client/v4/accounts/<account_id>/logs/explorer/query/sql
POST https://api.cloudflare.com/client/v4/zones/<zone_id>/logs/explorer/query/sql
```

That API has its own dataset and permission model. It must not be treated as a
drop-in query path for the `SITE_ANALYTICS` or `SHORTLINK_ANALYTICS` tables.
If the dashboard adds a logs view later, use named, narrow queries against a
verified Log Explorer dataset and redact request URLs, identity fields,
headers, bodies, and exception details before returning data.

Workers Traces provide automatic spans for handler, fetch, and binding calls.
Cloudflare documents dashboard viewing, sampling, and OpenTelemetry or
Logpush export. The current official material does not provide a general
Worker-side trace query endpoint that can be safely assumed for `/dashboard`.
The first dashboard should link to Cloudflare Observability for traces rather
than inventing a trace API.

Current retention is short: Workers Logs document a maximum of seven days, and
Workers Free and Paid plans document three and seven days respectively in the
observability limits tables. Traces use the same event and retention table.
Both surfaces can sample, and real-time logs can enter sampling mode for
high-traffic applications.

Sources: [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/),
[Observability Query Builder](https://developers.cloudflare.com/workers/observability/query-builder/),
[Log Explorer API](https://developers.cloudflare.com/log-explorer/api/),
[Workers Traces](https://developers.cloudflare.com/workers/observability/traces/),
and [Workers real-time logs](https://developers.cloudflare.com/workers/observability/logs/real-time-logs/).

## Privacy and truthful UI claims

The repository's instrumentation is intentionally bounded:

- It stores only referrer origins, not full referrer URLs.
- It uses curated event names and bounded dimensions.
- Lifecycle data uses a readable label but does not record the shortlink code or
  target path in `leenk_site_events`.
- It does not record email addresses, account names, IP addresses, request
  bodies, complete URLs, messages, stack traces, or other user identity in the
  Analytics Engine datasets.
- Analytics writes are best-effort and do not block navigation, redirects,
  uploads, or deletes.

Workers Logs have a different privacy boundary. Invocation metadata and
`console` output can contain request and response details. The current
shortlink error log includes the request method and shortlink code. Raw logs
must not be copied into the dashboard without a separate redaction policy.

The dashboard may truthfully show:

- weighted Analytics Engine event and click counts for the retained range;
- bounded labels, campaign dimensions, referrer origins, and event dimensions;
- a sampling-aware time series and ranked breakdown;
- a short operational link to Cloudflare Web Analytics and Workers
  Observability.

The dashboard must not claim to show:

- exact all-time click or engagement history beyond Analytics Engine's three
  month retention;
- unique visitors or user identity from the current custom events;
- Web Analytics RUM values through a custom Worker API;
- UTM-based attribution from Web Analytics;
- server-side URL analytics on plans without the advanced HTTP traffic product;
- complete or long-term Workers Logs and Traces history;
- unsampled or exact totals when Cloudflare has sampled the dataset.

## Open implementation gates

Before implementation, verify in the target Cloudflare account:

1. The scoped `Account Analytics Read` token can query the expected Analytics
   Engine table names without exposing the token.
2. `leenk_shortlinks` and `leenk_site_events` have received data in the target
   environment and return the documented columns.
3. `leenk_shortlinks` rows predating the label migration still carry the old
   code-indexed layout alongside the newer label-indexed rows.
4. The Cloudflare Access policy protects both `/dashboard` and every dashboard
   API route.
5. Any future Log Explorer endpoint has an explicit dataset, permission, and
   redaction decision.

These checks require account access and are not proven by repository source
alone. No Cloudflare credential, production query, or deployment was changed
for this research ticket.
