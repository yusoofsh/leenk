import { describe, expect, it } from "vitest";

import {
  contentDigest,
  validateInlineLinks,
  validateRevisionContent,
} from "./cms";
import { importHomepageStatements } from "./cms-import";
import { buildHomepageRevisionContent } from "~/lib/homepage-content";

const CONTENT = buildHomepageRevisionContent();

describe("homepage import content", () => {
  it("passes revision validation", () => {
    expect(validateRevisionContent(CONTENT).error).toBeUndefined();
  });

  it("keeps a stable content hash", async () => {
    expect(await contentDigest(CONTENT)).toBe(await contentDigest(CONTENT));
  });

  it("carries the project and social links as validated tokens", () => {
    const fullText = JSON.stringify(CONTENT.blocksFull);
    expect(fullText).toContain("[NADI](url:https://nadi.co.id/)");
    expect(fullText).toContain("[GitHub](internal:/github)");
    expect(validateInlineLinks(fullText)).toBeNull();
  });
});

describe("importHomepageStatements", () => {
  const statements = importHomepageStatements({
    actor: "system",
    content: CONTENT,
    createdAt: "2026-08-10T00:00:00.000Z",
    documentId: "homepage",
    payloadHash: "hash",
    revisionId: "revision-1",
    revisionNumber: 1,
  });

  it("creates the published revision and blocks atomically", () => {
    expect(statements[0]?.sql).toContain("INSERT INTO content_revisions");
    expect(statements[0]?.sql).toContain("'published'");
    expect(
      statements.filter((statement) =>
        statement.sql.includes("INSERT INTO content_blocks"),
      ),
    ).toHaveLength(CONTENT.blocksFull.length + CONTENT.blocksTldr.length);
  });

  it("points the document at the new revision and records the import", () => {
    const sql = statements.map((statement) => statement.sql).join("\n");
    expect(sql).toContain("UPDATE content_documents");
    expect(sql).toContain("INSERT INTO activity_entries");
  });
});
