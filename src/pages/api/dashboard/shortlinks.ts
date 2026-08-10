import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

import {
  AnalyticsEngineError,
  parseAnalyticsEngineResponse,
  shortlinkClicksQuery,
  validateDashboardRange,
} from "~/lib/dashboard/analytics-engine";
import { readDashboardBindings } from "~/lib/dashboard/env";
import { dashboardError, dashboardOk } from "~/lib/dashboard/http";
import {
  attachRecentClicks,
  listShortlinkRecords,
} from "~/lib/dashboard/records";

const route: APIRoute = async ({ request }) => {
  if (request.method !== "GET") {
    return dashboardError(405, "METHOD_NOT_ALLOWED", "Shortlinks use GET");
  }
  const bindings = readDashboardBindings(env);
  if (!bindings.staticFiles) {
    return dashboardError(
      503,
      "STATIC_STORAGE_UNAVAILABLE",
      "Static storage is not available",
    );
  }

  const records = await listShortlinkRecords(bindings.staticFiles);
  if (!bindings.accountId || !bindings.analyticsToken) {
    return dashboardOk(records);
  }

  const range = validateDashboardRange(null, null);
  if (range.error || !range.range) {
    return dashboardError(
      500,
      "INTERNAL_ERROR",
      "The analytics range is invalid",
    );
  }
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(
        bindings.accountId,
      )}/analytics_engine/sql`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bindings.analyticsToken}`,
          "Content-Type": "text/plain;charset=UTF-8",
        },
        body: shortlinkClicksQuery(range.range),
      },
    );
    if (!response.ok) throw new AnalyticsEngineError();
    const report = parseAnalyticsEngineResponse(await response.json());
    return dashboardOk(attachRecentClicks(records, report.data));
  } catch {
    return dashboardOk(records);
  }
};

export const GET = route;
export const ALL = route;
