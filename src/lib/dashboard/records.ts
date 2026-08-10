import { SHORTLINK_STORAGE_PREFIX } from "~/lib/shortlink-constants";
import { parseShortlinkRecord, type ShortlinkRecord } from "~/lib/shortlinks";

export const MAX_DASHBOARD_RECORDS = 500;

export interface ShortlinkListEntry {
  campaign?: ShortlinkRecord["campaign"];
  clicks?: number;
  code: string;
  expiresAt?: string;
  kind: "internal" | "static";
  label: string | null;
  updated: string;
}

export interface FileListEntry {
  expiresAt?: string;
  key: string;
  label?: string;
  size: number;
  updated: string;
}

export interface ShortlinkRecordBucket {
  get(key: string): Promise<{ json(): Promise<unknown> } | null>;
  list(options?: R2ListOptions): Promise<R2Objects>;
}

export async function listShortlinkRecords(
  bucket: ShortlinkRecordBucket,
  limit = MAX_DASHBOARD_RECORDS,
): Promise<ShortlinkListEntry[]> {
  const listed = await bucket.list({
    limit,
    prefix: SHORTLINK_STORAGE_PREFIX,
  });
  const codes = listed.objects
    .map((object) => object.key.slice(SHORTLINK_STORAGE_PREFIX.length))
    .filter((code) => code.length > 0)
    .slice(0, limit);
  const storedObjects = await Promise.all(
    codes.map(async (code) => {
      const object = await bucket.get(`${SHORTLINK_STORAGE_PREFIX}${code}`);
      return object ? { code, object } : null;
    }),
  );
  const entries: ShortlinkListEntry[] = [];
  const parsedRecords = await Promise.all(
    storedObjects.map(async (stored) => {
      if (!stored) return null;
      const record = parseShortlinkRecord(await stored.object.json());
      return record
        ? { code: stored.code, object: stored.object, record }
        : null;
    }),
  );
  for (const parsed of parsedRecords) {
    if (!parsed || entries.length >= limit) continue;
    const object = listed.objects.find(
      (candidate) =>
        candidate.key === `${SHORTLINK_STORAGE_PREFIX}${parsed.code}`,
    );
    if (!object) continue;
    entries.push(toShortlinkListEntry(parsed.code, parsed.record, object));
  }
  entries.sort((a, b) => b.updated.localeCompare(a.updated));
  return entries;
}

export async function listStaticFiles(
  bucket: { list(options?: R2ListOptions): Promise<R2Objects> },
  limit = MAX_DASHBOARD_RECORDS,
): Promise<FileListEntry[]> {
  const listed = await bucket.list({
    include: ["customMetadata"],
    limit,
  });
  const entries: FileListEntry[] = [];
  for (const object of listed.objects) {
    if (object.key.startsWith(SHORTLINK_STORAGE_PREFIX)) continue;
    const entry: FileListEntry = {
      key: object.key,
      size: object.size,
      updated: object.uploaded.toISOString(),
    };
    const expiresAt = object.customMetadata?.expiresAt;
    const label = object.customMetadata?.label;
    if (typeof expiresAt === "string") entry.expiresAt = expiresAt;
    if (typeof label === "string" && label.length > 0) entry.label = label;
    entries.push(entry);
  }
  entries.sort((a, b) => b.updated.localeCompare(a.updated));
  return entries;
}

export function attachRecentClicks(
  entries: ShortlinkListEntry[],
  rows: Array<Record<string, number | string>>,
): ShortlinkListEntry[] {
  const clicksByLabel = new Map<string, number>();
  for (const row of rows) {
    const label = row.label;
    const clicks = row.clicks;
    if (typeof label !== "string" || typeof clicks !== "number") continue;
    clicksByLabel.set(label, (clicksByLabel.get(label) ?? 0) + clicks);
  }
  return entries.map((entry) => {
    if (!entry.label) return entry;
    const clicks = clicksByLabel.get(entry.label);
    return clicks === undefined ? entry : { ...entry, clicks };
  });
}

function toShortlinkListEntry(
  code: string,
  record: ShortlinkRecord,
  object: R2Object,
): ShortlinkListEntry {
  const entry: ShortlinkListEntry = {
    code,
    kind: record.path !== undefined ? "static" : "internal",
    label: record.label ?? null,
    updated: object.uploaded.toISOString(),
  };
  if (record.campaign) entry.campaign = record.campaign;
  if (record.expiresAt) entry.expiresAt = record.expiresAt;
  return entry;
}
