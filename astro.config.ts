import { defineConfig } from "astro/config";

import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare({
    imageService: "cloudflare",
  }),
  output: "server",
  vite: {
    plugins: [tailwindcss()],
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
});
