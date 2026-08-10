import { defineMiddleware } from "astro/middleware";

import { auth } from "~/lib/auth";
import { isProtectedPath, LOGIN_PATH } from "~/lib/auth-guard";

// Owner-only boundary for the dashboard and its API, enforced with
// better-auth sessions and organization membership. The public site,
// shortlink resolution, upload API, and auth endpoints stay open.
export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  if (!isProtectedPath(url.pathname)) return next();

  const session = await auth.api.getSession({
    headers: context.request.headers,
  });
  context.locals.user = session?.user ?? null;
  context.locals.session = session?.session ?? null;
  if (!session) {
    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        { error: "unauthorized", message: "Sign in to continue" },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        },
      );
    }
    const nextPath = encodeURIComponent(url.pathname + url.search);
    return Response.redirect(`${LOGIN_PATH}?next=${nextPath}`, 302);
  }

  const member = await auth.api.getActiveMember({
    headers: context.request.headers,
  });
  context.locals.member = member ?? null;
  if (!member) {
    return Response.json(
      { error: "forbidden", message: "No organization membership" },
      {
        status: 403,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
  return next();
});
