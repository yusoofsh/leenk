import { useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";

import {
  AnalyticsCaption,
  ChartSkeleton,
  GraphqlEntitlementAlert,
  ModuleError,
} from "~/components/dashboard/module-primitives";
import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "~/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  analyticsRange,
  dashboardFetch,
  formatCount,
  type AnalyticsRow,
  type DashboardMeta,
} from "~/lib/dashboard/client";

type ReportKey =
  | "history"
  | "rum"
  | "shortlinks"
  | "site-events"
  | "vitals"
  | "volume"
  | "workers";
type TabKey = Exclude<ReportKey, "vitals">;
type RangeDays = 7 | 30 | 90;

const REPORT_PATHS: Record<ReportKey, string> = {
  history: "/api/dashboard/analytics/shortlinks/history",
  rum: "/api/dashboard/analytics/rum",
  "site-events": "/api/dashboard/analytics/site-events",
  shortlinks: "/api/dashboard/analytics/shortlinks",
  vitals: "/api/dashboard/analytics/vitals",
  volume: "/api/dashboard/analytics/volume",
  workers: "/api/dashboard/analytics/workers",
};

const TAB_KEYS: TabKey[] = [
  "shortlinks",
  "site-events",
  "volume",
  "rum",
  "workers",
  "history",
];

const CHART_CONFIG = {
  clicks: {
    color: "var(--chart-1)",
    label: "Clicks",
  },
  errors: {
    color: "var(--chart-5)",
    label: "Errors",
  },
  events: {
    color: "var(--chart-2)",
    label: "Events",
  },
  leenk_shortlinks: {
    color: "var(--chart-1)",
    label: "Shortlink clicks",
  },
  leenk_site_events: {
    color: "var(--chart-2)",
    label: "Site events",
  },
  pageviews: {
    color: "var(--chart-1)",
    label: "Page views",
  },
  requests: {
    color: "var(--chart-3)",
    label: "Requests",
  },
  visits: {
    color: "var(--chart-2)",
    label: "Visits",
  },
} satisfies ChartConfig;

interface ReportState {
  error?: { message: string };
  loading: boolean;
  meta?: DashboardMeta;
  rows: AnalyticsRow[];
}

const EMPTY_REPORTS: Record<ReportKey, ReportState> = {
  history: { loading: false, rows: [] },
  rum: { loading: false, rows: [] },
  "site-events": { loading: false, rows: [] },
  shortlinks: { loading: false, rows: [] },
  vitals: { loading: false, rows: [] },
  volume: { loading: false, rows: [] },
  workers: { loading: false, rows: [] },
};

export function Analytics() {
  const [reportKey, setReportKey] = useState<TabKey>("shortlinks");
  const [days, setDays] = useState<RangeDays>(30);
  const [reports, setReports] =
    useState<Record<ReportKey, ReportState>>(EMPTY_REPORTS);

  const activeReport = reports[reportKey];
  const valueKey = reportKey === "site-events" ? "events" : "clicks";

  const loadReport = async (key: ReportKey) => {
    const range = analyticsRange(days);
    const query = new URLSearchParams({ end: range.end, start: range.start });
    setReports((current) => ({
      ...current,
      [key]: { ...current[key], loading: true },
    }));
    const result = await dashboardFetch<AnalyticsRow[]>(
      `${REPORT_PATHS[key]}?${query}`,
    );
    setReports((current) => ({
      ...current,
      [key]: result.ok
        ? { loading: false, meta: result.meta, rows: result.data }
        : { error: { message: result.message }, loading: false, rows: [] },
    }));
  };

  const loadTab = (key: TabKey) => {
    void loadReport(key);
    if (key === "rum") void loadReport("vitals");
  };

  const switchReport = (key: TabKey) => {
    setReportKey(key);
    const report = reports[key];
    if (!report.loading && report.rows.length === 0 && !report.error) {
      loadTab(key);
    }
  };

  const changeDays = (value: RangeDays) => {
    setDays(value);
    setReports(EMPTY_REPORTS);
    loadTab(reportKey);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="text-muted-foreground text-sm">
            Named SQL and GraphQL reports for the selected range
          </p>
        </div>
        <Select
          value={String(days)}
          onValueChange={(value) => {
            const parsed = Number(value);
            if (parsed === 7 || parsed === 30 || parsed === 90)
              changeDays(parsed);
          }}
          aria-label="Analytics range"
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs
        value={reportKey}
        onValueChange={(value) => {
          if (isTabKey(value)) switchReport(value);
        }}
      >
        <TabsList>
          <TabsTrigger value="shortlinks">Shortlinks</TabsTrigger>
          <TabsTrigger value="site-events">Site events</TabsTrigger>
          <TabsTrigger value="volume">Dataset volume</TabsTrigger>
          <TabsTrigger value="rum">Web Analytics</TabsTrigger>
          <TabsTrigger value="workers">Workers</TabsTrigger>
          <TabsTrigger value="history">Legacy history</TabsTrigger>
        </TabsList>
        <TabsContent value={reportKey}>
          {reportKey === "rum" ? (
            <div className="space-y-6">
              <ReportCard
                description="GraphQL rumPageloadEventsAdaptiveGroups page views and visits. Paths and user-agent dimensions are not queried."
                loading={reports.rum.loading}
                onRefresh={() => loadTab("rum")}
                title="Page views"
              >
                <ReportBody
                  emptyDescription="Web Analytics returned no pageload rows for this range."
                  meta={reports.rum.meta}
                  onRefresh={() => loadReport("rum")}
                  report={reports.rum}
                  reportKey="rum"
                />
              </ReportCard>
              <ReportCard
                description="GraphQL rumWebVitalsEventsAdaptiveGroups p75 quantiles. Element paths are not queried."
                loading={reports.vitals.loading}
                onRefresh={() => loadReport("vitals")}
                title="Web Vitals"
              >
                <ReportBody
                  emptyDescription="Web Analytics returned no Web Vitals rows for this range."
                  meta={reports.vitals.meta}
                  onRefresh={() => loadReport("vitals")}
                  report={reports.vitals}
                  reportKey="vitals"
                />
              </ReportCard>
            </div>
          ) : (
            <ReportCard
              description={tabDescription(reportKey)}
              loading={activeReport.loading}
              onRefresh={() => loadReport(reportKey)}
              title={tabTitle(reportKey)}
            >
              <ReportBody
                emptyDescription={tabEmptyDescription(reportKey)}
                meta={activeReport.meta}
                onRefresh={() => loadReport(reportKey)}
                report={activeReport}
                reportKey={reportKey}
                valueKey={valueKey}
              />
            </ReportCard>
          )}
        </TabsContent>
      </Tabs>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <a
            href="https://dash.cloudflare.com/"
            target="_blank"
            rel="noreferrer"
          >
            Open Cloudflare Web Analytics
          </a>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <a
            href="https://dash.cloudflare.com/"
            target="_blank"
            rel="noreferrer"
          >
            Open Workers Observability
          </a>
        </Button>
      </div>
    </div>
  );
}

function ReportCard({
  children,
  description,
  loading,
  onRefresh,
  title,
}: {
  children: ReactNode;
  description: string;
  loading: boolean;
  onRefresh: () => void;
  title: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? "Loading" : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function ReportBody({
  emptyDescription,
  meta,
  onRefresh,
  report,
  reportKey,
  valueKey,
}: {
  emptyDescription: string;
  meta: DashboardMeta | undefined;
  onRefresh: () => void;
  report: ReportState;
  reportKey: ReportKey;
  valueKey?: "clicks" | "events";
}) {
  if (report.loading && report.rows.length === 0) {
    return <ChartSkeleton />;
  }
  if (report.error) {
    return (
      <ModuleError
        error={{
          error: "REPORT_FAILED",
          message: report.error.message,
          ok: false,
          status: 0,
        }}
        onRetry={onRefresh}
        title="Could not load this report"
      />
    );
  }
  if (meta?.entitlement === "missing" || meta?.entitlement === "disabled") {
    return (
      <div className="space-y-4">
        <GraphqlEntitlementAlert
          description={entitlementDescription(reportKey, meta.entitlement)}
          entitlement={meta.entitlement}
          node={meta.node ?? reportNode(reportKey)}
          title={entitlementTitle(reportKey, meta.entitlement)}
        />
        <AnalyticsCaption
          entitlement={meta.entitlement}
          node={meta.node}
          range={meta.range ?? null}
          source={meta.source}
        />
      </div>
    );
  }
  if (report.rows.length === 0) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTitle>No data for this range</AlertTitle>
          <AlertDescription>{emptyDescription}</AlertDescription>
        </Alert>
        <AnalyticsCaption
          entitlement={meta?.entitlement}
          node={meta?.node}
          range={meta?.range ?? null}
          source={meta?.source}
        />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {reportKey === "volume" ? (
        <VolumeChart rows={report.rows} />
      ) : reportKey === "rum" ? (
        <RumChart rows={report.rows} />
      ) : reportKey === "workers" ? (
        <WorkersChart rows={report.rows} />
      ) : reportKey === "vitals" ? null : (
        <ReportChart rows={report.rows} valueKey={valueKey ?? "clicks"} />
      )}
      <AnalyticsCaption
        entitlement={meta?.entitlement}
        node={meta?.node}
        range={meta?.range ?? null}
        source={meta?.source}
      />
      <ReportTable
        rows={report.rows}
        valueKey={tableValueKey(reportKey, valueKey)}
      />
    </div>
  );
}

function ReportChart({
  rows,
  valueKey,
}: {
  rows: AnalyticsRow[];
  valueKey: "clicks" | "events";
}) {
  const series = aggregateByDay(rows, valueKey);
  const configKey = valueKey === "clicks" ? "clicks" : "events";
  return (
    <ChartContainer config={CHART_CONFIG} className="h-[16rem]">
      {valueKey === "clicks" ? (
        <BarChart data={series} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis tickLine={false} axisLine={false} width={44} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Bar dataKey={configKey} fill="var(--color-clicks)" radius={4} />
        </BarChart>
      ) : (
        <LineChart data={series} accessibilityLayer>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
          />
          <YAxis tickLine={false} axisLine={false} width={44} />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            dataKey={configKey}
            type="monotone"
            stroke="var(--color-events)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      )}
    </ChartContainer>
  );
}

function VolumeChart({ rows }: { rows: AnalyticsRow[] }) {
  const series = aggregateVolumeByDay(rows);
  return (
    <ChartContainer config={CHART_CONFIG} className="h-[16rem]">
      <BarChart data={series} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={44} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="leenk_shortlinks"
          fill="var(--color-leenk_shortlinks)"
          radius={4}
          stackId="volume"
        />
        <Bar
          dataKey="leenk_site_events"
          fill="var(--color-leenk_site_events)"
          radius={4}
          stackId="volume"
        />
      </BarChart>
    </ChartContainer>
  );
}

function RumChart({ rows }: { rows: AnalyticsRow[] }) {
  const series = aggregateRumByDay(rows);
  return (
    <ChartContainer config={CHART_CONFIG} className="h-[16rem]">
      <BarChart data={series} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={44} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="pageviews" fill="var(--color-pageviews)" radius={4} />
        <Bar dataKey="visits" fill="var(--color-visits)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}

function WorkersChart({ rows }: { rows: AnalyticsRow[] }) {
  const series = aggregateWorkersByDay(rows);
  return (
    <ChartContainer config={CHART_CONFIG} className="h-[16rem]">
      <BarChart data={series} accessibilityLayer>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis tickLine={false} axisLine={false} width={44} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar
          dataKey="requests"
          fill="var(--color-requests)"
          radius={4}
          stackId="workers"
        />
        <Bar
          dataKey="errors"
          fill="var(--color-errors)"
          radius={4}
          stackId="workers"
        />
      </BarChart>
    </ChartContainer>
  );
}

function ReportTable({
  rows,
  valueKey,
}: {
  rows: AnalyticsRow[];
  valueKey: string;
}) {
  const ranked = rows
    .toSorted((a, b) => Number(b[valueKey] ?? 0) - Number(a[valueKey] ?? 0))
    .slice(0, 50);
  const hasLabel = rows.some((row) => row.label !== undefined);
  const hasEvent = rows.some((row) => row.event !== undefined);
  const hasDataset = rows.some((row) => row.dataset !== undefined);
  const hasScript = rows.some((row) => row.scriptName !== undefined);
  const hasDay = rows.some((row) => row.day !== undefined);
  const hasVisits = rows.some((row) => row.visits !== undefined);
  const hasVitals = rows.some((row) => row.lcpP75 !== undefined);
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {hasDay ? <TableHead>Day</TableHead> : null}
            {hasLabel ? <TableHead>Label</TableHead> : null}
            {hasEvent ? <TableHead>Event</TableHead> : null}
            {hasEvent ? <TableHead>Dimension</TableHead> : null}
            {hasDataset ? <TableHead>Dataset</TableHead> : null}
            {hasScript ? <TableHead>Worker</TableHead> : null}
            {hasScript ? <TableHead>Status</TableHead> : null}
            {hasVisits ? (
              <TableHead className="text-right">Page views</TableHead>
            ) : null}
            {hasVisits ? (
              <TableHead className="text-right">Visits</TableHead>
            ) : null}
            {hasVitals ? (
              <TableHead className="text-right">LCP p75</TableHead>
            ) : null}
            {hasVitals ? (
              <TableHead className="text-right">INP p75</TableHead>
            ) : null}
            {hasVitals ? (
              <TableHead className="text-right">CLS p75</TableHead>
            ) : null}
            {hasVitals ? (
              <TableHead className="text-right">TTFB p75</TableHead>
            ) : null}
            {hasScript ? (
              <TableHead className="text-right">Requests</TableHead>
            ) : null}
            {hasScript ? (
              <TableHead className="text-right">Errors</TableHead>
            ) : null}
            {hasVisits || hasVitals || hasScript ? null : (
              <TableHead className="text-right">Count</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {ranked.map((row, index) => (
            <TableRow key={rowKey(row, valueKey, index)}>
              {hasDay ? (
                <TableCell className="tabular-nums">
                  {String(row.day ?? "")}
                </TableCell>
              ) : null}
              {hasLabel ? (
                <TableCell>{String(row.label ?? "Unknown")}</TableCell>
              ) : null}
              {hasEvent ? (
                <TableCell>{String(row.event ?? "Unknown")}</TableCell>
              ) : null}
              {hasEvent ? (
                <TableCell className="text-muted-foreground">
                  {String(row.dimension ?? "All")}
                </TableCell>
              ) : null}
              {hasDataset ? (
                <TableCell>{String(row.dataset ?? "Unknown")}</TableCell>
              ) : null}
              {hasScript ? (
                <TableCell>{String(row.scriptName ?? "Unknown")}</TableCell>
              ) : null}
              {hasScript ? (
                <TableCell>{String(row.status ?? "unknown")}</TableCell>
              ) : null}
              {hasVisits ? (
                <TableCell className="text-right tabular-nums">
                  {formatCount(row.pageviews)}
                </TableCell>
              ) : null}
              {hasVisits ? (
                <TableCell className="text-right tabular-nums">
                  {formatCount(row.visits)}
                </TableCell>
              ) : null}
              {hasVitals ? (
                <TableCell className="text-right tabular-nums">
                  {formatOptional(row.lcpP75)}
                </TableCell>
              ) : null}
              {hasVitals ? (
                <TableCell className="text-right tabular-nums">
                  {formatOptional(row.inpP75)}
                </TableCell>
              ) : null}
              {hasVitals ? (
                <TableCell className="text-right tabular-nums">
                  {formatOptional(row.clsP75)}
                </TableCell>
              ) : null}
              {hasVitals ? (
                <TableCell className="text-right tabular-nums">
                  {formatOptional(row.ttfbP75)}
                </TableCell>
              ) : null}
              {hasScript ? (
                <TableCell className="text-right tabular-nums">
                  {formatCount(row.requests)}
                </TableCell>
              ) : null}
              {hasScript ? (
                <TableCell className="text-right tabular-nums">
                  {formatCount(row.errors)}
                </TableCell>
              ) : null}
              {hasVisits || hasVitals || hasScript ? null : (
                <TableCell className="text-right tabular-nums">
                  {formatCount(row[valueKey])}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function aggregateByDay(rows: AnalyticsRow[], valueKey: string) {
  const byDay = new Map<string, number>();
  for (const row of rows) {
    const day = String(row.day ?? "Unknown");
    byDay.set(day, (byDay.get(day) ?? 0) + Number(row[valueKey] ?? 0));
  }
  return Array.from(byDay.entries())
    .toSorted(([a], [b]) => a.localeCompare(b))
    .map(([day, value]) => ({ day, [valueKey]: value }));
}

function aggregateVolumeByDay(rows: AnalyticsRow[]) {
  const byDay = new Map<
    string,
    { day: string; leenk_shortlinks: number; leenk_site_events: number }
  >();
  for (const row of rows) {
    const day = String(row.day ?? "Unknown");
    const current = byDay.get(day) ?? {
      day,
      leenk_shortlinks: 0,
      leenk_site_events: 0,
    };
    if (row.dataset === "leenk_site_events") {
      current.leenk_site_events += Number(row.count ?? 0);
    } else if (row.dataset === "leenk_shortlinks") {
      current.leenk_shortlinks += Number(row.count ?? 0);
    }
    byDay.set(day, current);
  }
  return Array.from(byDay.values()).toSorted((a, b) =>
    a.day.localeCompare(b.day),
  );
}

function aggregateRumByDay(rows: AnalyticsRow[]) {
  const byDay = new Map<
    string,
    { day: string; pageviews: number; visits: number }
  >();
  for (const row of rows) {
    const day = String(row.day ?? "Unknown");
    const current = byDay.get(day) ?? { day, pageviews: 0, visits: 0 };
    current.pageviews += Number(row.pageviews ?? 0);
    current.visits += Number(row.visits ?? 0);
    byDay.set(day, current);
  }
  return Array.from(byDay.values()).toSorted((a, b) =>
    a.day.localeCompare(b.day),
  );
}

function aggregateWorkersByDay(rows: AnalyticsRow[]) {
  const byDay = new Map<
    string,
    { day: string; errors: number; requests: number }
  >();
  for (const row of rows) {
    const day = String(row.day ?? "Unknown");
    const current = byDay.get(day) ?? { day, errors: 0, requests: 0 };
    current.requests += Number(row.requests ?? 0);
    current.errors += Number(row.errors ?? 0);
    byDay.set(day, current);
  }
  return Array.from(byDay.values()).toSorted((a, b) =>
    a.day.localeCompare(b.day),
  );
}

function tabTitle(key: TabKey): string {
  if (key === "site-events") return "Site events";
  if (key === "history") return "Legacy shortlink history";
  if (key === "volume") return "Dataset volume";
  if (key === "workers") return "Workers invocations";
  if (key === "rum") return "Page views";
  return "Shortlink clicks";
}

function tabDescription(key: TabKey): string {
  if (key === "history") {
    return "Code-indexed rows recorded before the label migration.";
  }
  if (key === "volume") {
    return "GraphQL Adaptive Groups totals for leenk_shortlinks and leenk_site_events. Blob labels, campaigns, and engagement dimensions stay on the SQL reports.";
  }
  if (key === "workers") {
    return "GraphQL workersInvocationsAdaptive totals for leenk and dev-leenk. This is invocation metrics, not raw Workers Logs.";
  }
  return "Weighted Analytics Engine counts by day. Rows recorded before the label migration appear as short codes until retention expires.";
}

function tabEmptyDescription(key: TabKey): string {
  if (key === "volume") {
    return "Adaptive Groups returned no dataset rows. Shortlink and site-event SQL reports are unchanged.";
  }
  if (key === "workers") {
    return "No invocation rows for leenk or dev-leenk in this range.";
  }
  return "The report returned no rows. Try a wider range or check that the dataset is receiving traffic.";
}

function entitlementTitle(
  key: ReportKey,
  entitlement: "disabled" | "missing",
): string {
  const label = tabTitle(key === "vitals" ? "rum" : key);
  return entitlement === "missing"
    ? `${label} is not available`
    : `${label} is disabled`;
}

function entitlementDescription(
  key: ReportKey,
  entitlement: "disabled" | "missing",
): string {
  if (key === "volume") {
    return entitlement === "missing"
      ? "The live schema does not expose workersAnalyticsEngineAdaptiveGroups for this account. Shortlink and site-event reports still use the Analytics Engine SQL API."
      : "The Adaptive Groups node exists but is disabled for this account. Shortlink and site-event reports still use the Analytics Engine SQL API.";
  }
  if (key === "rum") {
    return entitlement === "missing"
      ? "The live schema does not expose rumPageloadEventsAdaptiveGroups for this account."
      : "The Web Analytics pageload node exists but is disabled for this account.";
  }
  if (key === "vitals") {
    return entitlement === "missing"
      ? "The live schema does not expose rumWebVitalsEventsAdaptiveGroups for this account."
      : "The Web Analytics Web Vitals node exists but is disabled for this account.";
  }
  return entitlement === "missing"
    ? "The live schema does not expose workersInvocationsAdaptive for this account. Raw Workers Logs stay in Cloudflare Observability."
    : "The Workers invocations node exists but is disabled for this account.";
}

function reportNode(key: ReportKey): string {
  if (key === "rum") return "rumPageloadEventsAdaptiveGroups";
  if (key === "vitals") return "rumWebVitalsEventsAdaptiveGroups";
  if (key === "workers") return "workersInvocationsAdaptive";
  return "workersAnalyticsEngineAdaptiveGroups";
}

function tableValueKey(
  reportKey: ReportKey,
  valueKey: "clicks" | "events" | undefined,
): string {
  if (reportKey === "volume") return "count";
  if (reportKey === "rum") return "pageviews";
  if (reportKey === "vitals") return "count";
  if (reportKey === "workers") return "requests";
  return valueKey ?? "clicks";
}

function formatOptional(value: number | string | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "n/a";
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 }).format(
    value,
  );
}

function rowKey(row: AnalyticsRow, valueKey: string, index: number): string {
  return [
    String(row.day ?? ""),
    String(row.label ?? row.event ?? row.dataset ?? row.scriptName ?? ""),
    String(row.status ?? ""),
    String(row[valueKey] ?? index),
  ].join("-");
}

function isTabKey(value: string): value is TabKey {
  return (TAB_KEYS as string[]).includes(value);
}
