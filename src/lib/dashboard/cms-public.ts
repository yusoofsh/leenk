import {
  getContentDocument,
  getDocumentRevisionContent,
  type D1Like,
} from "./cms-db";
import type { CmsRevisionContent } from "./cms";

export async function getPublishedHomepageContent(
  db: D1Like,
): Promise<CmsRevisionContent | null> {
  const document = await getContentDocument(db);
  if (!document || document.published_revision_id === null) return null;
  return getDocumentRevisionContent(db, document.published_revision_id);
}
