import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

import {
  bootstrapCmsDatabase,
  cmsUnavailable,
  getContentDocument,
  getRevisionById,
  listRevisionSummaries,
  toD1Like,
} from "~/lib/dashboard/cms-db";
import { readDashboardBindings } from "~/lib/dashboard/env";
import { dashboardError, dashboardOk } from "~/lib/dashboard/http";

const route: APIRoute = async ({ request }) => {
  if (request.method !== "GET") {
    return dashboardError(405, "METHOD_NOT_ALLOWED", "CMS overview uses GET");
  }
  const bindings = readDashboardBindings(env);
  const db = toD1Like(bindings.cms);
  if (!db) return cmsUnavailable();

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
    const revisions = await listRevisionSummaries(db, document.id);
    const published =
      document.published_revision_id === null
        ? null
        : await getRevisionById(db, document.published_revision_id);
    return dashboardOk({
      document: {
        id: document.id,
        key: document.key,
        publishedRevisionId: document.published_revision_id,
      },
      published,
      revisions,
    });
  } catch {
    return dashboardError(
      500,
      "CMS_UNAVAILABLE",
      "The CMS store is unavailable",
    );
  }
};

export const GET = route;
export const ALL = route;
