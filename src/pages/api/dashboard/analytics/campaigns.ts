import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

import {
  runAnalyticsReport,
  shortlinkCampaignQuery,
} from "~/lib/dashboard/analytics-engine";
import { readDashboardBindings } from "~/lib/dashboard/env";
import { dashboardError } from "~/lib/dashboard/http";

const route: APIRoute = async ({ request }) => {
  if (request.method !== "GET") {
    return dashboardError(
      405,
      "METHOD_NOT_ALLOWED",
      "Analytics reports use GET",
    );
  }
  const url = new URL(request.url);
  const bindings = readDashboardBindings(env);
  return runAnalyticsReport({
    accountId: bindings.accountId,
    buildQuery: shortlinkCampaignQuery,
    end: url.searchParams.get("end"),
    start: url.searchParams.get("start"),
    token: bindings.analyticsToken,
  });
};

export const GET = route;
export const ALL = route;
