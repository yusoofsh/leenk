import type { AstroUserConfig } from "astro";

import cloudflare from "@astrojs/cloudflare";
import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default {
  adapter: cloudflare({
    imageService: "cloudflare",
  }),
  integrations: [tailwind()],
  output: "server",
  vite: {
    build: {
      minify: false,
    },
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
