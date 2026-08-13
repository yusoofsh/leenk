import { useState } from "react";
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

type ReportKey = "history" | "shortlinks" | "site-events";
type RangeDays = 7 | 30 | 90;

const REPORT_PATHS: Record<ReportKey, string> = {
  history: "/api/dashboard/analytics/shortlinks/history",
  "site-events": "/api/dashboard/analytics/site-events",
  shortlinks: "/api/dashboard/analytics/shortlinks",
};

const CHART_CONFIG = {
  clicks: {
    color: "var(--chart-1)",
    label: "Clicks",
  },
  events: {
    color: "var(--chart-2)",
    label: "Events",
  },
} satisfies ChartConfig;

interface ReportState {
  error?: { message: string };
  loading: boolean;
  meta?: DashboardMeta;
  rows: AnalyticsRow[];
}

export function Analytics() {
  const [reportKey, setReportKey] = useState<ReportKey>("shortlinks");
  const [days, setDays] = useState<RangeDays>(30);
  const [reports, setReports] = useState<Record<ReportKey, ReportState>>({
    history: { loading: false, rows: [] },
    "site-events": { loading: false, rows: [] },
    shortlinks: { loading: false, rows: [] },
  });

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

  const switchReport = (key: ReportKey) => {
    setReportKey(key);
    if (
      !reports[key].loading &&
      reports[key].rows.length === 0 &&
      !reports[key].error
    ) {
      void loadReport(key);
    }
  };

  const changeDays = (value: RangeDays) => {
    setDays(value);
    setReports((current) => {
      const next: Record<ReportKey, ReportState> = { ...current };
      for (const key of ["history", "shortlinks", "site-events"] as const) {
        next[key] = { loading: false, rows: [] };
      }
      return next;
    });
    void loadReport(reportKey);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Analytics</h1>
          <p className="text-muted-foreground text-sm">
            Workers Analytics Engine reports for the selected range
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
          if (isReportKey(value)) switchReport(value);
        }}
      >
        <TabsList>
          <TabsTrigger value="shortlinks">Shortlinks</TabsTrigger>
          <TabsTrigger value="site-events">Site events</TabsTrigger>
          <TabsTrigger value="history">Legacy history</TabsTrigger>
        </TabsList>
        <TabsContent value={reportKey}>
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>
                  {reportKey === "site-events"
                    ? "Site events"
                    : reportKey === "history"
                      ? "Legacy shortlink history"
                      : "Shortlink clicks"}
                </CardTitle>
                <CardDescription>
                  {reportKey === "history"
                    ? "Code-indexed rows recorded before the label migration."
                    : "Weighted Analytics Engine counts by day. Rows recorded before the label migration appear as short codes until retention expires."}
                </CardDescription>
              </div>
              <ReportActions
                loading={activeReport.loading}
                onRefresh={() => loadReport(reportKey)}
              />
            </CardHeader>
            <CardContent>
              <ReportBody
                key={reportKey}
                meta={activeReport.meta}
                onRefresh={() => loadReport(reportKey)}
                report={activeReport}
                valueKey={valueKey}
              />
            </CardContent>
          </Card>
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

function ReportActions({
  loading,
  onRefresh,
}: {
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading}>
      {loading ? "Loading" : "Refresh"}
    </Button>
  );
}

function ReportBody({
  meta,
  onRefresh,
  report,
  valueKey,
}: {
  meta: DashboardMeta | undefined;
  onRefresh: () => void;
  report: ReportState;
  valueKey: "clicks" | "events";
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
  if (report.rows.length === 0) {
    return (
      <div className="space-y-4">
        <Alert>
          <AlertTitle>No data for this range</AlertTitle>
          <AlertDescription>
            The report returned no rows. Try a wider range or check that the
            dataset is receiving traffic.
          </AlertDescription>
        </Alert>
        <AnalyticsCaption range={meta?.range ?? null} />
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <ReportChart rows={report.rows} valueKey={valueKey} />
      <AnalyticsCaption range={meta?.range ?? null} />
      <ReportTable rows={report.rows} valueKey={valueKey} />
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
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            {hasLabel ? <TableHead>Label</TableHead> : null}
            {hasEvent ? <TableHead>Event</TableHead> : null}
            {hasEvent ? <TableHead>Dimension</TableHead> : null}
            <TableHead className="text-right">Count</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ranked.map((row) => (
            <TableRow
              key={`${String(row.label ?? row.event ?? row.day ?? "")}-${String(row[valueKey])}`}
            >
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
              <TableCell className="text-right tabular-nums">
                {formatCount(row[valueKey])}
              </TableCell>
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

function isReportKey(value: string): value is ReportKey {
  return (
    value === "shortlinks" || value === "site-events" || value === "history"
  );
}
