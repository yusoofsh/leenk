import * as stylex from "@stylexjs/stylex";
import { CircleCheckIcon, CircleXIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { ModuleError } from "~/components/dashboard/module-primitives";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Skeleton } from "~/components/ui/skeleton";
import {
  dashboardFetch,
  type DashboardResult,
  type FileListEntry,
  type ShortlinkListEntry,
} from "~/lib/dashboard/client";
import { cls } from "~/lib/sx";
import { dashboard } from "~/styles/dashboard";
import { colors } from "~/styles/tokens.stylex";

const styles = stylex.create({
  detail: {
    color: colors.mutedForeground,
    fontSize: "0.75rem",
    margin: 0,
    marginTop: "0.5rem",
  },
  healthHeader: {
    alignItems: "center",
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: "0.5rem",
  },
  healthSkeleton: {
    height: "7rem",
    width: "100%",
  },
  healthTitle: {
    fontSize: "0.875rem",
    fontWeight: 500,
  },
  okIcon: {
    color: "#059669",
  },
  errorIcon: {
    color: colors.destructive,
  },
});

interface HealthState {
  analytics: "error" | "ok" | "unknown";
  cms: "error" | "ok" | "unknown";
  r2: "error" | "ok" | "unknown";
  renderer: "error" | "ok" | "unknown";
}

export function Operations() {
  const [health, setHealth] = useState<HealthState>({
    analytics: "unknown",
    cms: "unknown",
    r2: "unknown",
    renderer: "unknown",
  });
  const [files, setFiles] = useState<DashboardResult<FileListEntry[]> | null>(
    null,
  );
  const [shortlinks, setShortlinks] = useState<DashboardResult<
    ShortlinkListEntry[]
  > | null>(null);
  const [activity, setActivity] = useState<DashboardResult<unknown> | null>(
    null,
  );
  const [volume, setVolume] = useState<DashboardResult<
    Array<{ count: number; dataset: string }>
  > | null>(null);
  const [rum, setRum] = useState<DashboardResult<
    Array<{ visits: number }>
  > | null>(null);
  const [workers, setWorkers] = useState<DashboardResult<
    Array<{ requests: number }>
  > | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      dashboardFetch<FileListEntry[]>("/api/dashboard/files"),
      dashboardFetch<ShortlinkListEntry[]>("/api/dashboard/links"),
      dashboardFetch<unknown>("/api/dashboard/activity?limit=1"),
      dashboardFetch<unknown[]>(
        "/api/dashboard/analytics/shortlinks?start=2026-08-01&end=2026-08-02",
      ),
      dashboardFetch<Array<{ count: number; dataset: string }>>(
        "/api/dashboard/analytics/volume?start=2026-08-01&end=2026-08-02",
      ),
      dashboardFetch<Array<{ visits: number }>>(
        "/api/dashboard/analytics/rum?start=2026-08-01&end=2026-08-02",
      ),
      dashboardFetch<Array<{ requests: number }>>(
        "/api/dashboard/analytics/workers?start=2026-08-01&end=2026-08-02",
      ),
    ]).then(
      ([
        filesResult,
        shortlinksResult,
        activityResult,
        analyticsResult,
        volumeResult,
        rumResult,
        workersResult,
      ]) => {
        if (cancelled) return;
        setFiles(filesResult);
        setShortlinks(shortlinksResult);
        setActivity(activityResult);
        setVolume(volumeResult);
        setRum(rumResult);
        setWorkers(workersResult);
        setHealth({
          analytics: analyticsResult.ok ? "ok" : "error",
          cms: activityResult.ok ? "ok" : "error",
          r2: filesResult.ok ? "ok" : "error",
          renderer: "ok",
        });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const retry = () => setAttempt((value) => value + 1);
  const allChecked = files !== null && shortlinks !== null && activity !== null;

  return (
    <div {...stylex.props(dashboard.page)}>
      <div>
        <h1 {...stylex.props(dashboard.title)}>Operations</h1>
        <p {...stylex.props(dashboard.subtitle)}>
          Binding health and Cloudflare link-outs. Read only.
        </p>
      </div>
      <div {...stylex.props(dashboard.statGrid)}>
        <HealthCard
          label="Public renderer"
          status={health.renderer}
          detail="Worker responds on the public route"
        />
        <HealthCard
          label="R2 static storage"
          status={health.r2}
          detail={r2Detail(files)}
        />
        <HealthCard
          label="D1 CMS"
          status={health.cms}
          detail={cmsDetail(activity)}
        />
        <HealthCard
          label="Analytics Engine"
          status={health.analytics}
          detail={analyticsDetail(
            files,
            health.analytics,
            volume,
            rum,
            workers,
          )}
        />
      </div>
      {!allChecked ? (
        <div {...stylex.props(dashboard.statGrid)}>
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className={cls(styles.healthSkeleton)} />
          ))}
        </div>
      ) : null}
      {hasError(health) ? (
        <ModuleError
          error={{
            error: "PARTIAL",
            message: "One or more bindings are unavailable.",
            ok: false,
            status: 0,
          }}
          onRetry={retry}
          title="Some bindings are unavailable"
        />
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Cloudflare surfaces</CardTitle>
          <CardDescription>
            Open the relevant Cloudflare dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className={cls(dashboard.wrap)}>
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://dash.cloudflare.com/"
              target="_blank"
              rel="noreferrer"
            >
              Workers overview
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://dash.cloudflare.com/"
              target="_blank"
              rel="noreferrer"
            >
              Web Analytics
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://dash.cloudflare.com/"
              target="_blank"
              rel="noreferrer"
            >
              Workers Observability
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://dash.cloudflare.com/"
              target="_blank"
              rel="noreferrer"
            >
              R2 buckets
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a
              href="https://dash.cloudflare.com/"
              target="_blank"
              rel="noreferrer"
            >
              D1 databases
            </a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function HealthCard({
  detail,
  label,
  status,
}: {
  detail: string;
  label: string;
  status: "error" | "ok" | "unknown";
}) {
  return (
    <Card>
      <CardHeader className={cls(styles.healthHeader)}>
        <CardTitle className={cls(styles.healthTitle)}>{label}</CardTitle>
        {status === "ok" ? (
          <CircleCheckIcon
            size={16}
            aria-hidden="true"
            {...stylex.props(styles.okIcon)}
          />
        ) : (
          <CircleXIcon
            size={16}
            aria-hidden="true"
            {...stylex.props(styles.errorIcon)}
          />
        )}
      </CardHeader>
      <CardContent>
        <Badge variant={status === "ok" ? "default" : "destructive"}>
          {status}
        </Badge>
        <p {...stylex.props(styles.detail)}>{detail}</p>
      </CardContent>
    </Card>
  );
}

function r2Detail(files: DashboardResult<FileListEntry[]> | null): string {
  if (files === null) return "Checking the bucket";
  return files.ok
    ? `${files.data.length} objects listed`
    : "Bucket list failed";
}

function cmsDetail(activity: DashboardResult<unknown> | null): string {
  if (activity === null) return "Checking the D1 store";
  return activity.ok ? "D1 responds" : "D1 binding unavailable";
}

function analyticsDetail(
  files: DashboardResult<FileListEntry[]> | null,
  status: "error" | "ok" | "unknown",
  volume: DashboardResult<Array<{ count: number; dataset: string }>> | null,
  rum: DashboardResult<Array<{ visits: number }>> | null,
  workers: DashboardResult<Array<{ requests: number }>> | null,
): string {
  if (files === null) return "Checking the Analytics Engine binding";
  if (status !== "ok") {
    return "Add CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_ANALYTICS_TOKEN";
  }
  const parts = ["SQL reports respond"];
  parts.push(graphqlHealth("Adaptive Groups", volume));
  parts.push(graphqlHealth("Web Analytics RUM", rum));
  parts.push(graphqlHealth("Workers invocations", workers));
  return parts.join("; ");
}

function graphqlHealth(
  label: string,
  result: DashboardResult<unknown> | null,
): string {
  if (!result) return `${label} unchecked`;
  if (!result.ok) return `${label} unavailable`;
  const entitlement = result.meta?.entitlement;
  if (entitlement === "missing") return `${label} node missing`;
  if (entitlement === "disabled") return `${label} node disabled`;
  return `${label} respond`;
}

function hasError(health: HealthState) {
  return Object.values(health).some((status) => status === "error");
}
