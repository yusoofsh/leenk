import type { AstroUserConfig } from "astro";

import cloudflare from "@astrojs/cloudflare";
import tailwind from "@astrojs/tailwind";
import { passthroughImageService } from "astro/config";

// https://astro.build/config
export default {
  adapter: cloudflare(),
  image: { service: passthroughImageService() },
  integrations: [tailwind()],
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
} satisfies AstroUserConfig;
