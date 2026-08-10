import { env } from "cloudflare:workers";
import { defineMiddleware } from "astro/middleware";

const DASHBOARD_PREFIXES = ["/api/dashboard", "/dashboard"];

async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(a)),
    crypto.subtle.digest("SHA-256", new TextEncoder().encode(b)),
  ]);
  const x = new Uint8Array(left);
  const y = new Uint8Array(right);
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let index = 0; index < x.length; index += 1) {
    diff |= (x[index] ?? 0) ^ (y[index] ?? 0);
  }
  return diff === 0;
}

// Owner-only boundary for the dashboard and its API. Replaces Cloudflare
// Access for these paths with HTTP Basic authentication against the bound
// `STATIC_UPLOAD_TOKEN` secret, so the operator needs no email code or
// identity provider. The username is ignored; the token is the password.
export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const isDashboardPath = DASHBOARD_PREFIXES.some(
    (prefix) =>
      url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
  );
  if (!isDashboardPath) return next();

  const expected = env.STATIC_UPLOAD_TOKEN;
  if (!expected) {
    return new Response("Dashboard authentication is not configured", {
      status: 503,
      headers: { "Cache-Control": "no-store" },
    });
  }

  const authorization = context.request.headers.get("authorization") ?? "";
  const [scheme, credentials] = authorization.split(" ");
  let authorized = false;
  if (scheme?.toLowerCase() === "basic" && credentials) {
    try {
      const decoded = atob(credentials);
      const password = decoded.slice(decoded.indexOf(":") + 1);
      authorized = await constantTimeEqual(password, expected);
    } catch {
      authorized = false;
    }
  }

  if (!authorized) {
    return new Response("Authentication required", {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
        "WWW-Authenticate": 'Basic realm="Leenk dashboard", charset="UTF-8"',
      },
    });
  }

  return next();
});
