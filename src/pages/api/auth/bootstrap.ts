import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

import { OWNER_EMAIL } from "~/lib/auth-roles";
import { auth } from "~/lib/auth";
import { tokensMatch } from "~/lib/http";

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
    const signedUp = await auth.api.signUpEmail({
      body: {
        email: OWNER_EMAIL,
        name: "Yusoof Moh",
        password: body.password,
      },
    });
    const organization = await auth.api.createOrganization({
      body: {
        name: "Leenk",
        slug: "leenk",
        userId: signedUp.user.id,
      },
    });
    return Response.json(
      { ok: true, organizationId: organization.id },
      { status: 201 },
    );
  } catch {
    return Response.json(
      { error: "bootstrap_failed", message: "Bootstrap failed" },
      { status: 409 },
    );
  }
};

export const POST = route;
export const ALL = route;
