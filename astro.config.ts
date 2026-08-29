import react from "@astrojs/react";
import { distilledCloudflare } from "@distilled.cloud/astro/cloudflare";
import stylexVite from "@stylexjs/unplugin/vite";
import { defineConfig } from "astro/config";
import path from "path";
import process from "node:process";

// Single Astro configuration for local dev, local build/CI, and Alchemy
// deploy. The Alchemy `Cloudflare.Website.Astro` stack loads this file
// natively and injects the Cloudflare adapter itself; a user-declared adapter
// is rejected, so the deploy path must see an adapter-free config. Local
// `astro dev` and `astro build` get no such injection, yet the routes import
// `cloudflare:workers` and need the adapter to resolve it and expose bindings.
// `bun run dev` and `bun run build` therefore set `LEENK_LOCAL_ADAPTER=1` to
// add `distilledCloudflare()` locally, while `alchemy deploy`/`alchemy plan`
// leave it unset and keep the same file adapter-free.
const useLocalCloudflareAdapter = process.env.LEENK_LOCAL_ADAPTER === "1";

export default defineConfig({
  integrations: [
    react(),
    ...(useLocalCloudflareAdapter
      ? [
          distilledCloudflare({
            vite: {
              // Newest date supported by the vendored workerd binary in
              // @distilled.cloud/cloudflare-runtime 0.17.1. The Alchemy stack
              // declares the production compatibility date separately.
              compatibilityDate: "2026-07-11",
              compatibilityFlags: ["nodejs_compat"],
            },
          }),
        ]
      : []),
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
    plugins: [
      stylexVite({
        aliases: {
          "~/*": [path.resolve("./src/*")],
        },
        treeshakeCompensation: true,
        unstable_moduleResolution: {
          rootDir: process.cwd(),
          type: "commonJS",
        },
        useCSSLayers: true,
      }),
    ],
    resolve: {
      alias: {
        "~": path.resolve("./src"),
      },
    },
  },
});
