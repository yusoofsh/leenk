import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { hashPassword } from "better-auth/crypto";

import { OWNER_EMAIL } from "~/lib/auth-roles";
import { tokensMatch } from "~/lib/http";

function generateId(): string {
  return globalThis.crypto.randomUUID();
}

const route: APIRoute = async ({ request }) => {
  if (request.method !== "POST") {
    return Response.json({ error: "method_not_allowed" }, { status: 405 });
  }

  const expected = env.STATIC_UPLOAD_TOKEN;
  const provided = request.headers.get("x-upload-token") ?? "";
  if (!expected || !(await tokensMatch(provided, expected))) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const raw: unknown = await request.json();
    if (
      typeof raw !== "object" ||
      raw === null ||
      !("email" in raw) ||
      !("password" in raw)
    ) {
      return Response.json(
        { error: "invalid_body", message: "Email and password are required" },
        { status: 400 },
      );
    }
    const body = raw as Record<string, unknown>;
    if (body.email !== OWNER_EMAIL) {
      return Response.json(
        { error: "forbidden", message: "Only the owner email can bootstrap" },
        { status: 403 },
      );
    }
    if (typeof body.password !== "string" || body.password.length < 12) {
      return Response.json(
        {
          error: "invalid_password",
          message: "Password must be at least 12 characters",
        },
        { status: 400 },
      );
    }
    const cms = env.CMS;
    if (!cms) {
      return Response.json({ error: "cms_unavailable" }, { status: 503 });
    }
    const now = new Date().toISOString();
    const userId = generateId();
    const organizationId = generateId();
    const memberId = generateId();
    const passwordHash = await hashPassword(body.password);
    await cms.batch([
      cms
        .prepare(
          `INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt)
VALUES (?, ?, ?, 0, ?, ?)`,
        )
        .bind(userId, "Yusoof Moh", OWNER_EMAIL, now, now),
      cms
        .prepare(
          `INSERT INTO "account" (
  id, accountId, providerId, issuer, userId, password, createdAt, updatedAt
) VALUES (?, ?, 'credential', 'local:credential', ?, ?, ?, ?)`,
        )
        .bind(generateId(), userId, userId, passwordHash, now, now),
      cms
        .prepare(
          `INSERT INTO "organization" (id, name, slug, createdAt, updatedAt)
VALUES (?, 'Leenk', 'leenk', ?, ?)`,
        )
        .bind(organizationId, now, now),
      cms
        .prepare(
          `INSERT INTO "member" (id, organizationId, userId, role, createdAt, updatedAt)
VALUES (?, ?, ?, 'owner', ?, ?)`,
        )
        .bind(memberId, organizationId, userId, now, now),
    ]);
    return Response.json({ ok: true, organizationId }, { status: 201 });
  } catch {
    return Response.json(
      { error: "bootstrap_failed", message: "Bootstrap failed" },
      { status: 409 },
    );
  }
};

export const POST = route;
export const ALL = route;
