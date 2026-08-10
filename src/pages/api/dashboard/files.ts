import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

import { readDashboardBindings } from "~/lib/dashboard/env";
import { dashboardError, dashboardOk } from "~/lib/dashboard/http";
import { listStaticFiles } from "~/lib/dashboard/records";

const route: APIRoute = async ({ request }) => {
  if (request.method !== "GET") {
    return dashboardError(405, "METHOD_NOT_ALLOWED", "Files use GET");
  }
  const bindings = readDashboardBindings(env);
  if (!bindings.staticFiles) {
    return dashboardError(
      503,
      "STATIC_STORAGE_UNAVAILABLE",
      "Static storage is not available",
    );
  }
  const files = await listStaticFiles(bindings.staticFiles);
  return dashboardOk(files);
};

export const GET = route;
export const ALL = route;
