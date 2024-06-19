import cloudflare from "@astrojs/cloudflare";
import partytown from "@astrojs/partytown";
import tailwind from "@astrojs/tailwind";
import {
  type AstroUserConfig as Config,
  passthroughImageService,
} from "astro/config";

// https://astro.build/config
export default {
  adapter: cloudflare(),
  image: { service: passthroughImageService() },
  integrations: [
    tailwind(),
    partytown({
      config: {
        forward: ["dataLayer.push"],
      },
    }),
  ],
  output: "server",
  vite: {
    resolve: {
      alias: {
        crypto: "node:crypto",
        fs: "node:fs",
        os: "node:os",
        path: "node:path",
      },
    },
    ssr: {
      external: [
        "node:buffer",
        "node:path",
        "node:fs",
        "node:os",
        "node:crypto",
      ],
    },
  },
} satisfies Config;
