import {
  CMS_BOOTSTRAP_SQL,
  CMS_DOCUMENT_KEY,
  parseActivityEntryRow,
  parseRevisionRow,
  parseRevisionSummaryRow,
  type ActivityEntryRecord,
  type CmsRevisionContent,
  type CmsRevisionRecord,
  type CmsVariant,
  type SqlStatement,
  validateCmsBlock,
} from "~/lib/dashboard/cms";

export interface CmsDocumentRow {
  created_at: string;
  id: string;
  key: string;
  published_revision_id: string | null;
  updated_at: string;
}

export type CmsRevisionSummary = NonNullable<
  ReturnType<typeof parseRevisionSummaryRow>
>;

export interface D1Like {
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>;
  prepare(sql: string): D1PreparedStatement;
}

export function toD1Like(value: unknown): D1Like | null {
  if (typeof value !== "object" || value === null) return null;
  if (!("prepare" in value) || !("batch" in value)) return null;
  if (
    typeof value.prepare !== "function" ||
    typeof value.batch !== "function"
  ) {
    return null;
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- shape verified above the cast
  return value as unknown as D1Like;
}

export async function bootstrapCmsDatabase(db: D1Like): Promise<void> {
  await db.batch(
    CMS_BOOTSTRAP_SQL.map((statement) =>
      db.prepare(statement.sql).bind(...statement.params),
    ),
  );
  await db
    .prepare(
      `INSERT OR IGNORE INTO content_documents (id, key, created_at, updated_at)
VALUES (?, ?, ?, ?)`,
    )
    .bind(
      CMS_DOCUMENT_KEY,
      CMS_DOCUMENT_KEY,
      new Date().toISOString(),
      new Date().toISOString(),
    )
    .run();
}

export async function getContentDocument(
  db: D1Like,
): Promise<CmsDocumentRow | null> {
  const row = await db
    .prepare(
      `SELECT id, key, published_revision_id, created_at, updated_at
FROM content_documents
WHERE key = ?`,
    )
    .bind(CMS_DOCUMENT_KEY)
    .first<CmsDocumentRow>();
  return row ?? null;
}

export async function getRevisionById(
  db: D1Like,
  id: string,
): Promise<CmsRevisionRecord | null> {
  const row = await db
    .prepare(`SELECT * FROM content_revisions WHERE id = ?`)
    .bind(id)
    .first();
  const revision = parseRevisionRow(row);
  if (!revision) return null;
  const blocks = await getBlocksForRevision(db, id);
  return {
    ...revision,
    blocksFull: blocks.full,
    blocksTldr: blocks.tldr,
  };
}

export async function listRevisionSummaries(
  db: D1Like,
  documentId: string,
  limit = 50,
): Promise<CmsRevisionSummary[]> {
  const { results } = await db
    .prepare(
      `SELECT id, number, state, title, author, created_at, archived_at
FROM content_revisions
WHERE document_id = ?
ORDER BY number DESC
LIMIT ?`,
    )
    .bind(documentId, limit)
    .all();
  return results
    .map(parseRevisionSummaryRow)
    .filter((entry): entry is CmsRevisionSummary => entry !== null);
}

export async function getCurrentDraftId(
  db: D1Like,
  documentId: string,
): Promise<string | null> {
  const row = await db
    .prepare(
      `SELECT id FROM content_revisions
WHERE document_id = ? AND state = 'draft'
ORDER BY number DESC
LIMIT 1`,
    )
    .bind(documentId)
    .first<{ id: string }>();
  return row?.id ?? null;
}

export async function getLatestRevisionNumber(
  db: D1Like,
  documentId: string,
): Promise<{ number: number } | null> {
  const row = await db
    .prepare(
      `SELECT number FROM content_revisions
WHERE document_id = ?
ORDER BY number DESC
LIMIT 1`,
    )
    .bind(documentId)
    .first<{ number: number }>();
  return row ?? null;
}

export async function getDocumentRevisionContent(
  db: D1Like,
  revisionId: string,
): Promise<CmsRevisionContent | null> {
  const blocks = await getBlocksForRevision(db, revisionId);
  const row = await db
    .prepare(
      `SELECT title, seo_title, seo_description, seo_keywords, social_copy,
  profile_metadata
FROM content_revisions
WHERE id = ?`,
    )
    .bind(revisionId)
    .first();
  if (!row) return null;
  const profileMetadata = parseJsonRecord(row.profile_metadata);
  return {
    blocksFull: blocks.full,
    blocksTldr: blocks.tldr,
    profileMetadata,
    seoDescription: stringOrEmpty(row.seo_description),
    seoKeywords: stringOrEmpty(row.seo_keywords),
    seoTitle: stringOrEmpty(row.seo_title),
    socialCopy: stringOrEmpty(row.social_copy),
    title: stringOrEmpty(row.title),
  };
}

export async function listActivityEntries(
  db: D1Like,
  pageSize: number,
  cursorId: string | null,
): Promise<{ entries: ActivityEntryRecord[]; nextCursor: string | null }> {
  const safePageSize = Math.min(Math.max(pageSize, 1), 50);
  const { results } = await db
    .prepare(
      cursorId === null
        ? `SELECT * FROM activity_entries
ORDER BY created_at DESC, id DESC
LIMIT ?`
        : `SELECT * FROM activity_entries
WHERE id < ?
ORDER BY created_at DESC, id DESC
LIMIT ?`,
    )
    .bind(...(cursorId === null ? [safePageSize] : [cursorId, safePageSize]))
    .all();
  const entries = results
    .map(parseActivityEntryRow)
    .filter((entry): entry is ActivityEntryRecord => entry !== null);
  const last = entries.at(-1);
  const nextCursor = entries.length === safePageSize && last ? last.id : null;
  return { entries, nextCursor };
}

export function toPreparedStatements(
  db: D1Like,
  statements: SqlStatement[],
): D1PreparedStatement[] {
  return statements.map((statement) =>
    db.prepare(statement.sql).bind(...statement.params),
  );
}

export function cmsUnavailable(): Response {
  return Response.json(
    {
      ok: false,
      error: "cms_unavailable",
      message: "The CMS binding is not available",
      status: 503,
    },
    {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

async function getBlocksForRevision(
  db: D1Like,
  revisionId: string,
): Promise<Record<CmsVariant, CmsRevisionContent["blocksFull"]>> {
  const { results } = await db
    .prepare(
      `SELECT variant, position, kind, body
FROM content_blocks
WHERE revision_id = ?
ORDER BY variant ASC, position ASC`,
    )
    .bind(revisionId)
    .all();
  const full: CmsRevisionContent["blocksFull"] = [];
  const tldr: CmsRevisionContent["blocksFull"] = [];
  for (const row of results) {
    if (!row || (row.variant !== "full" && row.variant !== "tldr")) continue;
    const body = parseJsonRecord(row.body);
    const parsed = validateCmsBlock({
      type: row.kind,
      ...body,
    });
    if (parsed.error || !parsed.block) continue;
    if (row.variant === "full") full.push(parsed.block);
    else tldr.push(parsed.block);
  }
  return { full, tldr };
}

function stringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return typeof parsed === "object" && parsed !== null
      ? Object.fromEntries(Object.entries(parsed))
      : {};
  } catch {
    return {};
  }
}
