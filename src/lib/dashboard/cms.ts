import { isValidShortlinkCode } from "~/lib/shortlink-model";

export const CMS_DOCUMENT_KEY = "homepage";
export const CMS_BLOCK_TYPES = [
  "intro",
  "section",
  "paragraph",
  "bullet_list",
  "contact",
] as const;
export type CmsBlockType = (typeof CMS_BLOCK_TYPES)[number];

export const CMS_REVISION_STATES = ["draft", "published", "archived"] as const;
export type CmsRevisionState = (typeof CMS_REVISION_STATES)[number];

export const CMS_LINK_KINDS = [
  "url",
  "email",
  "internal",
  "shortlink",
] as const;
export type CmsLinkKind = (typeof CMS_LINK_KINDS)[number];

export const CMS_VARIANTS = ["full", "tldr"] as const;
export type CmsVariant = (typeof CMS_VARIANTS)[number];

export const MAX_CMS_BLOCKS = 64;
export const MAX_BLOCK_TEXT_LENGTH = 20_000;
export const MAX_BULLET_ITEMS = 64;
export const MAX_CMS_LINKS = 16;
export const MAX_LINK_LABEL_LENGTH = 128;
export const MAX_SEO_FIELD_LENGTH = 512;
export const MAX_INLINE_LINKS = 16;
export const INLINE_LINK_PATTERN =
  /\[([^[\]]{1,128})\]\((url|email|internal|shortlink):([^()\s]{1,2048})\)/g;

export interface CmsLink {
  kind: CmsLinkKind;
  label: string;
  target: string;
}

export interface CmsIntroBlock {
  text: string;
  type: "intro";
}

export interface CmsSectionBlock {
  heading: string;
  text: string;
  type: "section";
}

export interface CmsParagraphBlock {
  text: string;
  type: "paragraph";
}

export interface CmsBulletListBlock {
  items: string[];
  type: "bullet_list";
}

export interface CmsContactBlock {
  email: string;
  links: CmsLink[];
  type: "contact";
}

export type CmsBlock =
  | CmsIntroBlock
  | CmsSectionBlock
  | CmsParagraphBlock
  | CmsBulletListBlock
  | CmsContactBlock;

export interface CmsRevisionContent {
  blocksFull: CmsBlock[];
  blocksTldr: CmsBlock[];
  profileMetadata: Record<string, unknown>;
  seoDescription: string;
  seoKeywords: string;
  seoTitle: string;
  socialCopy: string;
  title: string;
}

export interface CmsRevisionInput extends CmsRevisionContent {
  author: string;
  createdAt: string;
  payloadHash: string;
}

export interface CmsRevisionRecord extends CmsRevisionInput {
  archivedAt: string | null;
  documentId: string;
  id: string;
  number: number;
  state: CmsRevisionState;
}

export interface ActivityEntryInput {
  actor: string;
  createdAt: string;
  kind: string;
  payload: Record<string, unknown>;
  summary: string;
}

export interface ActivityEntryRecord extends ActivityEntryInput {
  id: string;
}

export interface SqlStatement {
  params: unknown[];
  sql: string;
}

export interface CmsSchema {
  activityEntries: SqlStatement;
  contentBlocks: SqlStatement;
  contentDocuments: SqlStatement;
  contentRevisions: SqlStatement;
}

export const CMS_SCHEMA: CmsSchema = {
  contentDocuments: {
    sql: `CREATE TABLE IF NOT EXISTS content_documents (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  published_revision_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
)`,
    params: [],
  },
  contentRevisions: {
    sql: `CREATE TABLE IF NOT EXISTS content_revisions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES content_documents(id),
  number INTEGER NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('draft', 'published', 'archived')),
  title TEXT NOT NULL,
  seo_title TEXT NOT NULL,
  seo_description TEXT NOT NULL,
  seo_keywords TEXT NOT NULL,
  social_copy TEXT NOT NULL,
  profile_metadata TEXT NOT NULL DEFAULT '{}',
  payload_hash TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TEXT NOT NULL,
  archived_at TEXT,
  UNIQUE (document_id, number)
)`,
    params: [],
  },
  contentBlocks: {
    sql: `CREATE TABLE IF NOT EXISTS content_blocks (
  id TEXT PRIMARY KEY,
  revision_id TEXT NOT NULL REFERENCES content_revisions(id) ON DELETE CASCADE,
  variant TEXT NOT NULL CHECK (variant IN ('full', 'tldr')),
  position INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (
    kind IN ('intro', 'section', 'paragraph', 'bullet_list', 'contact')
  ),
  body TEXT NOT NULL,
  UNIQUE (revision_id, variant, position)
)`,
    params: [],
  },
  activityEntries: {
    sql: `CREATE TABLE IF NOT EXISTS activity_entries (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  actor TEXT NOT NULL,
  summary TEXT NOT NULL,
  payload TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL
)`,
    params: [],
  },
};

export const CMS_BOOTSTRAP_SQL = [
  CMS_SCHEMA.contentDocuments,
  CMS_SCHEMA.contentRevisions,
  CMS_SCHEMA.contentBlocks,
  CMS_SCHEMA.activityEntries,
];

export function validateCmsLink(value: unknown): {
  error?: string;
  link?: CmsLink;
} {
  if (!isRecord(value)) return { error: "Links must be objects" };
  const kind = value.kind;
  if (!isCmsLinkKind(kind)) {
    return { error: "Link kind is not supported" };
  }
  if (typeof value.label !== "string" || value.label.length === 0) {
    return { error: "Link labels are required" };
  }
  if (value.label.length > MAX_LINK_LABEL_LENGTH) {
    return { error: "Link labels are too long" };
  }
  const target = value.target;
  if (typeof target !== "string" || target.length === 0) {
    return { error: "Link targets are required" };
  }
  const targetError = validateLinkTarget(kind, target);
  if (targetError) return { error: targetError };
  return {
    link: {
      kind,
      label: value.label,
      target,
    },
  };
}

export function validateCmsBlock(value: unknown): {
  block?: CmsBlock;
  error?: string;
} {
  if (!isRecord(value) || !isCmsBlockType(value.type)) {
    return { error: "Content blocks must use a supported type" };
  }

  switch (value.type) {
    case "intro":
      return validateTextBlock(value, "intro");
    case "paragraph":
      return validateTextBlock(value, "paragraph");
    case "section": {
      if (typeof value.heading !== "string" || value.heading.length === 0) {
        return { error: "Section headings are required" };
      }
      if (value.heading.length > MAX_BLOCK_TEXT_LENGTH) {
        return { error: "Section headings are too long" };
      }
      if (typeof value.text !== "string") {
        return { error: "Section text must be a string" };
      }
      if (value.text.length > MAX_BLOCK_TEXT_LENGTH) {
        return { error: "Section text is too long" };
      }
      const sectionInlineError = validateCmsText(value.text);
      if (sectionInlineError) return { error: sectionInlineError };
      return {
        block: { heading: value.heading, text: value.text, type: "section" },
      };
    }
    case "bullet_list": {
      if (!Array.isArray(value.items) || value.items.length === 0) {
        return { error: "Bullet lists need at least one item" };
      }
      if (value.items.length > MAX_BULLET_ITEMS) {
        return { error: "Bullet lists are limited to 64 items" };
      }
      const items: string[] = [];
      for (const item of value.items) {
        if (typeof item !== "string" || item.length === 0) {
          return { error: "Bullet list items must be non-empty strings" };
        }
        if (item.length > MAX_BLOCK_TEXT_LENGTH) {
          return { error: "Bullet list items are too long" };
        }
        const itemInlineError = validateCmsText(item);
        if (itemInlineError) return { error: itemInlineError };
        items.push(item);
      }
      return { block: { items, type: "bullet_list" } };
    }
    case "contact": {
      if (typeof value.email !== "string" || value.email.length === 0) {
        return { error: "Contact blocks require an email address" };
      }
      if (
        value.email.length > MAX_SEO_FIELD_LENGTH ||
        !isValidEmail(value.email)
      ) {
        return { error: "Contact email addresses must be valid" };
      }
      const links = value.links;
      if (!Array.isArray(links) || links.length > MAX_CMS_LINKS) {
        return { error: "Contact blocks are limited to 16 links" };
      }
      const validatedLinks: CmsLink[] = [];
      for (const link of links) {
        const parsed = validateCmsLink(link);
        if (parsed.error || !parsed.link) {
          return { error: parsed.error ?? "Contact links are invalid" };
        }
        validatedLinks.push(parsed.link);
      }
      return {
        block: {
          email: value.email,
          links: validatedLinks,
          type: "contact",
        },
      };
    }
    default:
      return { error: "Content blocks must use a supported type" };
  }
}

export function validateCmsBlocks(
  value: unknown,
  variant: CmsVariant,
): { blocks?: CmsBlock[]; error?: string } {
  if (!Array.isArray(value)) {
    return { error: `${variant} content must be a block list` };
  }
  if (value.length > MAX_CMS_BLOCKS) {
    return { error: `${variant} content is limited to 64 blocks` };
  }
  const blocks: CmsBlock[] = [];
  for (const entry of value) {
    const parsed = validateCmsBlock(entry);
    if (parsed.error || !parsed.block) {
      return { error: parsed.error ?? "Content block is invalid" };
    }
    blocks.push(parsed.block);
  }
  return { blocks };
}

export function validateRevisionContent(value: unknown): {
  content?: CmsRevisionContent;
  error?: string;
} {
  if (!isRecord(value)) return { error: "Revision content is invalid" };

  const blocksFull = validateCmsBlocks(value.blocksFull, "full");
  if (blocksFull.error || !blocksFull.blocks) {
    return { error: blocksFull.error ?? "full content is invalid" };
  }
  const blocksTldr = validateCmsBlocks(value.blocksTldr, "tldr");
  if (blocksTldr.error || !blocksTldr.blocks) {
    return { error: blocksTldr.error ?? "tldr content is invalid" };
  }
  if (typeof value.title !== "string" || value.title.trim().length === 0) {
    return { error: "Revision titles are required" };
  }
  if (value.title.length > MAX_SEO_FIELD_LENGTH) {
    return { error: "Revision titles are too long" };
  }

  const seoTitle = optionalString(value.seoTitle, "SEO titles");
  const seoDescription = optionalString(
    value.seoDescription,
    "SEO descriptions",
  );
  const seoKeywords = optionalString(value.seoKeywords, "SEO keywords");
  const socialCopy = optionalString(value.socialCopy, "Social copy");
  if (
    seoTitle.error ||
    seoDescription.error ||
    seoKeywords.error ||
    socialCopy.error
  ) {
    return {
      error:
        seoTitle.error ??
        seoDescription.error ??
        seoKeywords.error ??
        socialCopy.error ??
        "Revision metadata is invalid",
    };
  }
  const profileMetadata = value.profileMetadata;
  if (profileMetadata !== undefined && !isJsonSafeValue(profileMetadata)) {
    return { error: "Profile metadata must be a plain object" };
  }
  const safeProfile: Record<string, unknown> =
    profileMetadata === undefined || !isRecord(profileMetadata)
      ? {}
      : profileMetadata;

  return {
    content: {
      blocksFull: blocksFull.blocks,
      blocksTldr: blocksTldr.blocks,
      profileMetadata: safeProfile,
      seoDescription: seoDescription.value ?? "",
      seoKeywords: seoKeywords.value ?? "",
      seoTitle: seoTitle.value ?? "",
      socialCopy: socialCopy.value ?? "",
      title: value.title.trim(),
    },
  };
}

export function resolveSaveDraftBaseline(args: {
  currentDraftId: string | null;
  expectedRevisionId: string;
}): "ok" | "stale" {
  if (args.currentDraftId !== null) {
    return args.expectedRevisionId === args.currentDraftId ? "ok" : "stale";
  }
  return "ok";
}

export function canTransitionRevisionState(
  from: CmsRevisionState,
  to: CmsRevisionState,
): boolean {
  if (from === "draft" && to === "published") return true;
  if (from === "published" && to === "archived") return true;
  if (from === "draft" && to === "archived") return true;
  return false;
}

export function nextRevisionNumber(current: { number: number } | null): number {
  return (current?.number ?? 0) + 1;
}

export function saveDraftStatements(args: {
  content: CmsRevisionContent;
  createdAt: string;
  currentDraftId: string | null;
  documentId: string;
  payloadHash: string;
  revisionId: string;
  revisionNumber: number;
  actor: string;
}): SqlStatement[] {
  const statements: SqlStatement[] = [];
  if (args.currentDraftId !== null) {
    statements.push({
      sql: `UPDATE content_revisions
SET state = 'archived', archived_at = ?
WHERE id = ? AND state = 'draft'`,
      params: [args.createdAt, args.currentDraftId],
    });
  }
  statements.push({
    sql: `INSERT INTO content_revisions (
  id, document_id, number, state, title, seo_title, seo_description,
  seo_keywords, social_copy, profile_metadata, payload_hash, author,
  created_at
) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params: [
      args.revisionId,
      args.documentId,
      args.revisionNumber,
      args.content.title,
      args.content.seoTitle,
      args.content.seoDescription,
      args.content.seoKeywords,
      args.content.socialCopy,
      JSON.stringify(args.content.profileMetadata),
      args.payloadHash,
      args.actor,
      args.createdAt,
    ],
  });
  statements.push(
    ...blockInsertStatements(args.revisionId, "full", args.content.blocksFull),
  );
  statements.push(
    ...blockInsertStatements(args.revisionId, "tldr", args.content.blocksTldr),
  );
  statements.push({
    sql: `INSERT INTO activity_entries (id, kind, actor, summary, payload, created_at)
VALUES (?, 'draft_saved', ?, ?, ?, ?)`,
    params: [
      generateCmsId(),
      args.actor,
      `Saved draft revision ${args.revisionNumber}`,
      JSON.stringify({
        revisionId: args.revisionId,
        title: args.content.title,
      }),
      args.createdAt,
    ],
  });
  return statements;
}

export function publishStatements(args: {
  createdAt: string;
  documentId: string;
  publishedRevisionId: string;
  revisionId: string;
  actor: string;
}): SqlStatement[] {
  return [
    {
      sql: `UPDATE content_revisions
SET state = 'archived', archived_at = ?
WHERE document_id = ? AND state = 'published'`,
      params: [args.createdAt, args.documentId],
    },
    {
      sql: `UPDATE content_revisions
SET state = 'published'
WHERE id = ? AND document_id = ? AND state = 'draft'`,
      params: [args.revisionId, args.documentId],
    },
    {
      sql: `UPDATE content_documents
SET published_revision_id = ?, updated_at = ?
WHERE key = ?`,
      params: [args.publishedRevisionId, args.createdAt, CMS_DOCUMENT_KEY],
    },
    {
      sql: `INSERT INTO activity_entries (id, kind, actor, summary, payload, created_at)
VALUES (?, 'published', ?, ?, ?, ?)`,
      params: [
        generateCmsId(),
        args.actor,
        "Published a content revision",
        JSON.stringify({ revisionId: args.revisionId }),
        args.createdAt,
      ],
    },
  ];
}

export function rollbackStatements(args: {
  actor: string;
  content: CmsRevisionContent;
  createdAt: string;
  currentDraftId: string | null;
  documentId: string;
  payloadHash: string;
  revisionId: string;
  revisionNumber: number;
  sourceRevisionId: string;
}): SqlStatement[] {
  return [
    ...(args.currentDraftId === null
      ? []
      : [
          {
            sql: `UPDATE content_revisions
SET state = 'archived', archived_at = ?
WHERE id = ? AND state = 'draft'`,
            params: [args.createdAt, args.currentDraftId],
          } satisfies SqlStatement,
        ]),
    {
      sql: `INSERT INTO content_revisions (
  id, document_id, number, state, title, seo_title, seo_description,
  seo_keywords, social_copy, profile_metadata, payload_hash, author,
  created_at
) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [
        args.revisionId,
        args.documentId,
        args.revisionNumber,
        args.content.title,
        args.content.seoTitle,
        args.content.seoDescription,
        args.content.seoKeywords,
        args.content.socialCopy,
        JSON.stringify(args.content.profileMetadata),
        args.payloadHash,
        args.actor,
        args.createdAt,
      ],
    },
    ...blockInsertStatements(args.revisionId, "full", args.content.blocksFull),
    ...blockInsertStatements(args.revisionId, "tldr", args.content.blocksTldr),
    {
      sql: `INSERT INTO activity_entries (id, kind, actor, summary, payload, created_at)
VALUES (?, 'rollback_prepared', ?, ?, ?, ?)`,
      params: [
        generateCmsId(),
        args.actor,
        `Cloned revision into draft ${args.revisionNumber}`,
        JSON.stringify({
          sourceRevisionId: args.sourceRevisionId,
          title: args.content.title,
        }),
        args.createdAt,
      ],
    },
  ];
}

export function parseRevisionSummaryRow(row: unknown): {
  archivedAt: string | null;
  author: string;
  createdAt: string;
  id: string;
  number: number;
  state: CmsRevisionState;
  title: string;
} | null {
  if (!isRecord(row)) return null;
  const id = row.id;
  const number = row.number;
  const state = row.state;
  if (
    typeof id !== "string" ||
    id.length === 0 ||
    typeof number !== "number" ||
    !isCmsRevisionState(state)
  ) {
    return null;
  }
  return {
    archivedAt: stringOrNull(row.archived_at),
    author: stringOrEmpty(row.author),
    createdAt: stringOrEmpty(row.created_at),
    id,
    number,
    state,
    title: stringOrEmpty(row.title),
  };
}

export function parseRevisionRow(row: unknown): CmsRevisionRecord | null {
  if (!isRecord(row)) return null;
  const summary = parseRevisionSummaryRow(row);
  if (!summary) return null;
  const documentId = row.document_id;
  if (typeof documentId !== "string" || documentId.length === 0) return null;
  const content = validateRevisionContent({
    blocksFull: [],
    blocksTldr: [],
    profileMetadata: parseJsonRecord(row.profile_metadata),
    seoDescription: stringOrEmpty(row.seo_description),
    seoKeywords: stringOrEmpty(row.seo_keywords),
    seoTitle: stringOrEmpty(row.seo_title),
    socialCopy: stringOrEmpty(row.social_copy),
    title: stringOrEmpty(row.title),
  });
  if (content.error || !content.content) return null;
  return {
    ...content.content,
    archivedAt: summary.archivedAt,
    author: summary.author,
    createdAt: summary.createdAt,
    documentId,
    id: summary.id,
    number: summary.number,
    payloadHash: stringOrEmpty(row.payload_hash),
    state: summary.state,
  };
}

export function parseActivityEntryRow(
  row: unknown,
): ActivityEntryRecord | null {
  if (!isRecord(row)) return null;
  const id = row.id;
  if (typeof id !== "string" || id.length === 0) return null;
  const kind = row.kind;
  if (typeof kind !== "string" || kind.length === 0) return null;
  return {
    actor: stringOrEmpty(row.actor),
    createdAt: stringOrEmpty(row.created_at),
    id,
    kind,
    payload: parseJsonRecord(row.payload),
    summary: stringOrEmpty(row.summary),
  };
}

export async function contentDigest(
  content: CmsRevisionContent,
): Promise<string> {
  const canonical = JSON.stringify(content);
  const bytes = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return hexDigest(digest);
}

export function generateCmsId(): string {
  return globalThis.crypto.randomUUID();
}

export function blockInsertStatements(
  revisionId: string,
  variant: CmsVariant,
  blocks: CmsBlock[],
): SqlStatement[] {
  return blocks.map((block, index) => ({
    sql: `INSERT INTO content_blocks (
  id, revision_id, variant, position, kind, body
) VALUES (?, ?, ?, ?, ?, ?)`,
    params: [
      generateCmsId(),
      revisionId,
      variant,
      index,
      block.type,
      JSON.stringify(blockBody(block)),
    ],
  }));
}

function blockBody(block: CmsBlock): Record<string, unknown> {
  switch (block.type) {
    case "intro":
    case "paragraph":
      return { text: block.text };
    case "section":
      return { heading: block.heading, text: block.text };
    case "bullet_list":
      return { items: block.items };
    case "contact":
      return { email: block.email, links: block.links };
    default:
      return {};
  }
}

function validateTextBlock(
  value: Record<string, unknown>,
  type: "intro" | "paragraph",
): { block?: CmsIntroBlock | CmsParagraphBlock; error?: string } {
  if (typeof value.text !== "string" || value.text.length === 0) {
    return { error: `${type} blocks require text` };
  }
  if (value.text.length > MAX_BLOCK_TEXT_LENGTH) {
    return { error: `${type} blocks are too long` };
  }
  const inlineError = validateCmsText(value.text);
  if (inlineError) return { error: inlineError };
  return type === "intro"
    ? { block: { text: value.text, type: "intro" } }
    : { block: { text: value.text, type: "paragraph" } };
}

/**
 * Validates bounded inline links of the form `[label](kind:target)` inside
 * block text. This is the only markup the CMS accepts: no HTML, no nesting,
 * and every target is validated the same way typed CmsLink values are.
 */
export function validateInlineLinks(text: string): string | null {
  let count = 0;
  for (const match of text.matchAll(INLINE_LINK_PATTERN)) {
    count += 1;
    if (count > MAX_INLINE_LINKS) {
      return `Text is limited to ${MAX_INLINE_LINKS} inline links`;
    }
    const label = match[1] ?? "";
    const kindValue = match[2];
    if (!isCmsLinkKind(kindValue)) {
      return "Inline link kind is not supported";
    }
    const target = match[3] ?? "";
    if (label.includes("[") || label.includes("]")) {
      return "Inline link labels are invalid";
    }
    const targetError = validateLinkTarget(kindValue, target);
    if (targetError) return targetError;
  }
  return null;
}

export function validateCmsText(text: string): string | null {
  return validateInlineLinks(text);
}

export function validateLinkTarget(
  kind: CmsLinkKind,
  target: string,
): string | null {
  if (kind === "url") {
    try {
      const url = new URL(target);
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return "URL links must use http or https";
      }
      return null;
    } catch {
      return "URL links must be valid URLs";
    }
  }
  if (kind === "email") {
    return isValidEmail(target)
      ? null
      : "Email links must be valid email addresses";
  }
  if (kind === "internal") {
    if (!target.startsWith("/") || target.startsWith("//")) {
      return "Internal links must be same-origin paths";
    }
    if (target.includes("\\") || target.includes("#")) {
      return "Internal links are invalid";
    }
    return null;
  }
  return isValidShortlinkCode(target) ? null : "Shortlinks must be valid codes";
}

function optionalString(
  value: unknown,
  label: string,
): { error?: string; value?: string } {
  if (value === undefined) return {};
  if (typeof value !== "string") return { error: `${label} must be strings` };
  if (value.length > MAX_SEO_FIELD_LENGTH) {
    return { error: `${label} are too long` };
  }
  return { value };
}

function isValidEmail(value: string): boolean {
  if (value.length > 320) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function isCmsLinkKind(value: unknown): value is CmsLinkKind {
  return (CMS_LINK_KINDS as readonly string[]).includes(String(value));
}

function isCmsBlockType(value: unknown): value is CmsBlockType {
  return (CMS_BLOCK_TYPES as readonly string[]).includes(String(value));
}

function isCmsRevisionState(value: unknown): value is CmsRevisionState {
  return (CMS_REVISION_STATES as readonly string[]).includes(String(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function stringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function parseJsonRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function isJsonSafeValue(value: unknown): boolean {
  if (value === null) return true;
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return true;
  }
  if (Array.isArray(value)) return value.every(isJsonSafeValue);
  if (isRecord(value)) return Object.values(value).every(isJsonSafeValue);
  return false;
}

function hexDigest(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
