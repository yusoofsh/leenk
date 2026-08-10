import {
  blockInsertStatements,
  contentDigest,
  generateCmsId,
  nextRevisionNumber,
  type CmsRevisionContent,
  type SqlStatement,
} from "./cms";
import {
  bootstrapCmsDatabase,
  getContentDocument,
  getLatestRevisionNumber,
  toD1Like,
  toPreparedStatements,
  type D1Like,
} from "./cms-db";
import { buildHomepageRevisionContent } from "~/lib/homepage-content";

export function importHomepageStatements(args: {
  actor: string;
  content: CmsRevisionContent;
  createdAt: string;
  documentId: string;
  payloadHash: string;
  revisionId: string;
  revisionNumber: number;
}): SqlStatement[] {
  return [
    {
      sql: `INSERT INTO content_revisions (
  id, document_id, number, state, title, seo_title, seo_description,
  seo_keywords, social_copy, profile_metadata, payload_hash, author,
  created_at
) VALUES (?, ?, ?, 'published', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      sql: `UPDATE content_documents
SET published_revision_id = ?, updated_at = ?
WHERE key = ?`,
      params: [args.revisionId, args.createdAt, "homepage"],
    },
    {
      sql: `INSERT INTO activity_entries (id, kind, actor, summary, payload, created_at)
VALUES (?, 'imported', ?, ?, ?, ?)`,
      params: [
        generateCmsId(),
        args.actor,
        `Imported the homepage as revision ${args.revisionNumber}`,
        JSON.stringify({ revisionId: args.revisionId }),
        args.createdAt,
      ],
    },
  ];
}

/**
 * Seeds the homepage document with its first Published Revision when none
 * exists. Idempotent: once a revision is published, operator content wins
 * and source changes never overwrite it.
 */
export async function ensureHomepageImported(db: D1Like): Promise<boolean> {
  await bootstrapCmsDatabase(db);
  const document = await getContentDocument(db);
  if (document && document.published_revision_id !== null) return false;

  const content = buildHomepageRevisionContent();
  const payloadHash = await contentDigest(content);
  const documentId = document?.id ?? "homepage";
  const latest = await getLatestRevisionNumber(db, documentId);
  const createdAt = new Date().toISOString();
  const statements = importHomepageStatements({
    actor: "system",
    content,
    createdAt,
    documentId,
    payloadHash,
    revisionId: generateCmsId(),
    revisionNumber: nextRevisionNumber(latest),
  });
  await db.batch(toPreparedStatements(db, statements));
  return true;
}

export { toD1Like };
