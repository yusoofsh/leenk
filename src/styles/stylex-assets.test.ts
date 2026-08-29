import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const layoutSource = readFileSync(
  new URL("../layouts/index.astro", import.meta.url),
  "utf8",
);
const loginSource = readFileSync(
  new URL("../pages/login.astro", import.meta.url),
  "utf8",
);
const dashboardSource = readFileSync(
  new URL("../pages/dashboard.astro", import.meta.url),
  "utf8",
);
const stylexAssetsSource = readFileSync(
  new URL("../components/stylex-assets.astro", import.meta.url),
  "utf8",
);
const globalStyles = readFileSync(
  new URL("./global.css", import.meta.url),
  "utf8",
);
const astroConfig = readFileSync(
  new URL("../../astro.config.ts", import.meta.url),
  "utf8",
);

describe("StyleX CSS shells", () => {
  it("links the StyleX virtual stylesheet on every HTML shell in development", () => {
    expect(stylexAssetsSource).toContain('href="/virtual:stylex.css"');
    expect(layoutSource).toContain("<StylexAssets />");
    expect(loginSource).toContain("<StylexAssets />");
    expect(dashboardSource).toContain("<StylexAssets />");
  });

  it("appends extracted StyleX to the global CSS asset every shell already loads", () => {
    expect(globalStyles).toContain('@import "./stylex.css"');
    expect(astroConfig).toContain('fileName.includes("jsx-runtime")');
    expect(astroConfig).toContain('fileName.includes("stylex")');
  });
});
