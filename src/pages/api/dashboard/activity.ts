import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

import {
  bootstrapCmsDatabase,
  cmsUnavailable,
  listActivityEntries,
  toD1Like,
} from "~/lib/dashboard/cms-db";
import { readDashboardBindings } from "~/lib/dashboard/env";
import { dashboardError, dashboardOk } from "~/lib/dashboard/http";

const route: APIRoute = async ({ request }) => {
  if (request.method !== "GET") {
    return dashboardError(405, "METHOD_NOT_ALLOWED", "Activity uses GET");
  }
  const bindings = readDashboardBindings(env);
  const db = toD1Like(bindings.cms);
  if (!db) return cmsUnavailable();

  const url = new URL(request.url);
  const cursorId = url.searchParams.get("cursor");
  if (cursorId !== null && cursorId.length === 0) {
    return dashboardError(
      400,
      "INVALID_CURSOR",
      "The activity cursor is invalid",
    );
  }
  const rawLimit = url.searchParams.get("limit");
  const limit = rawLimit === null ? 50 : Number(rawLimit);
  if (!Number.isSafeInteger(limit) || limit <= 0 || limit > 50) {
    return dashboardError(
      400,
      "INVALID_LIMIT",
      "The activity page size is invalid",
    );
  }

  try {
    await bootstrapCmsDatabase(db);
    const { entries, nextCursor } = await listActivityEntries(
      db,
      limit,
      cursorId,
    );
    return dashboardOk({
      entries,
      nextCursor,
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
