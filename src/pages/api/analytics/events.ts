import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

import { apiError } from "~/lib/http";
import {
  getSiteAnalytics,
  MAX_SITE_ANALYTICS_REQUEST_BYTES,
  parseSiteAnalyticsPayload,
  recordSiteAnalyticsEvent,
} from "~/lib/site-analytics";

const route: APIRoute = async ({ request }) => {
  if (request.method !== "POST") {
    return apiError(
      405,
      "METHOD_NOT_ALLOWED",
      "Site analytics events require POST",
      { Allow: "POST" },
    );
  }

  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return apiError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Site analytics events require application/json",
    );
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_SITE_ANALYTICS_REQUEST_BYTES
  ) {
    return apiError(
      413,
      "REQUEST_TOO_LARGE",
      "Site analytics event is too large",
    );
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return apiError(400, "INVALID_EVENT", "Site analytics event is invalid");
  }
  if (
    new TextEncoder().encode(body).byteLength > MAX_SITE_ANALYTICS_REQUEST_BYTES
  ) {
    return apiError(
      413,
      "REQUEST_TOO_LARGE",
      "Site analytics event is too large",
    );
  }

  let input: unknown;
  try {
    input = JSON.parse(body);
  } catch {
    return apiError(400, "INVALID_EVENT", "Site analytics event is invalid");
  }

  const event = parseSiteAnalyticsPayload(input);
  if (!event) {
    return apiError(
      400,
      "INVALID_EVENT",
      "Site analytics event is not supported",
    );
  }

  const analytics = getSiteAnalytics(Reflect.get(env, "SITE_ANALYTICS"));
  if (analytics) recordSiteAnalyticsEvent(request, event, analytics);

  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
};

export const POST = route;
export const ALL = route;
