import type { APIRoute } from "astro";

import { auth } from "~/lib/auth";

export const ALL: APIRoute = (context) => {
  return auth.handler(context.request);
};
