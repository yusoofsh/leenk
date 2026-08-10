import { useEffect, useState } from "react";

import {
  ModuleEmpty,
  ModuleError,
  TableSkeleton,
} from "~/components/dashboard/module-primitives";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
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
  dashboardFetch,
  formatDate,
  type ActivityPage,
  type DashboardResult,
} from "~/lib/dashboard/client";

export function Activity() {
  const [page, setPage] = useState<DashboardResult<ActivityPage> | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const query = new URLSearchParams({ limit: "50" });
    if (cursor) query.set("cursor", cursor);
    void dashboardFetch<ActivityPage>(`/api/dashboard/activity?${query}`).then(
      setPage,
    );
  }, [cursor, attempt]);

  if (page && !page.ok && page.error === "cms_unavailable") {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>CMS lifecycle events</CardDescription>
        </CardHeader>
        <CardContent>
          <ModuleError
            error={page}
            onRetry={() => setAttempt((value) => value + 1)}
            title="CMS binding unavailable"
          />
        </CardContent>
      </Card>
    );
  }
  if (page && !page.ok) {
    return (
      <ModuleError
        error={page}
        onRetry={() => setAttempt((value) => value + 1)}
        title="Could not load activity"
      />
    );
  }
  if (!page) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Activity</CardTitle>
          <CardDescription>CMS lifecycle events</CardDescription>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={8} columns={4} />
        </CardContent>
      </Card>
    );
  }

  const entries = page.data.entries;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Activity</h1>
        <p className="text-muted-foreground text-sm">
          Draft, publish, and rollback events from the CMS store
        </p>
      </div>
      {entries.length === 0 ? (
        <ModuleEmpty
          title="No activity yet"
          description="CMS lifecycle events will appear here."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kind</TableHead>
                  <TableHead>Summary</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead className="text-right">When</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Badge variant="secondary">{entry.kind}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.summary}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {entry.actor}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-right tabular-nums">
                      {formatDate(entry.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={cursor === null}
          onClick={() => setCursor(null)}
        >
          Newest
        </Button>
        {page.data.nextCursor ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCursor(page.data.nextCursor)}
          >
            Older
          </Button>
        ) : null}
      </div>
    </div>
  );
}
