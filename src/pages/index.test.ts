import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./index.astro", import.meta.url), "utf8");

describe("home page switch section", () => {
  it("renders only the biography switch", () => {
    expect(source).toContain("<ModeToggle client:load />");
    expect(source).not.toContain("ThemeToggle");
    expect(source.match(/client:load/g)).toHaveLength(1);
  });
});
