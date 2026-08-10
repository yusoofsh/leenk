import { PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  dashboardDelete,
  dashboardFetch,
  dashboardMutation,
  formatCount,
  formatDate,
  type DashboardResult,
  type ShortlinkListEntry,
} from "~/lib/dashboard/client";

interface CreateShortlinkState {
  campaign?: string;
  label: string;
  open: boolean;
  submitting: boolean;
  target: string;
}

export function Shortlinks() {
  const [records, setRecords] = useState<DashboardResult<
    ShortlinkListEntry[]
  > | null>(null);
  const [create, setCreate] = useState<CreateShortlinkState>({
    label: "",
    open: false,
    submitting: false,
    target: "",
  });
  const [deleting, setDeleting] = useState<ShortlinkListEntry | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    void dashboardFetch<ShortlinkListEntry[]>("/api/dashboard/links").then(
      setRecords,
    );
  }, [attempt]);

  const createShortlink = async () => {
    setCreate((current) => ({ ...current, submitting: true }));
    const body: Record<string, string> = {
      label: create.label,
      target: create.target,
    };
    if (create.campaign) body.campaign = create.campaign;
    const result = await dashboardMutation<{ code: string }>(
      "/api/shortlinks",
      body,
    );
    setCreate((current) => ({ ...current, submitting: false }));
    if (result.ok) {
      toast.success(`Shortlink /${result.data.code} created`);
      setCreate((current) => ({
        ...current,
        open: false,
        label: "",
        target: "",
        campaign: "",
      }));
      setAttempt((value) => value + 1);
    } else {
      toast.error("Create failed", { description: result.message });
    }
  };

  const deleteShortlink = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const result = await dashboardDelete(
      `/api/shortlinks/${encodeURIComponent(deleting.code)}`,
    );
    setDeleteBusy(false);
    setDeleting(null);
    if (result.ok) {
      toast.success("Shortlink deleted");
      setAttempt((value) => value + 1);
    } else {
      toast.error("Delete failed", { description: result.message });
    }
  };

  if (records && !records.ok) {
    return (
      <ModuleError
        error={records}
        onRetry={() => setAttempt((value) => value + 1)}
        title="Could not load shortlinks"
      />
    );
  }
  if (!records) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shortlinks</CardTitle>
          <CardDescription>Shortlink records and recent clicks</CardDescription>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={6} columns={6} />
        </CardContent>
      </Card>
    );
  }

  const rows = records.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Shortlinks</h1>
          <p className="text-muted-foreground text-sm">
            Link records with labels, kinds, and recent clicks
          </p>
        </div>
        <Button
          onClick={() => setCreate((current) => ({ ...current, open: true }))}
        >
          <PlusIcon className="size-4" aria-hidden="true" />
          Create shortlink
        </Button>
      </div>

      {rows.length === 0 ? (
        <ModuleEmpty
          title="No shortlinks yet"
          description="Create a shortlink to start tracking clicks."
          action={
            <Button
              onClick={() =>
                setCreate((current) => ({ ...current, open: true }))
              }
            >
              <PlusIcon className="size-4" aria-hidden="true" />
              Create shortlink
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Kind</TableHead>
                  <TableHead>Campaign</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((record) => (
                  <TableRow key={record.code}>
                    <TableCell className="font-mono text-sm">
                      {record.code}
                    </TableCell>
                    <TableCell className="max-w-48 truncate font-medium">
                      {record.label ?? "Unlabeled"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{record.kind}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground max-w-40 truncate">
                      {record.campaign?.name ?? "None"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {record.expiresAt
                        ? formatDate(record.expiresAt)
                        : "Never"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {record.clicks === undefined
                        ? "-"
                        : formatCount(record.clicks)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleting(record)}
                        aria-label={`Delete ${record.code}`}
                      >
                        <Trash2Icon className="size-3.5" aria-hidden="true" />
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog
        open={create.open}
        onOpenChange={(open) => setCreate((current) => ({ ...current, open }))}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create shortlink</DialogTitle>
            <DialogDescription>
              Create an internal shortlink. Static targets are created through
              the Files module.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shortlink-target">Target path</Label>
              <Input
                id="shortlink-target"
                placeholder="/home"
                value={create.target}
                onChange={(event) =>
                  setCreate((current) => ({
                    ...current,
                    target: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortlink-label">Label</Label>
              <Input
                id="shortlink-label"
                value={create.label}
                onChange={(event) =>
                  setCreate((current) => ({
                    ...current,
                    label: event.target.value,
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortlink-campaign">Campaign (optional)</Label>
              <Input
                id="shortlink-campaign"
                value={create.campaign ?? ""}
                onChange={(event) =>
                  setCreate((current) => ({
                    ...current,
                    campaign: event.target.value,
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() =>
                setCreate((current) => ({ ...current, open: false }))
              }
            >
              Cancel
            </Button>
            <Button
              onClick={createShortlink}
              disabled={create.submitting || create.target.length === 0}
            >
              {create.submitting ? "Creating" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this shortlink?</DialogTitle>
            <DialogDescription>
              Permanently delete{" "}
              <span className="font-mono font-medium">{deleting?.code}</span>.
              Analytics rows are retained.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteShortlink}
              disabled={deleteBusy}
            >
              {deleteBusy ? "Deleting" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export type { ShortlinkListEntry };
