import { ROLE_CAPABILITIES } from "./auth-roles";

export const DASHBOARD_PAGE_PATH = "/dashboard";
export const PROTECTED_PREFIXES = ["/api/dashboard"];

export const LOGIN_PATH = "/login";

export type DashboardCapability =
  | "analytics:read"
  | "content:manage"
  | "content:read"
  | "files:manage"
  | "files:read"
  | "operations:read"
  | "settings:manage"
  | "shortlinks:manage"
  | "shortlinks:read";

const ROLE_CAPABILITY_MATRIX: Record<
  string,
  Record<string, readonly string[]>
> = ROLE_CAPABILITIES;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function memberHasCapability(
  role: string,
  capability: DashboardCapability,
): boolean {
  const [resource, action] = capability.split(":", 2);
  if (
    resource !== "analytics" &&
    resource !== "content" &&
    resource !== "files" &&
    resource !== "operations" &&
    resource !== "settings" &&
    resource !== "shortlinks"
  ) {
    return false;
  }
  return (ROLE_CAPABILITY_MATRIX[role]?.[resource] ?? []).includes(
    action ?? "",
  );
}

export function memberCanRead(
  resource: "analytics" | "content" | "files" | "operations" | "shortlinks",
  role: string,
): boolean {
  return memberHasCapability(role, `${resource}:read`);
}

export function memberCanManage(
  resource: "content" | "files" | "settings" | "shortlinks",
  role: string,
): boolean {
  return memberHasCapability(role, `${resource}:manage`);
}
