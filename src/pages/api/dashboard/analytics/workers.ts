import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

import { runGraphqlWorkersReport } from "~/lib/dashboard/analytics-graphql";
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
  return runGraphqlWorkersReport({
    accountId: bindings.accountId,
    end: url.searchParams.get("end"),
    start: url.searchParams.get("start"),
    token: bindings.analyticsToken,
  });
};

export const GET = route;
export const ALL = route;
