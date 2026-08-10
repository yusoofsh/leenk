import { auth } from "./auth";
import { memberHasCapability, type DashboardCapability } from "./auth-guard";

export async function sessionAllows(
  request: Request,
  capability: DashboardCapability,
): Promise<boolean> {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session) return false;
    const member = await auth.api.getActiveMember({
      headers: request.headers,
    });
    return member !== null && memberHasCapability(member.role, capability);
  } catch {
    return false;
  }
}
