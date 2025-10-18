import cloudflare from "@astrojs/cloudflare";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  adapter: cloudflare({
    imageService: "cloudflare",
  }),
  output: "server",
  vite: {
    build: {
      minify: false,
    },
    plugins: [tailwindcss()],
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
