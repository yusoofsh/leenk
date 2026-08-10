import { PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "~/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import {
  dashboardMutation,
  dashboardFetch,
  formatDate,
  type CmsOverviewData,
  type DashboardResult,
} from "~/lib/dashboard/client";
import {
  CMS_BLOCK_TYPES,
  type CmsBlock,
  type CmsRevisionRecord,
} from "~/lib/dashboard/cms";

type BlockType = CmsBlock["type"];

const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  bullet_list: "Bullet List",
  contact: "Contact",
  intro: "Intro",
  paragraph: "Paragraph",
  section: "Section",
};

interface EditorState {
  blocksFull: EditableBlock[];
  blocksTldr: EditableBlock[];
  open: boolean;
  saving: boolean;
  title: string;
}

interface EditableBlock {
  block: CmsBlock;
  id: string;
}

export function Content() {
  const [overview, setOverview] =
    useState<DashboardResult<CmsOverviewData> | null>(null);
  const [editor, setEditor] = useState<EditorState>({
    blocksFull: [],
    blocksTldr: [],
    open: false,
    saving: false,
    title: "",
  });
  const [publishing, setPublishing] = useState(false);
  const [publishTarget, setPublishTarget] = useState<string | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<string | null>(null);
  const [rollingBack, setRollingBack] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    void dashboardFetch<CmsOverviewData>("/api/dashboard/cms").then(
      setOverview,
    );
  }, [attempt]);

  if (overview && !overview.ok && overview.error === "cms_unavailable") {
    return <CmsUnavailable />;
  }
  if (overview && !overview.ok) {
    return (
      <ModuleError
        error={overview}
        onRetry={() => setAttempt((value) => value + 1)}
        title="Could not load content"
      />
    );
  }
  if (!overview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Content</CardTitle>
          <CardDescription>Homepage document and revisions</CardDescription>
        </CardHeader>
        <CardContent>
          <TableSkeleton rows={5} columns={5} />
        </CardContent>
      </Card>
    );
  }

  const data = overview.data;
  const published = data.published;
  const currentDraft =
    data.revisions.find((revision) => revision.state === "draft") ?? null;
  const baselineId = currentDraft?.id ?? published?.id ?? data.document.id;

  const openEditor = async () => {
    const base = currentDraft ?? published;
    if (!base) {
      setEditor({
        blocksFull: [],
        blocksTldr: [],
        open: true,
        saving: false,
        title: "Homepage",
      });
      return;
    }
    const full = isFullRevision(base)
      ? base
      : await dashboardFetch<CmsRevisionRecord>(
          `/api/dashboard/cms/revisions/${encodeURIComponent(base.id)}`,
        ).then((result) => {
          if (!result.ok) {
            toast.error("Could not open the draft", {
              description: result.message,
            });
            return null;
          }
          return result.data;
        });
    if (!full) return;
    setEditor({
      blocksFull: full.blocksFull.map(toEditable),
      blocksTldr: full.blocksTldr.map(toEditable),
      open: true,
      saving: false,
      title: full.title,
    });
  };

  const saveDraft = async () => {
    setEditor((current) => ({ ...current, saving: true }));
    const result = await dashboardMutation<CmsRevisionRecord>(
      "/api/dashboard/cms/drafts",
      {
        blocksFull: editor.blocksFull.map(fromEditable),
        blocksTldr: editor.blocksTldr.map(fromEditable),
        expectedRevisionId: baselineId,
        title: editor.title,
      },
    );
    setEditor((current) => ({ ...current, saving: false }));
    if (result.ok) {
      toast.success("Draft saved");
      setEditor((current) => ({ ...current, open: false }));
      setAttempt((value) => value + 1);
    } else {
      toast.error(
        result.error === "STALE_DRAFT" ? "Stale draft" : "Save failed",
        {
          description:
            result.error === "STALE_DRAFT"
              ? "Someone else saved a newer draft. Refresh and reapply your changes."
              : result.message,
        },
      );
    }
  };

  const publish = async (revisionId: string) => {
    setPublishing(true);
    const result = await dashboardMutation<CmsRevisionRecord>(
      "/api/dashboard/cms/publish",
      {
        revisionId,
      },
    );
    setPublishing(false);
    setPublishTarget(null);
    if (result.ok) {
      toast.success("Revision published");
      setAttempt((value) => value + 1);
    } else {
      toast.error("Publish failed", { description: result.message });
    }
  };

  const rollback = async (revisionId: string) => {
    setRollingBack(true);
    const result = await dashboardMutation<CmsRevisionRecord>(
      "/api/dashboard/cms/rollback",
      {
        revisionId,
      },
    );
    setRollingBack(false);
    setRollbackTarget(null);
    if (result.ok) {
      toast.success("Rollback draft created");
      setAttempt((value) => value + 1);
    } else {
      toast.error("Rollback failed", { description: result.message });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Content</h1>
          <p className="text-muted-foreground text-sm">
            Homepage document with draft, publish, and rollback
          </p>
        </div>
        <div className="flex gap-2">
          {currentDraft ? (
            <Button
              onClick={() => publish(currentDraft.id)}
              disabled={publishing}
            >
              {publishing ? "Publishing" : "Publish draft"}
            </Button>
          ) : null}
          <Button variant="outline" onClick={openEditor}>
            {currentDraft ? "Edit draft" : "Create draft"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Revisions</CardTitle>
          <CardDescription>
            Newest first; drafts, published, and archived
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Author</TableHead>
                <TableHead className="text-right">Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.revisions.map((revision) => (
                <TableRow key={revision.id}>
                  <TableCell className="tabular-nums">
                    {revision.number}
                  </TableCell>
                  <TableCell className="font-medium">
                    {revision.title}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        revision.state === "published" ? "default" : "secondary"
                      }
                    >
                      {revision.state}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {revision.author}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right tabular-nums">
                    {formatDate(revision.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    {revision.state === "archived" ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setRollbackTarget(revision.id)}
                        disabled={rollingBack}
                      >
                        Roll back
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Published preview</CardTitle>
          <CardDescription>Read-only view of the live revision</CardDescription>
        </CardHeader>
        <CardContent>
          {published ? (
            <BlockPreview
              blocksFull={published.blocksFull}
              blocksTldr={published.blocksTldr}
              title={published.title}
            />
          ) : (
            <p className="text-muted-foreground text-sm">
              Nothing published yet.
            </p>
          )}
        </CardContent>
      </Card>

      <Sheet
        open={editor.open}
        onOpenChange={(open) => setEditor((current) => ({ ...current, open }))}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Edit draft</SheetTitle>
            <SheetDescription>
              Edit the homepage draft. Save Draft creates a new revision and
              archives the previous draft.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="draft-title">Title</Label>
              <Input
                id="draft-title"
                value={editor.title}
                onChange={(event) =>
                  setEditor((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
              />
            </div>
            <Tabs defaultValue="full">
              <TabsList>
                <TabsTrigger value="full">Full</TabsTrigger>
                <TabsTrigger value="tldr">TL;DR</TabsTrigger>
              </TabsList>
              <TabsContent value="full" className="space-y-3">
                <BlockEditor
                  blocks={editor.blocksFull}
                  onChange={(blocksFull) =>
                    setEditor((current) => ({ ...current, blocksFull }))
                  }
                />
              </TabsContent>
              <TabsContent value="tldr" className="space-y-3">
                <BlockEditor
                  blocks={editor.blocksTldr}
                  onChange={(blocksTldr) =>
                    setEditor((current) => ({ ...current, blocksTldr }))
                  }
                />
              </TabsContent>
            </Tabs>
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() =>
                setEditor((current) => ({ ...current, open: false }))
              }
            >
              Cancel
            </Button>
            <Button onClick={saveDraft} disabled={editor.saving}>
              {editor.saving ? "Saving" : "Save draft"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Dialog
        open={publishTarget !== null}
        onOpenChange={(open) => !open && setPublishTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish this draft?</DialogTitle>
            <DialogDescription>
              Publishing replaces the live homepage in one atomic operation and
              archives the current published revision.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => publishTarget && publish(publishTarget)}
              disabled={publishing}
            >
              {publishing ? "Publishing" : "Publish"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rollbackTarget !== null}
        onOpenChange={(open) => !open && setRollbackTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Roll back this revision?</DialogTitle>
            <DialogDescription>
              Clones the archived revision into a new draft. The draft still
              needs to be published through the normal flow.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRollbackTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => rollbackTarget && rollback(rollbackTarget)}
              disabled={rollingBack}
            >
              {rollingBack ? "Cloning" : "Roll back"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BlockPreview({
  blocksFull,
  blocksTldr,
  title,
}: {
  blocksFull: CmsBlock[];
  blocksTldr: CmsBlock[];
  title: string;
}) {
  const [variant, setVariant] = useState<"full" | "tldr">("full");
  const blocks = variant === "full" ? blocksFull : blocksTldr;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-sm font-medium">{title}</p>
        <Tabs
          value={variant}
          onValueChange={(value) =>
            setVariant(value === "full" ? "full" : "tldr")
          }
        >
          <TabsList>
            <TabsTrigger value="full">Full</TabsTrigger>
            <TabsTrigger value="tldr">TL;DR</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="space-y-3 text-sm">
        {blocks.map((block) => (
          <BlockPreviewRow key={previewKey(block)} block={block} />
        ))}
      </div>
    </div>
  );
}

function BlockPreviewRow({ block }: { block: CmsBlock }) {
  switch (block.type) {
    case "intro":
      return <p>{block.text}</p>;
    case "section":
      return (
        <div>
          <h3 className="font-semibold">{block.heading}</h3>
          <p>{block.text}</p>
        </div>
      );
    case "paragraph":
      return <p>{block.text}</p>;
    case "bullet_list":
      return (
        <ul className="list-disc pl-5">
          {block.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      );
    case "contact":
      return (
        <p>
          {block.email}
          {block.links.length > 0
            ? ` (${block.links.map((link) => link.label).join(", ")})`
            : ""}
        </p>
      );
    default:
      return null;
  }
}

function BlockEditor({
  blocks,
  onChange,
}: {
  blocks: EditableBlock[];
  onChange: (blocks: EditableBlock[]) => void;
}) {
  const updateBlock = (index: number, block: CmsBlock) => {
    const next = [...blocks];
    next[index] = { block, id: next[index]!.id };
    onChange(next);
  };
  const removeBlock = (index: number) => {
    onChange(blocks.filter((_, blockIndex) => blockIndex !== index));
  };
  const addBlock = (type: BlockType) => {
    onChange([...blocks, { block: emptyBlock(type), id: crypto.randomUUID() }]);
  };

  return (
    <div className="space-y-3">
      {blocks.map((entry, index) => (
        <div key={entry.id} className="rounded-md border p-3">
          <BlockField
            block={entry.block}
            onChange={(next) => updateBlock(index, next)}
          />
          <Button
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => removeBlock(index)}
            aria-label={`Remove ${BLOCK_TYPE_LABELS[entry.block.type]} block`}
          >
            <Trash2Icon className="size-3.5" aria-hidden="true" />
            Remove
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Select
          value="__add__"
          onValueChange={(value) => {
            if (isBlockType(value)) addBlock(value);
          }}
        >
          <SelectTrigger className="w-40" aria-label="Add block">
            <SelectValue placeholder="Add block" />
          </SelectTrigger>
          <SelectContent>
            {(CMS_BLOCK_TYPES as readonly BlockType[]).map((type) => (
              <SelectItem key={type} value={type}>
                {BLOCK_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => addBlock("paragraph")}
        >
          <PlusIcon className="size-3.5" aria-hidden="true" />
          Add paragraph
        </Button>
      </div>
    </div>
  );
}

function BlockField({
  block,
  onChange,
}: {
  block: CmsBlock;
  onChange: (block: CmsBlock) => void;
}) {
  const label = BLOCK_TYPE_LABELS[block.type];
  switch (block.type) {
    case "intro":
    case "paragraph":
      if (block.type === "intro" || block.type === "paragraph") {
        return (
          <div className="space-y-2">
            <Label>{label} text</Label>
            <Textarea
              value={block.text}
              onChange={(event) =>
                onChange({ ...block, text: event.target.value })
              }
              rows={3}
            />
          </div>
        );
      }
      return null;
    case "section": {
      const section = block;
      return (
        <div className="space-y-2">
          <Label>Section heading</Label>
          <Input
            value={section.heading}
            onChange={(event) =>
              onChange({ ...block, heading: event.target.value })
            }
          />
          <Label>Section text</Label>
          <Textarea
            value={section.text}
            onChange={(event) =>
              onChange({ ...block, text: event.target.value })
            }
            rows={3}
          />
        </div>
      );
    }
    case "bullet_list": {
      const list = block;
      return (
        <div className="space-y-2">
          <Label>Bullet list items</Label>
          {list.items.map((item, index) => (
            // oxlint-disable-next-line react/no-array-index-key -- editable item rows keep position identity
            <div key={`${item}-${index}`} className="flex gap-2">
              <Input
                value={item}
                aria-label={`Bullet item ${index + 1}`}
                onChange={(event) => {
                  const items = [...list.items];
                  items[index] = event.target.value;
                  onChange({ ...block, items });
                }}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove bullet item ${index + 1}`}
                onClick={() => {
                  const items = list.items.filter(
                    (_, itemIndex) => itemIndex !== index,
                  );
                  onChange({ ...block, items });
                }}
              >
                <Trash2Icon className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onChange({ ...block, items: [...list.items, ""] })}
          >
            <PlusIcon className="size-3.5" aria-hidden="true" />
            Add item
          </Button>
        </div>
      );
    }
    case "contact": {
      const contact = block;
      return (
        <div className="space-y-2">
          <Label>Contact email</Label>
          <Input
            value={contact.email}
            onChange={(event) =>
              onChange({ ...block, email: event.target.value })
            }
          />
          <Label>Links</Label>
          {contact.links.map((link, index) => (
            <div key={`${link.label}-${link.target}`} className="flex gap-2">
              <Input
                className="w-28"
                value={link.label}
                aria-label={`Link ${index + 1} label`}
                onChange={(event) => {
                  const links = [...contact.links];
                  links[index] = { ...link, label: event.target.value };
                  onChange({ ...block, links });
                }}
              />
              <Input
                value={link.target}
                aria-label={`Link ${index + 1} target`}
                onChange={(event) => {
                  const links = [...contact.links];
                  links[index] = { ...link, target: event.target.value };
                  onChange({ ...block, links });
                }}
              />
            </div>
          ))}
        </div>
      );
    }
    default:
      return null;
  }
}

function emptyBlock(type: BlockType): CmsBlock {
  switch (type) {
    case "intro":
      return { text: "", type: "intro" };
    case "section":
      return { heading: "", text: "", type: "section" };
    case "paragraph":
      return { text: "", type: "paragraph" };
    case "bullet_list":
      return { items: [""], type: "bullet_list" };
    case "contact":
      return { email: "", links: [], type: "contact" };
    default:
      return { text: "", type: "paragraph" };
  }
}

function isBlockType(value: string): value is BlockType {
  return (CMS_BLOCK_TYPES as readonly string[]).includes(value);
}

function isFullRevision(
  value: CmsRevisionRecord | CmsOverviewData["revisions"][number],
): value is CmsRevisionRecord {
  return "blocksFull" in value;
}

function previewKey(block: CmsBlock): string {
  switch (block.type) {
    case "intro":
    case "paragraph":
      return `${block.type}-${block.text.slice(0, 24)}`;
    case "section":
      return `${block.type}-${block.heading}`;
    case "bullet_list":
      return `${block.type}-${block.items.join("|").slice(0, 24)}`;
    case "contact":
      return `${block.type}-${block.email}`;
    default:
      return "block";
  }
}

function toEditable(block: CmsBlock): EditableBlock {
  return { block, id: crypto.randomUUID() };
}

function fromEditable(entry: EditableBlock): CmsBlock {
  return entry.block;
}

function CmsUnavailable() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Content</CardTitle>
      </CardHeader>
      <CardContent>
        <ModuleError
          error={{
            error: "cms_unavailable",
            message: "The CMS binding is not configured for this environment.",
            ok: false,
            status: 503,
          }}
          onRetry={() => undefined}
          title="CMS binding unavailable"
        />
      </CardContent>
    </Card>
  );
}
