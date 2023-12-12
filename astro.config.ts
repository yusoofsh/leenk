import { type AstroUserConfig as Config } from "astro/config";
import tailwind from "@astrojs/tailwind";
import cloudflare from "@astrojs/cloudflare";

// https://astro.build/config
export default {
  output: "server",
  adapter: cloudflare(),
  integrations: [tailwind()],
} satisfies Config;
