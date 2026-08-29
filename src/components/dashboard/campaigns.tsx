import * as stylex from "@stylexjs/stylex";
import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  AnalyticsCaption,
  ChartSkeleton,
  ModuleError,
} from "~/components/dashboard/module-primitives";
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
import { cls } from "~/lib/sx";
import { dashboard } from "~/styles/dashboard";

const styles = stylex.create({
  medium: {
    fontWeight: 500,
  },
});

interface CampaignRow extends AnalyticsRow {
  campaign: string;
  clicks: number;
  label: string;
  medium: string;
  source: string;
}

const CHART_CONFIG = {
  clicks: {
    color: "var(--chart-1)",
    label: "Clicks",
  },
} satisfies ChartConfig;

export function Campaigns() {
  const [range] = useState(() => analyticsRange(30));
  const [report, setReport] = useState<{
    error?: { message: string };
    meta?: DashboardMeta;
    rows: CampaignRow[];
  }>({ rows: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ end: range.end, start: range.start });
    void dashboardFetch<CampaignRow[]>(
      `/api/dashboard/analytics/campaigns?${query}`,
    ).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setReport({
          ...(result.meta ? { meta: result.meta } : {}),
          rows: result.data,
        });
      } else {
        setReport({ error: { message: result.message }, rows: [] });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [range, attempt]);

  if (report.error) {
    return (
      <ModuleError
        error={{
          error: "REPORT_FAILED",
          message: report.error.message,
          ok: false,
          status: 0,
        }}
        onRetry={() => setAttempt((value) => value + 1)}
        title="Could not load campaign data"
      />
    );
  }
  if (report.rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
          <CardDescription>
            Campaign, source, and medium breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          {report.meta ? null : <ChartSkeleton />}
          <AnalyticsCaption range={report.meta?.range ?? null} />
        </CardContent>
      </Card>
    );
  }

  const breakdown = aggregateCampaigns(report.rows);

  return (
    <div {...stylex.props(dashboard.page)}>
      <div>
        <h1 {...stylex.props(dashboard.title)}>Campaigns</h1>
        <p {...stylex.props(dashboard.subtitle)}>
          Ranked campaign, source, and medium breakdown from shortlink analytics
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Clicks by campaign</CardTitle>
          <CardDescription>Top campaigns in the selected range</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={CHART_CONFIG}
            className={cls(dashboard.chart)}
          >
            <BarChart data={breakdown.slice(0, 10)} accessibilityLayer>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="name"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <YAxis tickLine={false} axisLine={false} width={44} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="clicks" fill="var(--color-clicks)" radius={4} />
            </BarChart>
          </ChartContainer>
          <AnalyticsCaption range={report.meta?.range ?? null} />
        </CardContent>
      </Card>
      <Card>
        <CardContent className={cls(dashboard.flush)}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campaign</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Medium</TableHead>
                <TableHead className={cls(dashboard.cellRight)}>
                  Clicks
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {breakdown.map((row) => (
                <TableRow key={`${row.name}-${row.source}-${row.medium}`}>
                  <TableCell className={cls(styles.medium)}>
                    {row.name}
                  </TableCell>
                  <TableCell className={cls(dashboard.cellMuted)}>
                    {row.source}
                  </TableCell>
                  <TableCell className={cls(dashboard.cellMuted)}>
                    {row.medium}
                  </TableCell>
                  <TableCell
                    className={cls(dashboard.cellRight, dashboard.cellNumeric)}
                  >
                    {formatCount(row.clicks)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function aggregateCampaigns(rows: CampaignRow[]) {
  const byName = new Map<
    string,
    { clicks: number; medium: string; name: string; source: string }
  >();
  for (const row of rows) {
    const name = row.campaign ?? "Uncategorized";
    const current = byName.get(name) ?? {
      clicks: 0,
      medium: "",
      name,
      source: "",
    };
    current.clicks += row.clicks ?? 0;
    if (row.source) current.source = row.source;
    if (row.medium) current.medium = row.medium;
    byName.set(name, current);
  }
  return Array.from(byName.values()).toSorted((a, b) => b.clicks - a.clicks);
}
