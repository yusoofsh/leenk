import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

import {
  contentDigest,
  generateCmsId,
  nextRevisionNumber,
  rollbackStatements,
} from "~/lib/dashboard/cms";
import {
  bootstrapCmsDatabase,
  cmsUnavailable,
  getContentDocument,
  getCurrentDraftId,
  getDocumentRevisionContent,
  getLatestRevisionNumber,
  getRevisionById,
  toD1Like,
  toPreparedStatements,
} from "~/lib/dashboard/cms-db";
import { readDashboardBindings } from "~/lib/dashboard/env";
import { dashboardError, dashboardOk } from "~/lib/dashboard/http";
import { requireOperator } from "~/lib/require-operator";

const route: APIRoute = async ({ request }) => {
  if (request.method !== "POST") {
    return dashboardError(405, "METHOD_NOT_ALLOWED", "Rollback uses POST");
  }
  const operator = await requireOperator(request, "content:manage");
  if (operator instanceof Response) return operator;

  const bindings = readDashboardBindings(env);

  const db = toD1Like(bindings.cms);
  if (!db) return cmsUnavailable();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return dashboardError(400, "INVALID_JSON", "The request body must be JSON");
  }
  if (!isRecord(body)) {
    return dashboardError(
      400,
      "INVALID_ROLLBACK",
      "The rollback payload is invalid",
    );
  }
  const revisionId = body.revisionId;
  if (typeof revisionId !== "string" || revisionId.length === 0) {
    return dashboardError(
      400,
      "INVALID_REVISION_ID",
      "A valid revision id is required",
    );
  }

  try {
    await bootstrapCmsDatabase(db);
    const document = await getContentDocument(db);
    if (!document) {
      return dashboardError(
        500,
        "CMS_MISSING_DOCUMENT",
        "The CMS document is missing",
      );
    }
    const source = await getRevisionById(db, revisionId);
    if (!source) {
      return dashboardError(
        404,
        "REVISION_NOT_FOUND",
        "The revision was not found",
      );
    }
    if (source.state !== "archived") {
      return dashboardError(
        400,
        "NOT_ARCHIVED",
        "Only archived revisions can be rolled back",
      );
    }
    const sourceContent = await getDocumentRevisionContent(db, revisionId);
    if (!sourceContent) {
      return dashboardError(
        500,
        "REVISION_READ_FAILED",
        "The revision could not be read",
      );
    }
    const currentDraftId = await getCurrentDraftId(db, document.id);
    const clonedRevisionId = generateCmsId();
    const revisionNumber = nextRevisionNumber(
      await getLatestRevisionNumber(db, document.id),
    );
    const statements = rollbackStatements({
      actor: "operator",
      content: sourceContent,
      createdAt: new Date().toISOString(),
      currentDraftId,
      documentId: document.id,
      payloadHash: await contentDigest(sourceContent),
      revisionId: clonedRevisionId,
      revisionNumber,
      sourceRevisionId: revisionId,
    });
    await db.batch(toPreparedStatements(db, statements));
    const cloned = await getRevisionById(db, clonedRevisionId);
    if (!cloned) {
      return dashboardError(
        500,
        "ROLLBACK_FAILED",
        "The cloned draft could not be loaded",
      );
    }
    return dashboardOk(cloned, undefined, { "Cache-Control": "no-store" });
  } catch {
    return dashboardError(
      500,
      "CMS_UNAVAILABLE",
      "The CMS store is unavailable",
    );
  }
};

export const POST = route;
export const ALL = route;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
