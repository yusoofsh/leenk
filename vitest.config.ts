import stylexVite from "@stylexjs/unplugin/vite";
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import path from "node:path";

export default defineConfig({
  plugins: [
    stylexVite({
      aliases: {
        "~/*": [path.resolve("./src/*")],
      },
      cssInjectionTarget: (fileName) =>
        fileName.includes("jsx-runtime") || fileName.includes("stylex"),
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
      "~": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    include: ["{cli,src}/**/*.test.{ts,tsx}"],
  },
});
