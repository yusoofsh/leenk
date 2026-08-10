import { createAccessControl } from "better-auth/plugins/access";

// Operator capabilities, mirroring the dashboard modules. `read` opens a
// module, `manage` allows its mutations. This module is intentionally free
// of worker imports so guards and tests can use it anywhere.
const statements = {
  analytics: ["read"],
  content: ["manage", "read"],
  files: ["manage", "read"],
  operations: ["read"],
  settings: ["manage"],
  shortlinks: ["manage", "read"],
} as const;

const ac = createAccessControl(statements);

// Single source of truth for role capabilities; the better-auth roles and
// the dashboard guards both derive from this matrix.
export const ROLE_CAPABILITIES = {
  admin: {
    analytics: ["read"],
    content: ["manage", "read"],
    files: ["manage", "read"],
    operations: ["read"],
    settings: ["manage"],
    shortlinks: ["manage", "read"],
  },
  member: {
    analytics: ["read"],
    content: ["read"],
    files: ["read"],
    operations: ["read"],
    shortlinks: ["read"],
  },
  owner: {
    analytics: ["read"],
    content: ["manage", "read"],
    files: ["manage", "read"],
    operations: ["read"],
    settings: ["manage"],
    shortlinks: ["manage", "read"],
  },
} as const;

export const memberRole = ac.newRole(ROLE_CAPABILITIES.member);
export const adminRole = ac.newRole(ROLE_CAPABILITIES.admin);
export const ownerRole = ac.newRole(ROLE_CAPABILITIES.owner);

export const OWNER_EMAIL = "me@yusoofsh.id";

export { ac };
