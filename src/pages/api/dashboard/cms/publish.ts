import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

import { publishStatements } from "~/lib/dashboard/cms";
import {
  bootstrapCmsDatabase,
  cmsUnavailable,
  getContentDocument,
  getCurrentDraftId,
  getRevisionById,
  toD1Like,
  toPreparedStatements,
} from "~/lib/dashboard/cms-db";
import { readDashboardBindings } from "~/lib/dashboard/env";
import { dashboardError, dashboardOk } from "~/lib/dashboard/http";
import { requireOperator } from "~/lib/require-operator";

const route: APIRoute = async ({ request }) => {
  if (request.method !== "POST") {
    return dashboardError(405, "METHOD_NOT_ALLOWED", "Publish uses POST");
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
      "INVALID_PUBLISH",
      "The publish payload is invalid",
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
    const currentDraftId = await getCurrentDraftId(db, document.id);
    if (currentDraftId !== revisionId) {
      return dashboardError(
        409,
        "NOT_A_DRAFT",
        "Only the current draft revision can be published",
      );
    }
    const draft = await getRevisionById(db, revisionId);
    if (!draft) {
      return dashboardError(
        404,
        "REVISION_NOT_FOUND",
        "The draft was not found",
      );
    }

    const statements = publishStatements({
      actor: "operator",
      createdAt: new Date().toISOString(),
      documentId: document.id,
      publishedRevisionId: revisionId,
      revisionId,
    });
    await db.batch(toPreparedStatements(db, statements));
    const published = await getRevisionById(db, revisionId);
    return dashboardOk(published, undefined, { "Cache-Control": "no-store" });
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
