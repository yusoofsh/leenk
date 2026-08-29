import * as stylex from "@stylexjs/stylex";
import { AlertCircleIcon, RefreshCwIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import type { DashboardError } from "~/lib/dashboard/client";
import { cls } from "~/lib/sx";
import { colors, radii } from "~/styles/tokens.stylex";

const styles = stylex.create({
  caption: {
    color: colors.mutedForeground,
    fontSize: "0.75rem",
    margin: 0,
  },
  chartSkeleton: {
    height: "13rem",
    width: "100%",
  },
  empty: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: radii.md,
    borderStyle: "dashed",
    borderWidth: 1,
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    justifyContent: "center",
    paddingBlock: "2.5rem",
    paddingInline: "1.5rem",
    textAlign: "center",
  },
  emptyAction: {
    marginTop: "0.5rem",
  },
  emptyDescription: {
    color: colors.mutedForeground,
    fontSize: "0.875rem",
    margin: 0,
    maxWidth: "24rem",
  },
  emptyTitle: {
    fontSize: "0.875rem",
    fontWeight: 500,
    margin: 0,
  },
  legend: {
    display: "flex",
    gap: "0.5rem",
  },
  legendLg: {
    height: "1rem",
    width: "6rem",
  },
  legendSm: {
    height: "1rem",
    width: "4rem",
  },
  retry: {
    marginTop: "0.5rem",
  },
  row: {
    display: "flex",
    gap: "1rem",
  },
  rowSkeleton: {
    height: "2rem",
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
  },
});

export function ModuleError({
  error,
  onRetry,
  title = "Could not load this module",
}: {
  error: DashboardError;
  onRetry: () => void;
  title?: string;
}) {
  if (error.error === "ANALYTICS_ENGINE_NOT_CONFIGURED") {
    return (
      <Alert data-slot="analytics-not-configured">
        <AlertCircleIcon size={16} aria-hidden="true" />
        <AlertTitle>Analytics Engine not configured</AlertTitle>
        <AlertDescription>
          Add the CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_ANALYTICS_TOKEN bindings
          for this environment to view analytics reports.
        </AlertDescription>
        <Button
          variant="outline"
          size="sm"
          className={cls(styles.retry)}
          onClick={onRetry}
        >
          <RefreshCwIcon size={14} aria-hidden="true" />
          Retry
        </Button>
      </Alert>
    );
  }
  return (
    <Alert variant="destructive" data-slot="module-error">
      <AlertCircleIcon size={16} aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {error.message}
        {error.status !== 0 ? ` (${error.status})` : ""}
      </AlertDescription>
      <Button
        variant="outline"
        size="sm"
        className={cls(styles.retry)}
        onClick={onRetry}
      >
        <RefreshCwIcon size={14} aria-hidden="true" />
        Retry
      </Button>
    </Alert>
  );
}

export function ModuleEmpty({
  action,
  description,
  title,
}: {
  action?: ReactNode;
  description: string;
  title: string;
}) {
  return (
    <div {...stylex.props(styles.empty)} data-slot="module-empty">
      <p {...stylex.props(styles.emptyTitle)}>{title}</p>
      <p {...stylex.props(styles.emptyDescription)}>{description}</p>
      {action ? (
        <div {...stylex.props(styles.emptyAction)}>{action}</div>
      ) : null}
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 4,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div
      {...stylex.props(styles.stack)}
      data-slot="module-loading"
      aria-hidden="true"
    >
      {Array.from({ length: rows }, () => (
        // oxlint-disable-next-line react/no-array-index-key -- decorative skeleton rows
        <div key={skeletonKey()} {...stylex.props(styles.row)}>
          {Array.from({ length: columns }, () => (
            // oxlint-disable-next-line react/no-array-index-key -- decorative skeleton cells
            <Skeleton
              key={skeletonKey()}
              className={cls(styles.rowSkeleton)}
              style={{ width: `${100 / columns}%` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div
      {...stylex.props(styles.stack)}
      data-slot="module-loading"
      aria-hidden="true"
    >
      <Skeleton className={cls(styles.chartSkeleton)} />
      <div {...stylex.props(styles.legend)}>
        <Skeleton className={cls(styles.legendLg)} />
        <Skeleton className={cls(styles.legendSm)} />
      </div>
    </div>
  );
}

function skeletonKey(): string {
  return `skeleton-${Math.random().toString(36).slice(2)}`;
}

export function AnalyticsCaption({
  entitlement,
  node,
  range,
  source,
}: {
  entitlement?: "available" | "disabled" | "missing" | "unknown" | undefined;
  node?: string | undefined;
  range?: { end: string; start: string } | null;
  source?: string | undefined;
}) {
  if (!range) return null;
  const graphql = source === "GraphQL Analytics";
  const note = graphql
    ? graphqlCaption(entitlement, node)
    : "Values are sampled and are not exact page views or unique visitors.";
  return (
    <p {...stylex.props(styles.caption)} data-slot="analytics-caption">
      {graphql ? graphqlLead(node) : "Weighted Analytics Engine counts"},{" "}
      {range.start} to {range.end}. {note}
    </p>
  );
}

export function GraphqlEntitlementAlert({
  description,
  entitlement,
  node,
  title,
}: {
  description: string;
  entitlement: "disabled" | "missing";
  node: string;
  title: string;
}) {
  return (
    <Alert data-slot={`graphql-entitlement-${entitlement}`}>
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {description} Node: {node}.
      </AlertDescription>
    </Alert>
  );
}

function graphqlLead(node: string | undefined): string {
  if (node === "rumPageloadEventsAdaptiveGroups") {
    return "GraphQL Web Analytics page views";
  }
  if (node === "rumWebVitalsEventsAdaptiveGroups") {
    return "GraphQL Web Analytics Web Vitals";
  }
  if (node === "workersInvocationsAdaptive") {
    return "GraphQL Workers invocation counts";
  }
  return "GraphQL Adaptive Groups counts";
}

function graphqlCaption(
  entitlement: "available" | "disabled" | "missing" | "unknown" | undefined,
  node: string | undefined,
): string {
  const nodeLabel = node ?? "this GraphQL node";
  if (entitlement === "missing") {
    return `${nodeLabel} is not on this account schema. No counts are invented. SQL shortlink and site-event reports are unchanged.`;
  }
  if (entitlement === "disabled") {
    return `${nodeLabel} is present but disabled for this account. No counts are shown.`;
  }
  if (node === "rumPageloadEventsAdaptiveGroups") {
    return "Sampled page views and visits. Not unique visitors.";
  }
  if (node === "rumWebVitalsEventsAdaptiveGroups") {
    return "Sampled p75 quantiles as returned by GraphQL. Not lab scores.";
  }
  if (node === "workersInvocationsAdaptive") {
    return "Sampled invocation totals for leenk and dev-leenk. Not raw Workers Logs.";
  }
  return "Dataset totals only. Labels, campaigns, and engagement dimensions stay on the Analytics Engine SQL reports. Not page views or unique visitors.";
}
