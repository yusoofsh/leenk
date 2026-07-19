import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./index.astro", import.meta.url), "utf8");
const globalStyles = readFileSync(
  new URL("../styles/global.css", import.meta.url),
  "utf8",
);
const layoutSource = readFileSync(
  new URL("../layouts/index.astro", import.meta.url),
  "utf8",
);
const fullBioUrl = new URL("../content/bio/full.md", import.meta.url);
const tldrBioUrl = new URL("../content/bio/tldr.md", import.meta.url);

describe("home page switch section", () => {
  it("renders only the biography switch", () => {
    expect(source).toContain("<ModeToggle client:load />");
    expect(source).not.toContain("ThemeToggle");
    expect(source.match(/client:load/g)).toHaveLength(1);
  });

  it("renders both biography modes as Typeset HTML", () => {
    expect(source).not.toContain(".md");
    expect(existsSync(fileURLToPath(fullBioUrl))).toBe(false);
    expect(existsSync(fileURLToPath(tldrBioUrl))).toBe(false);
    expect(source.match(/typeset typeset-portfolio/g)).toHaveLength(2);
    expect(globalStyles).toContain('@import "./typeset.css"');
  });

  it("keeps the compact switch close to the title and biography", () => {
    expect(source).toContain("text-foreground");
    expect(source).toContain("text-[0.9375rem]");
    expect(source).toContain('class="flex flex-wrap');
    expect(source).toContain("mb-8 text-left");
    expect(source).toContain("font-bold");
    expect(source.match(/data-mode="(full|tldr)"\s+class="mt-5/g)).toHaveLength(
      2,
    );
  });

  it("defaults to the compact TL;DR presentation", () => {
    expect(source).toContain('data-mode="tldr"');
    expect(source).toContain("typeset-compact");
    expect(layoutSource).toContain(
      '<html lang="en" data-bio-mode="tldr" data-theme-mode="dark">',
    );
    expect(layoutSource).toContain('?? "tldr"');
    expect(layoutSource).toContain('bioMode === "tldr" ? "dark" : "light"');
  });

  it("summarizes the current evidence-based CV", () => {
    expect(source).toContain("full-stack and platform engineer");
    expect(source).toContain("seven production PIM deployments");
    expect(source).toContain("300+ n8n workflows");
  });

  it("links selected projects to their public sites", () => {
    expect(source).toContain('href="https://nadi.co.id/"');
    expect(source).toContain('href="https://ydsf.org/"');
    expect(source).toContain('href="https://electgo.com/"');
    expect(source).toContain('href="https://ydsf.org/">YDSF</a>');
    expect(source).not.toContain(">YDSF.org</a>");
    expect(source).toContain('href="https://electgo.com/">ElectGo</a>');
    expect(source).not.toContain("Tai Sin Group");
  });

  it("preserves explicit visual spacing around contact links", () => {
    expect(source.match(/via&#32;/g)).toHaveLength(2);
    expect(source.match(/&#32;\/&#32;/g)).toHaveLength(6);
  });

  it("uses semantic sections and scannable lists", () => {
    const fullBiography = source.match(
      /<div\s+data-mode="full"[\s\S]*?<div\s+data-mode="tldr"/,
    )?.[0];
    const tldrBiography = source.match(
      /<div\s+data-mode="tldr"[\s\S]*?<\/Layout>/,
    )?.[0];

    expect(fullBiography?.match(/<h2>/g)).toHaveLength(3);
    expect(fullBiography?.match(/<li>/g)).toHaveLength(6);
    expect(tldrBiography?.match(/<h2>/g)).toBeNull();
    expect(tldrBiography?.match(/<li>/g)).toBeNull();
  });
});
