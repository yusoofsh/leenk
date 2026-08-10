import { env } from "cloudflare:workers";
import type { Member } from "better-auth/plugins";

import { auth } from "./auth";
import { memberHasCapability, type DashboardCapability } from "./auth-guard";

export type OperatorContext = {
  member: NonNullable<Awaited<ReturnType<typeof getMember>>>;
  session: NonNullable<Awaited<ReturnType<typeof getSession>>>;
};

async function getSession(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

async function getMember(request: Request) {
  try {
    const member = await auth.api.getActiveMember({
      headers: request.headers,
    });
    if (member) return member;
  } catch {
    // Fall through to the direct membership lookup below. The org plugin
    // throws "No active organization" when the session has no active
    // organization id, which happens before the operator ever calls
    // setActiveOrganization.
  }
  const session = await getSession(request);
  if (!session) return null;
  const cms = env.CMS;
  if (!cms) return null;
  const row = await cms
    .prepare(
      `SELECT id, organizationId, userId, role, createdAt, updatedAt
FROM member
WHERE userId = ?
ORDER BY createdAt ASC
LIMIT 1`,
    )
    .bind(session.user.id)
    .first<Member>();
  return row ?? null;
}

function operatorResponse(status: number, error: string, message: string) {
  return Response.json(
    { error, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function requireOperator(
  request: Request,
  capability: DashboardCapability,
): Promise<OperatorContext | Response> {
  try {
    const session = await getSession(request);
    if (!session) {
      return operatorResponse(401, "unauthorized", "Sign in to continue");
    }
    const member = await getMember(request);
    if (!member) {
      return operatorResponse(403, "forbidden", "No organization membership");
    }
    if (!memberHasCapability(member.role, capability)) {
      return operatorResponse(403, "forbidden", "Insufficient permissions");
    }
    return { member, session };
  } catch (error) {
    return operatorResponse(
      500,
      "auth_unavailable",
      error instanceof Error ? error.message : String(error),
    );
  }
}
