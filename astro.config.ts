import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import path from "path";

// Canonical Astro configuration. The Alchemy `Cloudflare.Website.Astro`
// stack loads this file natively and injects the Cloudflare adapter itself;
// a user-declared adapter is rejected. Local builds and CI use
// `astro.config.local.ts`, which adds the same adapter integration from
// `@distilled.cloud/astro`, so the repository never needs Wrangler.
export default defineConfig({
  integrations: [react()],
  output: "server",
  site: "https://www.yusoofsh.id/",
  vite: {
    build: {
      minify: true,
      rollupOptions: {
        external: [
          "node:fs/promises",
          "node:path",
          "node:url",
          "node:crypto",
          "node:buffer",
          "node:fs",
          "node:os",
        ],
      },
    },
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "~": path.resolve("./src"),
      },
    },
  },
});
