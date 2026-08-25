# Dashboard design spec

Review date: 2026-08-09

Scope: production `/dashboard` for the Leenk owner console, based on the A/B/C prototype in `src/pages/prototype/dashboard.astro`.

Method: read-only review of the prototype, the analytics data-access research, ADR-0002, and the event/shortlink models. The design-taste-frontend skill is out of scope for dashboards (Section 13); only its transferable criteria apply here: color consistency lock, shape consistency, WCAG AA button and form contrast, full loading/empty/error states, no AI tells, density discipline, zero em-dashes in UI copy, and one design system.

## One-line design read

A dense, neutral owner console where a persistent labeled sidebar gives every module a visible home, KPI and chart cards carry the overview, and dense tables carry record work, with a single blue accent, full loading/empty/error states, and truthful Analytics Engine labels.

## Variant audit

### Variant A: Rail and workspace

Strengths

- Persistent 16rem sidebar keeps all nine modules visible with full labels and two groups (Workspace, System), which scales past a top-nav limit.
- Environment switcher and operator footer give durable context.
- KPI strip plus analytics, activity, and health panels form a scannable overview.
- Responsive: sidebar collapses to a horizontal scroll bar under 48rem; dark mode is implemented.

Weaknesses

- Numbered module icons (`01` to `09`) read as a decorative numbering tell; lucide icons are clearer and match shadcn.
- Fixed sidebar consumes width; the health rail pushes content on narrow screens (acknowledged tradeoff).
- Four-column KPI strip collapses to two columns, which is fine but compresses the labels.
- "Visits in the last 30 days / 1,284" and "Page views" are presented as exact numbers; the research requires weighted Analytics Engine counts with a sampling note, never "page views" or exact totals.
- "Available Assets" capitalizes Assets while other labels do not.

Transferable-criteria violations

- Numbered eyebrow-style module markers.
- Exact-count KPI labels that the data model cannot support truthfully.

### Variant B: Command center

Strengths

- Dense resource table with search and filter is the right shape for record work.
- Quick-action band puts create-style actions at the top.
- Analytics drawer with mini bars and a compact activity list uses horizontal space efficiently.

Weaknesses

- Nine modules in a horizontal top nav cram the header and wrap on mobile (acknowledged tradeoff).
- The table has `min-width: 38rem`, forcing horizontal scroll on phones.
- Quick actions are inert placeholders with no labels about what they create.
- The analytics drawer shows "1,284 / Visits / last 30 days" as an exact number with no range or sampling context.

Transferable-criteria violations

- Exact-count analytics label.
- Cramped nav at desktop width; the skill's one-line nav check does not survive nine items.

### Variant C: Focus queue

Strengths

- Queue-first workflow surfaces "Needs your attention" items with priority marks; this is a strong Overview composition.
- Compact icon rail and resource summary keep the surface minimal.
- Priority affordance maps well to an Activity-driven operator flow.

Weaknesses

- Visible module labels are `module.slice(0, 3)` three-letter abbreviations ("Ove", "Con"), which are cryptic and force the user to hover or guess; this is the clearest clarity failure across the three variants.
- The rail hides less-used modules behind deliberate selection (acknowledged tradeoff).
- Numbered priority marks mix a "!" with "2", "3", "4", an inconsistent pattern.
- Empty cards reuse module names as index text, which is inconsistent with the numbered-empty pattern used elsewhere.

Transferable-criteria violations

- Cryptic truncated labels (an AI tell and an accessibility failure for the visible text).
- Inconsistent priority numbering.

## Recommendation

Variant A becomes the production base. It is the only shell that keeps all nine modules labeled and reachable at every breakpoint, and its sidebar layout maps directly onto the shadcn sidebar primitive with sidebar groups matching the Workspace/System split.

Adopt from the other variants, do not merge their shells:

- From B: the dense resource table with search and filter becomes the standard table pattern for Content, Files, Shortlinks, and Campaigns; the quick-action band becomes a page toolbar (Create, Upload, Publish).
- From C: the focus queue becomes the Overview "Needs your attention" panel; the resource summary becomes the Overview KPI cards.

Production uses shadcn/ui only. `components.json` already declares `new-york`, `zinc`, `lucide`, CSS variables, and `~/components/ui`; no `ui` components exist yet, so the one-pass build adds them from the shadcn registry.

## Production spec

### Page shell

- Layout: shadcn `sidebar` (SidebarProvider, Sidebar, SidebarInset, SidebarHeader, SidebarContent, SidebarGroupLabel, SidebarMenuButton, SidebarFooter, SidebarTrigger for mobile), with the two groups Workspace (Overview, Content, Files, Shortlinks, Campaigns) and System (Analytics, Activity, Operations, Settings).
- Header: `breadcrumb` for the current module, environment `select` (Development and Production only), theme `dropdown-menu` (reuse the existing mode toggle), and an operator `dropdown-menu` with an `avatar`.
- Route: `/dashboard` behind the same owner-only Better Auth session and capability boundary as every dashboard API route. No Web Analytics data anywhere on the page.
- Accessibility: skip link, focus-visible rings via the ring token, `aria-current` on the active nav item, tabular numerals for all counts.

### Module list and shadcn mapping

The nine modules stay unchanged. Justification for keeping each one: Overview (aggregate view), Content (D1 CMS per ADR-0002), Files (R2 assets), Shortlinks (R2-backed shortlink records), Campaigns (a derived report over the campaign dimensions on shortlinks, not a new storage class), Analytics (Analytics Engine reports), Activity (D1 Activity Entries), Operations (binding health and Cloudflare link-outs), Settings (environment and operator preferences). No invented modules: no Users, Billing, Teams, or automation surfaces.

| Module     | Components                                                                                                                  | Data source                                                                                    | Notes                                                                                                                                                                                                                                                                                                               |
| ---------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Overview   | `card`, `badge`, `chart`, `table`, `skeleton`, `alert`, `button`                                                            | KPI totals from Analytics Engine reports; recent rows from Activity; focus queue from Activity | KPI cards show weighted counts with "Analytics Engine" and the range; the chart is the shortlink or site-event time series; the queue panel lists items that need attention                                                                                                                                         |
| Content    | `table`, `badge`, `tabs`, `dialog`, `sheet`, `input`, `textarea`, `select`, `dropdown-menu`, `button`, `sonner`, `skeleton` | D1 Content Document and Revisions per ADR-0002                                                 | Tabs switch full/tldr; publish and rollback use confirm `dialog`; Save Draft edits in a `sheet` or dedicated route; status badges Published/Draft/Archived; optimistic concurrency on save; toast on publish                                                                                                        |
| Files      | `table`, `badge`, `input`, `select`, `button`, `dropdown-menu`, `dialog`, `sonner`, `skeleton`                              | R2 `STATIC_FILES` list and metadata                                                            | Upload button in the toolbar; delete opens the typed DELETE confirm dialog; search and type filter                                                                                                                                                                                                                  |
| Shortlinks | `table`, `badge`, `input`, `select`, `dialog`, `button`, `sonner`, `skeleton`                                               | R2 shortlink storage and `leenk_shortlinks`                                                    | Columns: label, code, target kind (static/internal), campaign, status, updated; create and delete dialogs                                                                                                                                                                                                           |
| Campaigns  | `table`, `chart`, `select`, `badge`, `button`, `skeleton`                                                                   | `leenk_shortlinks` campaign breakdown (blob4/5/6)                                              | Ranked breakdown by campaign, source, medium; no separate campaign entity in the first release                                                                                                                                                                                                                      |
| Analytics  | `tabs`, `chart`, `card`, `table`, `select`, `alert`, `skeleton`, `button`                                                   | `leenk_shortlinks` and `leenk_site_events` via SQL, plus GraphQL Adaptive Groups volume        | Tabs for Shortlinks, Site events, Dataset volume, Legacy history; range select 7/30/90 days (30 default, 90 max); SQL counts labeled "Analytics Engine counts"; GraphQL totals labeled Adaptive Groups; legacy rows shown as codes until retention expires; link-outs to Cloudflare Web Analytics and Observability |
| Activity   | `table`, `badge`, `dropdown-menu`, `skeleton`                                                                               | D1 Activity Entries                                                                            | Sorted by time; badge per activity kind; row menu opens the related module                                                                                                                                                                                                                                          |
| Operations | `card`, `badge`, `alert`, `button`, `skeleton`                                                                              | Worker binding health plus static link-outs                                                    | Shows binding availability for the public renderer, R2, D1, and Analytics Engine; links to Cloudflare dashboards; never copies raw logs or traces                                                                                                                                                                   |
| Settings   | `tabs`, `input`, `select`, `button`, `sonner`                                                                               | Operator-owned preferences                                                                     | Environment selector and bounded preference fields only; nothing invented                                                                                                                                                                                                                                           |

### State handling per module

Every module runs its own data hook against the server API, so one failing report never tears down the page.

- Loading: `skeleton` placeholders shaped like the live layout (KPI row, chart block, table rows).
- Empty: module-specific empty state with a primary action (Open Files, Create Shortlink, View Analytics) and no decorative numbering.
- Error: inline `alert` with the failing surface named, a Retry button, and the rest of the page intact.
- Live: data with a source caption ("Analytics Engine", the range) on every analytics surface.

API behavior comes from the research doc: read responses use `Cache-Control: private, max-age=60, stale-while-revalidate=300`; mutations use `no-store`. Dates are validated server-side, `start < end`, 30-day default, 90-day maximum.

### Tokens

Keep the zinc neutrals in `src/styles/global.css` (background, foreground, card, muted, border, input, sidebar tokens) and the `0.625rem` radius. Add exactly one accent with these values:

- Light: `--accent: oklch(0.5 0.18 258)` with `--accent-foreground: oklch(0.99 0 0)`
- Dark: `--accent: oklch(0.72 0.15 258)` with `--accent-foreground: oklch(0.18 0.01 258)`

Apply the accent to active nav states, links, focus rings, selected states, and `chart-1`; keep the existing primary (zinc foreground) for primary buttons so button contrast stays WCAG AA. Use `chart-1` through `chart-5` only as data series colors, not as decorative accents.

### What to drop or fix from the prototype

- Drop the numbered module icons and numbered empty-card indexes; use lucide icons and real labels.
- Drop the three-letter rail abbreviations from variant C; full labels only.
- Drop all "Sample data" badges in production; replace with the real source caption.
- Drop exact counts such as "1,284 visits" and the label "Page views"; use weighted Analytics Engine counts with range and sampling note.
- Fix the inconsistent "Available Assets" capitalization.
- Keep the density discipline: small table type, tabular numbers, tight card padding; do not inflate type sizes on a dashboard.
- Keep one design system: shadcn/ui only, no hand-rolled pattern library mixed in.
- Keep dark mode by reusing the existing `.dark` tokens.
- Never treat Cloudflare Web Analytics as dashboard data; the Analytics module renders only Analytics Engine reports and links out to the Cloudflare Web Analytics product for RUM and Web Vitals.

## Implementable in one pass

1. Add the shadcn UI components referenced above via `npx shadcn@latest add` (button, card, badge, table, tabs, sheet, select, input, textarea, skeleton, separator, dropdown-menu, dialog, avatar, sonner, alert, breadcrumb, sidebar, tooltip, chart).
2. Add the `--accent` tokens to `src/styles/global.css` in `:root` and `.dark`.
3. Build the shell route at `src/pages/dashboard/index.astro` (or `/dashboard`) with the sidebar, header, and module routing.
4. Build each module component under `src/components/dashboard/` with its own hook and state handling.
5. Add the server analytics API routes (shortlinks, site-events, shortlinks/history) per the research doc, then wire the Analytics module to them.
6. Add the D1 binding and the Content, Activity, and Campaigns modules per ADR-0002; the first pass renders the D1-backed modules only when the binding exists and shows a clear unavailable state otherwise.

## RESULT

A production spec for the Leenk dashboard is written to `docs/dashboard-design-spec.md`. Variant A is the recommended base, with the resource table adopted from B and the focus queue and resource summary adopted from C. The nine-module list is unchanged, the shadcn mapping and state handling are defined per module, one blue accent is specified with exact values, and the spec forbids treating Cloudflare Web Analytics as dashboard data.

## EVIDENCE

- `src/pages/prototype/dashboard.astro` (variants A/B/C and their states, CSS tokens, tradeoffs)
- `docs/research/2026-08-09-dashboard-analytics-data-access.md` (Analytics Engine SQL API, sampling, weighted counts, retention, truthful claims, server API shape)
- `docs/decisions/0002-d1-content-revisions-and-publishing.md` (Content Document, Revisions, Blocks, publish/rollback, Activity Entries)
- `src/lib/site-analytics.ts` and `src/lib/shortlinks.ts` (event taxonomy, shortlink and campaign models, dimension allowlists)
- `components.json` and `src/styles/global.css` (new-york, zinc, lucide, CSS variables, existing tokens)
- `~/.agents/skills/design-taste-frontend/SKILL.md` Section 13 (dashboards out of scope; transferable criteria only)
- `wrangler.jsonc` (current bindings: R2 STATIC_FILES, SHORTLINK_ANALYTICS, SITE_ANALYTICS; no D1 binding yet)

## UNRESOLVED

- D1 is not yet a Worker binding, so the Content, Activity, and Campaigns modules depend on the ADR-0002 D1 work landing first.
- The Analytics Engine SQL API still needs a live account check for the scoped Account Analytics Read token and the three table names before the Analytics module can be verified end to end.
- The Cloudflare Access policy for `/dashboard` and its API routes must be confirmed in the target account.
