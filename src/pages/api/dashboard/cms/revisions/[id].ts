import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

import {
  bootstrapCmsDatabase,
  cmsUnavailable,
  getRevisionById,
  toD1Like,
} from "~/lib/dashboard/cms-db";
import { readDashboardBindings } from "~/lib/dashboard/env";
import { dashboardError, dashboardOk } from "~/lib/dashboard/http";
import { requireOperator } from "~/lib/require-operator";

const route: APIRoute = async ({ params, request }) => {
  if (request.method !== "GET") {
    return dashboardError(
      405,
      "METHOD_NOT_ALLOWED",
      "Revision lookup uses GET",
    );
  }
  const operator = await requireOperator(request, "content:read");
  if (operator instanceof Response) return operator;

  const id = params.id;
  if (!id || id.length === 0 || id.length > 128) {
    return dashboardError(
      400,
      "INVALID_REVISION_ID",
      "The revision id is invalid",
    );
  }
  const bindings = readDashboardBindings(env);
  const db = toD1Like(bindings.cms);
  if (!db) return cmsUnavailable();

  try {
    await bootstrapCmsDatabase(db);
    const revision = await getRevisionById(db, id);
    if (!revision) {
      return dashboardError(
        404,
        "REVISION_NOT_FOUND",
        "The revision was not found",
      );
    }
    return dashboardOk(revision);
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
