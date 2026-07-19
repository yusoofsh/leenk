import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./index.astro", import.meta.url), "utf8");
const fullBioUrl = new URL("../content/bio/full.md", import.meta.url);
const tldrBioUrl = new URL("../content/bio/tldr.md", import.meta.url);
const fullBioMarkdown = existsSync(fileURLToPath(fullBioUrl))
  ? readFileSync(fullBioUrl, "utf8")
  : "";
const tldrBioMarkdown = existsSync(fileURLToPath(tldrBioUrl))
  ? readFileSync(tldrBioUrl, "utf8")
  : "";

describe("home page switch section", () => {
  it("renders only the biography switch", () => {
    expect(source).toContain("<ModeToggle client:load />");
    expect(source).not.toContain("ThemeToggle");
    expect(source.match(/client:load/g)).toHaveLength(1);
  });

  it("renders both biography modes from Markdown", () => {
    expect(source).toContain('import FullBio from "../content/bio/full.md"');
    expect(source).toContain('import TldrBio from "../content/bio/tldr.md"');
    expect(source).toContain("<FullBio />");
    expect(source).toContain("<TldrBio />");
  });

  it("keeps the compact switch close to the title and biography", () => {
    expect(source).toContain("prose-p:my-0");
    expect(source).toContain('class="my-0 flex flex-wrap');
    expect(source).toContain("mb-4 text-left");
    expect(source).toContain(
      'data-mode="full" class="mt-2 flex flex-col gap-3"',
    );
    expect(source).toContain(
      'data-mode="tldr" class="mt-2 flex flex-col gap-3"',
    );
  });

  it("summarizes the current evidence-based CV", () => {
    expect(fullBioMarkdown).toContain("full-stack and platform engineer");
    expect(fullBioMarkdown).toContain("seven production PIM deployments");
    expect(fullBioMarkdown).toContain("300+ n8n workflows");
    expect(tldrBioMarkdown).toContain("full-stack and platform engineer");
  });

  it("uses semantic sections and scannable lists", () => {
    expect(fullBioMarkdown.match(/^## /gm)).toHaveLength(4);
    expect(fullBioMarkdown.match(/^- /gm)?.length).toBeGreaterThanOrEqual(7);
    expect(tldrBioMarkdown.match(/^## /gm)).toHaveLength(1);
    expect(tldrBioMarkdown.match(/^- /gm)).toHaveLength(3);
  });
});
