import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

import { createR2ShortlinkStorage } from "~/lib/shortlink-storage";
import { getShortlinkAnalytics } from "~/lib/shortlink-runtime";
import { handleShortlinkRequest } from "~/lib/shortlinks";
import { getSiteAnalytics } from "~/lib/site-analytics";

function uploadToken(): string | undefined {
  const value: unknown = Reflect.get(env, "STATIC_UPLOAD_TOKEN");
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

const route: APIRoute = ({ params, request }) => {
  return handleShortlinkRequest(
    request,
    params.code,
    createR2ShortlinkStorage(env.STATIC_FILES),
    uploadToken(),
    undefined,
    undefined,
    getShortlinkAnalytics(Reflect.get(env, "SHORTLINK_ANALYTICS")),
    getSiteAnalytics(Reflect.get(env, "SITE_ANALYTICS")),
  );
};

export const DELETE = route;
export const ALL = route;
