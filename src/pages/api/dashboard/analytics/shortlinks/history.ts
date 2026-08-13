import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

import {
  runAnalyticsReport,
  shortlinkHistoryQuery,
} from "~/lib/dashboard/analytics-engine";
import { readDashboardBindings } from "~/lib/dashboard/env";
import { dashboardError } from "~/lib/dashboard/http";
import { requireOperator } from "~/lib/require-operator";

const route: APIRoute = async ({ request }) => {
  if (request.method !== "GET") {
    return dashboardError(
      405,
      "METHOD_NOT_ALLOWED",
      "Analytics reports use GET",
    );
  }
  const operator = await requireOperator(request, "analytics:read");
  if (operator instanceof Response) return operator;
  const url = new URL(request.url);
  const bindings = readDashboardBindings(env);
  return runAnalyticsReport({
    accountId: bindings.accountId,
    buildQuery: shortlinkHistoryQuery,
    end: url.searchParams.get("end"),
    legacy: true,
    start: url.searchParams.get("start"),
    token: bindings.analyticsToken,
  });
};

export const GET = route;
export const ALL = route;
