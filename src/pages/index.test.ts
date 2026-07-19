import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./index.astro", import.meta.url), "utf8");
const globalStyles = readFileSync(
  new URL("../styles/global.css", import.meta.url),
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
    expect(source).toContain('class="my-0 flex flex-wrap');
    expect(source).toContain("mb-4 text-left");
    expect(source).toContain("font-bold");
    expect(source.match(/data-mode="(full|tldr)"\s+class="mt-2/g)).toHaveLength(
      2,
    );
  });

  it("summarizes the current evidence-based CV", () => {
    expect(source).toContain("full-stack and platform engineer");
    expect(source).toContain("seven production PIM deployments");
    expect(source).toContain("300+ n8n workflows");
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
    expect(tldrBiography?.match(/<h2>/g)).toHaveLength(1);
    expect(tldrBiography?.match(/<li>/g)).toHaveLength(3);
  });
});
