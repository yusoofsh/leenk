import { AlertCircleIcon, RefreshCwIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Alert, AlertDescription, AlertTitle } from "~/components/ui/alert";
import { Button } from "~/components/ui/button";
import { Skeleton } from "~/components/ui/skeleton";
import type { DashboardError } from "~/lib/dashboard/client";

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
        <AlertCircleIcon className="size-4" aria-hidden="true" />
        <AlertTitle>Analytics Engine not configured</AlertTitle>
        <AlertDescription>
          Add the CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_ANALYTICS_TOKEN bindings
          for this environment to view analytics reports.
        </AlertDescription>
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          <RefreshCwIcon className="size-3.5" aria-hidden="true" />
          Retry
        </Button>
      </Alert>
    );
  }
  return (
    <Alert variant="destructive" data-slot="module-error">
      <AlertCircleIcon className="size-4" aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {error.message}
        {error.status !== 0 ? ` (${error.status})` : ""}
      </AlertDescription>
      <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
        <RefreshCwIcon className="size-3.5" aria-hidden="true" />
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
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-6 py-10 text-center"
      data-slot="module-empty"
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="text-muted-foreground max-w-sm text-sm">{description}</p>
      {action ? <div className="mt-2">{action}</div> : null}
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
    <div className="space-y-3" data-slot="module-loading" aria-hidden="true">
      {Array.from({ length: rows }, () => (
        // oxlint-disable-next-line react/no-array-index-key -- decorative skeleton rows
        <div key={skeletonKey()} className="flex gap-4">
          {Array.from({ length: columns }, () => (
            // oxlint-disable-next-line react/no-array-index-key -- decorative skeleton cells
            <Skeleton
              key={skeletonKey()}
              className="h-8"
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
    <div className="space-y-3" data-slot="module-loading" aria-hidden="true">
      <Skeleton className="h-[13rem] w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
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
    <p className="text-muted-foreground text-xs" data-slot="analytics-caption">
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
