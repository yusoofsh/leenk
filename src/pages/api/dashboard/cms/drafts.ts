import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

import {
  contentDigest,
  generateCmsId,
  nextRevisionNumber,
  resolveSaveDraftBaseline,
  saveDraftStatements,
  validateRevisionContent,
} from "~/lib/dashboard/cms";
import {
  bootstrapCmsDatabase,
  cmsUnavailable,
  getContentDocument,
  getCurrentDraftId,
  getLatestRevisionNumber,
  getRevisionById,
  toD1Like,
  toPreparedStatements,
} from "~/lib/dashboard/cms-db";
import { readDashboardBindings } from "~/lib/dashboard/env";
import {
  authorizeDashboardMutation,
  dashboardError,
  dashboardOk,
} from "~/lib/dashboard/http";

const route: APIRoute = async ({ request }) => {
  if (request.method !== "POST") {
    return dashboardError(405, "METHOD_NOT_ALLOWED", "Draft saves use POST");
  }
  const bindings = readDashboardBindings(env);
  const authError = await authorizeDashboardMutation(
    request,
    bindings.staticUploadToken,
  );
  if (authError) return authError;

  const db = toD1Like(bindings.cms);
  if (!db) return cmsUnavailable();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return dashboardError(400, "INVALID_JSON", "The request body must be JSON");
  }
  if (!isRecord(body)) {
    return dashboardError(400, "INVALID_DRAFT", "The draft payload is invalid");
  }
  const expectedRevisionId = body.expectedRevisionId;
  if (
    typeof expectedRevisionId !== "string" ||
    expectedRevisionId.length === 0
  ) {
    return dashboardError(
      400,
      "INVALID_EXPECTED_REVISION",
      "An expectedRevisionId is required",
    );
  }
  const content = validateRevisionContent(body);
  if (content.error || !content.content) {
    return dashboardError(
      400,
      "INVALID_DRAFT",
      content.error ?? "The draft is invalid",
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
    const baseline = resolveSaveDraftBaseline({
      currentDraftId,
      expectedRevisionId,
    });
    if (baseline === "stale") {
      return dashboardError(
        409,
        "STALE_DRAFT",
        "This draft was edited from an older revision",
      );
    }

    const revisionId = generateCmsId();
    const revisionNumber = nextRevisionNumber(
      await getLatestRevisionNumber(db, document.id),
    );
    const statements = saveDraftStatements({
      actor: "operator",
      content: content.content,
      createdAt: new Date().toISOString(),
      currentDraftId,
      documentId: document.id,
      payloadHash: await contentDigest(content.content),
      revisionId,
      revisionNumber,
    });
    await db.batch(toPreparedStatements(db, statements));
    const saved = await getRevisionById(db, revisionId);
    if (!saved) {
      return dashboardError(
        500,
        "DRAFT_SAVE_FAILED",
        "The draft could not be loaded",
      );
    }
    return dashboardOk(saved, undefined, { "Cache-Control": "no-store" });
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
