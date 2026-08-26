import react from "@astrojs/react";
import { distilledCloudflare } from "@distilled.cloud/astro/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import path from "path";

// Local development, build, and CI configuration. `astro dev` and
// `astro build` cannot produce server-rendered output (or resolve the
// `cloudflare:workers` runtime module the routes import) without an adapter,
// so this config adds the same `@distilled.cloud/astro` Cloudflare
// integration the Alchemy stack injects at deploy time. The canonical
// `astro.config.ts` stays adapter-free so Alchemy can inject its own adapter
// without a conflict. Keep this file in sync with `astro.config.ts` apart
// from the adapter integration.
export default defineConfig({
  integrations: [
    react(),
    distilledCloudflare({
      vite: {
        // Newest date supported by the vendored workerd binary in
        // @distilled.cloud/cloudflare-runtime 0.17.1. The Alchemy stack
        // declares the production compatibility date separately.
        compatibilityDate: "2026-07-11",
        compatibilityFlags: ["nodejs_compat"],
      },
    }),
  ],
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
