import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const layoutSource = readFileSync(
  new URL("../layouts/index.astro", import.meta.url),
  "utf8",
);
const loginSource = readFileSync(
  new URL("./login.astro", import.meta.url),
  "utf8",
);
const dashboardSource = readFileSync(
  new URL("./dashboard.astro", import.meta.url),
  "utf8",
);
const stylexAssetsSource = readFileSync(
  new URL("../components/stylex-assets.astro", import.meta.url),
  "utf8",
);
const astroConfig = readFileSync(
  new URL("../../astro.config.ts", import.meta.url),
  "utf8",
);

describe("StyleX CSS shells", () => {
  it("loads extracted StyleX from every HTML shell", () => {
    expect(stylexAssetsSource).toContain('import "../styles/stylex.css"');
    expect(stylexAssetsSource).toContain('href="/virtual:stylex.css"');
    expect(layoutSource).toContain("<StylexAssets />");
    expect(loginSource).toContain("<StylexAssets />");
    expect(dashboardSource).toContain("<StylexAssets />");
  });

  it("appends extracted StyleX to the shared stylex.css asset", () => {
    expect(astroConfig).toContain(
      'cssInjectionTarget: (fileName) => fileName.includes("stylex")',
    );
  });
});
