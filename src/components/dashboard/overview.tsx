import * as stylex from "@stylexjs/stylex";
import { useEffect, useState } from "react";

import {
  AnalyticsCaption,
  ChartSkeleton,
  ModuleEmpty,
  ModuleError,
  TableSkeleton,
} from "~/components/dashboard/module-primitives";
import { Badge } from "~/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
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
  formatDate,
  type ActivityPage,
  type AnalyticsRow,
  type DashboardResult,
} from "~/lib/dashboard/client";
import { cls } from "~/lib/sx";
import { dashboard } from "~/styles/dashboard";
import { mq } from "~/styles/breakpoints.stylex";
import { colors } from "~/styles/tokens.stylex";

const styles = stylex.create({
  compactHeader: {
    paddingBottom: "0.5rem",
  },
  focusGrid: {
    display: "grid",
    gap: "1.5rem",
    [mq.xl]: {
      gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
    },
  },
  fullSpan: {
    gridColumn: "1 / -1",
  },
  graphqlGrid: {
    display: "grid",
    gap: "1rem",
    [mq.sm]: {
      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    },
    [mq.xl]: {
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    },
  },
  kindBadge: {
    flexShrink: 0,
    marginTop: "0.125rem",
  },
  kpiContent: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  kpiLabel: {
    fontSize: "0.75rem",
    letterSpacing: "0.025em",
    textTransform: "uppercase",
  },
  medium: {
    fontWeight: 500,
  },
  minW0: {
    minWidth: 0,
  },
  queue: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
  queueItem: {
    alignItems: "flex-start",
    display: "flex",
    gap: "0.75rem",
  },
  queueMeta: {
    color: colors.mutedForeground,
    fontSize: "0.75rem",
    margin: 0,
  },
  queueSummary: {
    fontSize: "0.875rem",
    margin: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  span2: {
    [mq.xl]: {
      gridColumn: "span 2 / span 2",
    },
  },
  span3: {
    [mq.xl]: {
      gridColumn: "span 3 / span 3",
    },
  },
});

interface OverviewSnapshot {
  activity?: DashboardResult<ActivityPage>;
  files?: DashboardResult<unknown[]>;
  rum?: DashboardResult<AnalyticsRow[]>;
  shortlinks?: DashboardResult<Array<{ code: string }>>;
  shortlinksClicks?: DashboardResult<AnalyticsRow[]>;
  siteEvents?: DashboardResult<AnalyticsRow[]>;
  volume?: DashboardResult<AnalyticsRow[]>;
  workers?: DashboardResult<AnalyticsRow[]>;
}

export function Overview() {
  const [snapshot, setSnapshot] = useState<OverviewSnapshot>({});
  const [range] = useState(() => analyticsRange(30));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ end: range.end, start: range.start });
    void Promise.all([
      dashboardFetch<ActivityPage>("/api/dashboard/activity?limit=8"),
      dashboardFetch<unknown[]>("/api/dashboard/files"),
      dashboardFetch<Array<{ code: string }>>("/api/dashboard/links"),
      dashboardFetch<AnalyticsRow[]>(
        `/api/dashboard/analytics/site-events?${query}`,
      ),
      dashboardFetch<AnalyticsRow[]>(
        `/api/dashboard/analytics/shortlinks?${query}`,
      ),
      dashboardFetch<AnalyticsRow[]>(
        `/api/dashboard/analytics/volume?${query}`,
      ),
      dashboardFetch<AnalyticsRow[]>(`/api/dashboard/analytics/rum?${query}`),
      dashboardFetch<AnalyticsRow[]>(
        `/api/dashboard/analytics/workers?${query}`,
      ),
    ]).then(
      ([
        activity,
        files,
        shortlinks,
        siteEvents,
        shortlinksClicks,
        volume,
        rum,
        workers,
      ]) => {
        if (cancelled) return;
        setSnapshot({
          activity,
          files,
          rum,
          shortlinks,
          shortlinksClicks,
          siteEvents,
          volume,
          workers,
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [range, attempt]);

  const retry = () => setAttempt((value) => value + 1);
  const ready = [
    snapshot.activity,
    snapshot.files,
    snapshot.shortlinks,
    snapshot.siteEvents,
    snapshot.shortlinksClicks,
  ].some((result) => result !== undefined);

  if (!ready) {
    return (
      <div {...stylex.props(dashboard.page)} data-slot="overview-loading">
        <div {...stylex.props(dashboard.statGrid)}>
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index}>
              <CardHeader className={cls(styles.compactHeader)}>
                <ChartSkeleton />
              </CardHeader>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            <TableSkeleton rows={5} columns={4} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasErrors = [
    snapshot.activity,
    snapshot.files,
    snapshot.shortlinks,
    snapshot.siteEvents,
    snapshot.shortlinksClicks,
  ].some((result) => result && !result.ok);

  return (
    <div {...stylex.props(dashboard.page)}>
      {hasErrors ? (
        <ModuleError
          error={firstError(snapshot)}
          onRetry={retry}
          title="Some overview data could not load"
        />
      ) : null}
      <KpiStrip snapshot={snapshot} range={range} />
      <div {...stylex.props(styles.focusGrid)}>
        <Card className={cls(styles.span3)}>
          <CardHeader>
            <CardTitle>Focus queue</CardTitle>
            <CardDescription>
              Recent owner activity that needs attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActivityQueue snapshot={snapshot} />
          </CardContent>
        </Card>
        <Card className={cls(styles.span2)}>
          <CardHeader>
            <CardTitle>Recent changes</CardTitle>
            <CardDescription>Latest lifecycle events</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentChanges snapshot={snapshot} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiStrip({
  range,
  snapshot,
}: {
  range: { end: string; start: string };
  snapshot: OverviewSnapshot;
}) {
  const siteEvents = okRows(snapshot.siteEvents);
  const shortlinks = okRows(snapshot.shortlinksClicks);
  const files = okAny(snapshot.files);
  const links = okAny(snapshot.shortlinks);
  const siteTotal = siteEvents.reduce(
    (sum, row) => sum + Number(row.events ?? 0),
    0,
  );
  const clicksTotal = shortlinks.reduce(
    (sum, row) => sum + Number(row.clicks ?? 0),
    0,
  );
  return (
    <div {...stylex.props(dashboard.stack)}>
      <div {...stylex.props(dashboard.statGrid)}>
        <KpiCard label="Shortlink clicks" value={formatCount(clicksTotal)} />
        <KpiCard label="Site events" value={formatCount(siteTotal)} />
        <KpiCard label="Files" value={formatCount(files.length)} />
        <KpiCard label="Shortlinks" value={formatCount(links.length)} />
        <div {...stylex.props(styles.fullSpan)}>
          <AnalyticsCaption range={range} />
        </div>
      </div>
      <div {...stylex.props(styles.graphqlGrid)}>
        <GraphqlKpi
          fallbackRange={range}
          label="Dataset volume"
          result={snapshot.volume}
          valueKey="count"
        />
        <GraphqlKpi
          fallbackRange={range}
          label="Web Analytics visits"
          result={snapshot.rum}
          valueKey="visits"
        />
        <GraphqlKpi
          fallbackRange={range}
          label="Worker requests"
          result={snapshot.workers}
          valueKey="requests"
        />
      </div>
    </div>
  );
}

function GraphqlKpi({
  fallbackRange,
  label,
  result,
  valueKey,
}: {
  fallbackRange: { end: string; start: string };
  label: string;
  result: DashboardResult<AnalyticsRow[]> | undefined;
  valueKey: string;
}) {
  const display = graphqlDisplay(result, valueKey);
  return (
    <Card>
      <CardHeader className={cls(styles.compactHeader)}>
        <CardDescription className={cls(styles.kpiLabel)}>
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent className={cls(styles.kpiContent)}>
        <p {...stylex.props(dashboard.metric)}>{display.value}</p>
        {result && result.ok ? (
          <AnalyticsCaption
            entitlement={display.entitlement}
            node={result.meta?.node}
            range={result.meta?.range ?? fallbackRange}
            source={result.meta?.source}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function graphqlDisplay(
  result: DashboardResult<AnalyticsRow[]> | undefined,
  valueKey: string,
): {
  entitlement: "available" | "disabled" | "missing" | "unknown" | undefined;
  value: string;
} {
  if (!result) {
    return { entitlement: "unknown", value: "Checking" };
  }
  if (!result.ok) {
    return { entitlement: "unknown", value: "Unavailable" };
  }
  const entitlement = result.meta?.entitlement;
  if (entitlement === "missing" || entitlement === "disabled") {
    return {
      entitlement,
      value: entitlement === "missing" ? "Not on schema" : "Disabled",
    };
  }
  const total = result.data.reduce(
    (sum, row) => sum + Number(row[valueKey] ?? 0),
    0,
  );
  return { entitlement: entitlement ?? "available", value: formatCount(total) };
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader className={cls(styles.compactHeader)}>
        <CardDescription className={cls(styles.kpiLabel)}>
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p {...stylex.props(dashboard.metric)}>{value}</p>
      </CardContent>
    </Card>
  );
}

function ActivityQueue({ snapshot }: { snapshot: OverviewSnapshot }) {
  const activity = okResult(snapshot.activity);
  if (!activity) {
    return (
      <ModuleEmpty
        title="No activity yet"
        description="Lifecycle events will appear here as the site is used."
      />
    );
  }
  const entries = activity.data.entries;
  if (entries.length === 0) {
    return (
      <ModuleEmpty
        title="No activity yet"
        description="Lifecycle events will appear here as the site is used."
      />
    );
  }
  return (
    <ul {...stylex.props(styles.queue)} data-slot="focus-queue">
      {entries.map((entry) => (
        <li key={entry.id} {...stylex.props(styles.queueItem)}>
          <Badge variant="secondary" className={cls(styles.kindBadge)}>
            {entry.kind}
          </Badge>
          <div {...stylex.props(styles.minW0)}>
            <p {...stylex.props(styles.queueSummary)}>{entry.summary}</p>
            <p {...stylex.props(styles.queueMeta)}>
              {formatDate(entry.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function RecentChanges({ snapshot }: { snapshot: OverviewSnapshot }) {
  const activity = okResult(snapshot.activity);
  if (!activity || activity.data.entries.length === 0) {
    return (
      <ModuleEmpty
        title="No recent changes"
        description="Publishing and draft activity will show up here."
      />
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Event</TableHead>
          <TableHead className={cls(dashboard.cellRight)}>When</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activity.data.entries.slice(0, 6).map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className={cls(styles.medium)}>{entry.kind}</TableCell>
            <TableCell
              className={cls(
                dashboard.cellMuted,
                dashboard.cellRight,
                dashboard.cellNumeric,
              )}
            >
              {formatDate(entry.createdAt)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function okRows<T extends AnalyticsRow>(
  result: DashboardResult<T[]> | undefined,
): T[] {
  return result && result.ok ? result.data : [];
}

function okAny(result: DashboardResult<unknown[]> | undefined): unknown[] {
  return result && result.ok ? result.data : [];
}

function okResult<T>(
  result: DashboardResult<T> | undefined,
): Extract<DashboardResult<T>, { ok: true }> | null {
  return result && result.ok ? result : null;
}

function firstError(snapshot: OverviewSnapshot) {
  const results = [
    snapshot.activity,
    snapshot.files,
    snapshot.shortlinks,
    snapshot.siteEvents,
    snapshot.shortlinksClicks,
  ];
  const failed = results.find(
    (result): result is Extract<DashboardResult<unknown>, { ok: false }> =>
      Boolean(result && !result.ok),
  );
  return (
    failed ?? {
      error: "UNKNOWN",
      message: "Unknown error",
      ok: false as const,
      status: 0,
    }
  );
}
