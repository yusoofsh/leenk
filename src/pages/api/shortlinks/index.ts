import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

import { createR2ShortlinkStorage } from "~/lib/shortlink-storage";
import { handleShortlinkRequest } from "~/lib/shortlinks";
import { getSiteAnalytics } from "~/lib/site-analytics";

function uploadToken(): string | undefined {
  const value: unknown = Reflect.get(env, "STATIC_UPLOAD_TOKEN");
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

const route: APIRoute = ({ request }) => {
  return handleShortlinkRequest(
    request,
    undefined,
    createR2ShortlinkStorage(env.STATIC_FILES),
    uploadToken(),
    {
      async exists(path) {
        return (await env.STATIC_FILES.head(path)) !== null;
      },
      async get(path) {
        const object = await env.STATIC_FILES.head(path);
        if (!object) return null;
        const expiresAtValue = object.customMetadata?.expiresAt;
        if (!expiresAtValue) return {};
        const expiresAt = new Date(expiresAtValue);
        if (!Number.isFinite(expiresAt.getTime())) {
          throw new Error("Static target has invalid expiration metadata");
        }
        return { expiresAt };
      },
    },
    undefined,
    getSiteAnalytics(Reflect.get(env, "SITE_ANALYTICS")),
  );
};

export const POST = route;
export const ALL = route;
