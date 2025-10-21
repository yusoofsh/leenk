import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import path from "path";

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare({
    imageService: "cloudflare",
    sessionKVBindingName: "leenk",
  }),
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
