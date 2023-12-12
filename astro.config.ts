import cloudflare from "@astrojs/cloudflare";
import tailwind from "@astrojs/tailwind";
import {
  type AstroUserConfig as Config,
  passthroughImageService,
} from "astro/config";

// https://astro.build/config
export default {
  adapter: cloudflare({ mode: "directory" }),
  image: { service: passthroughImageService() },
  integrations: [tailwind()],
  output: "server",
} satisfies Config;
