import type { APIRoute } from "astro";

import { siteConfig } from "~/config/site";

export const GET: APIRoute = ({ redirect }) => {
  return redirect(siteConfig.social.twitter, 308);
};
