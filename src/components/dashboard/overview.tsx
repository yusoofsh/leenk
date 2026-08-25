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

interface OverviewSnapshot {
  activity?: DashboardResult<ActivityPage>;
  files?: DashboardResult<unknown[]>;
  shortlinks?: DashboardResult<Array<{ code: string }>>;
  siteEvents?: DashboardResult<AnalyticsRow[]>;
  shortlinksClicks?: DashboardResult<AnalyticsRow[]>;
  volume?: DashboardResult<AnalyticsRow[]>;
}

export function Overview() {
  const [snapshot, setSnapshot] = useState<OverviewSnapshot>({});
  const [range] = useState(() => analyticsRange(30));
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams({ end: range.end, start: range.start });
    const path = `/api/dashboard/analytics/site-events?${query}`;
    void Promise.all([
      dashboardFetch<ActivityPage>("/api/dashboard/activity?limit=8"),
      dashboardFetch<unknown[]>("/api/dashboard/files"),
      dashboardFetch<Array<{ code: string }>>("/api/dashboard/links"),
      dashboardFetch<AnalyticsRow[]>(path),
      dashboardFetch<AnalyticsRow[]>(
        `/api/dashboard/analytics/shortlinks?${query}`,
      ),
      dashboardFetch<AnalyticsRow[]>(
        `/api/dashboard/analytics/volume?${query}`,
      ),
    ]).then(
      ([activity, files, shortlinks, siteEvents, shortlinksClicks, volume]) => {
        if (cancelled) return;
        setSnapshot({
          activity,
          files,
          shortlinks,
          siteEvents,
          shortlinksClicks,
          volume,
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
      <div className="space-y-6" data-slot="overview-loading">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
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
    <div className="space-y-6">
      {hasErrors ? (
        <ModuleError
          error={firstError(snapshot)}
          onRetry={retry}
          title="Some overview data could not load"
        />
      ) : null}
      <KpiStrip snapshot={snapshot} range={range} />
      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
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
        <Card className="xl:col-span-2">
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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Shortlink clicks" value={clicksTotal} />
      <KpiCard label="Site events" value={siteTotal} />
      <KpiCard label="Files" value={files.length} />
      <KpiCard label="Shortlinks" value={links.length} />
      <div className="col-span-full space-y-1">
        <AnalyticsCaption range={range} />
        {snapshot.volume && snapshot.volume.ok ? (
          <AnalyticsCaption
            entitlement={snapshot.volume.meta?.entitlement}
            range={snapshot.volume.meta?.range ?? range}
            source={snapshot.volume.meta?.source}
          />
        ) : null}
      </div>
    </div>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs tracking-wide uppercase">
          {label}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tabular-nums">
          {formatCount(value)}
        </p>
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
    <ul className="space-y-3" data-slot="focus-queue">
      {entries.map((entry) => (
        <li key={entry.id} className="flex items-start gap-3">
          <Badge variant="secondary" className="mt-0.5 shrink-0">
            {entry.kind}
          </Badge>
          <div className="min-w-0">
            <p className="truncate text-sm">{entry.summary}</p>
            <p className="text-muted-foreground text-xs">
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
          <TableHead className="text-right">When</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {activity.data.entries.slice(0, 6).map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="font-medium">{entry.kind}</TableCell>
            <TableCell className="text-muted-foreground text-right tabular-nums">
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
