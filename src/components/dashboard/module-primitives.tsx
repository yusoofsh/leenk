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
  range,
}: {
  range?: { end: string; start: string } | null;
}) {
  if (!range) return null;
  return (
    <p className="text-muted-foreground text-xs" data-slot="analytics-caption">
      Weighted Analytics Engine counts, {range.start} to {range.end}. Values are
      sampled and are not exact page views or unique visitors.
    </p>
  );
}
