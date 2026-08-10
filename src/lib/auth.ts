import { env } from "cloudflare:workers";
import { betterAuth } from "better-auth";
import { organization } from "better-auth/plugins";

import { ac, adminRole, memberRole, ownerRole } from "./auth-roles";

export const auth = betterAuth({
  baseURL: "https://www.yusoofsh.id",
  database: env.CMS,
  emailAndPassword: {
    disableSignUp: true,
    enabled: true,
    minPasswordLength: 12,
  },
  secret: env.BETTER_AUTH_SECRET,
  trustedOrigins: [
    "https://dev-leenk.yusoofsh.workers.dev",
    "https://www.yusoofsh.id",
  ],
  plugins: [
    organization({
      ac,
      allowUserToCreateOrganization: false,
      async sendInvitationEmail() {
        // No email delivery for invitations in the first release; the
        // operator seeds members through the dashboard instead.
      },
      roles: {
        admin: adminRole,
        member: memberRole,
        owner: ownerRole,
      },
    }),
  ],
});

export { ac };
