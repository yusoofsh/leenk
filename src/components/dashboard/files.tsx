import { Trash2Icon, UploadIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  formatDate,
  type FileListEntry,
  type DashboardResult,
} from "~/lib/dashboard/client";

export function Files() {
  const [files, setFiles] = useState<DashboardResult<FileListEntry[]> | null>(
    null,
  );
  const [deleting, setDeleting] = useState<FileListEntry | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void dashboardFetch<FileListEntry[]>("/api/dashboard/files").then(setFiles);
  }, [attempt]);

  const deleteFile = async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    const result = await dashboardDelete(
      `/api/static/${encodeURIComponent(deleting.key)}`,
    );
    setDeleteBusy(false);
    setDeleting(null);
    if (result.ok) {
      toast.success("File deleted");
      setAttempt((value) => value + 1);
    } else {
      toast.error("Delete failed", { description: result.message });
    }
  };

  const upload = async (file: File) => {
    setUploading(true);
    let response: Response;
    try {
      response = await fetch(`/static/${encodeURIComponent(file.name)}`, {
        body: file,
        method: "POST",
      });
    } catch {
      setUploading(false);
      toast.error("Upload failed", {
        description: "The request could not be sent.",
      });
      return;
    }
    setUploading(false);
    if (response.ok) {
      toast.success("File uploaded");
      setAttempt((value) => value + 1);
    } else {
      toast.error("Upload failed", {
        description: `Server responded with ${response.status}`,
      });
    }
  };

  if (files && !files.ok) {
    return (
      <ModuleError
        error={files}
        onRetry={() => setAttempt((value) => value + 1)}
        title="Could not load files"
      />
    );
  }
  if (!files) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Files</CardTitle>
          <CardDescription>Objects in the static R2 bucket</CardDescription>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={6} columns={5} />
        </CardContent>
      </Card>
    );
  }

  const rows = files.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Files</h1>
          <p className="text-muted-foreground text-sm">
            Static objects served from the R2 bucket
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="file"
            ref={inputRef}
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void upload(file);
              event.target.value = "";
            }}
            aria-label="Upload file"
          />
          <Button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            <UploadIcon className="size-4" aria-hidden="true" />
            {uploading ? "Uploading" : "Upload"}
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <ModuleEmpty
          title="No files yet"
          description="Upload a static asset to serve it from the site."
          action={
            <Button
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              <UploadIcon className="size-4" aria-hidden="true" />
              Upload a file
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Uploaded</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((file) => (
                  <TableRow key={file.key}>
                    <TableCell className="max-w-64 truncate font-medium">
                      {file.key}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {formatBytes(file.size)}
                    </TableCell>
                    <TableCell>
                      {file.expiresAt ? (
                        <Badge variant="secondary">
                          {formatDate(file.expiresAt)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Never</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {formatDate(file.updated)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleting(file)}
                        aria-label={`Delete ${file.key}`}
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
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this file?</DialogTitle>
            <DialogDescription>
              Permanently delete{" "}
              <span className="font-medium">{deleting?.key}</span> from the
              static bucket. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteFile}
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

function formatBytes(value: number): string {
  if (!Number.isFinite(value)) return "0 B";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export type { FileListEntry };
