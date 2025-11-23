import react from "@vitejs/plugin-react";
import { getViteConfig } from "astro/config";

export default getViteConfig({
  plugins: [react()],
  test: {
    coverage: {
      exclude: [
        "node_modules/**",
        "dist/**",
        ".astro/**",
        "test/**",
        "**/*.config.*",
        "**/*.d.ts",
      ],
      provider: "v8",
      reporter: ["text", "json", "html"],
    },
    environment: "happy-dom",
    exclude: ["node_modules", "dist", ".astro"],
    globals: true,
    include: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
    setupFiles: "./test/setup.ts",
  },
});
