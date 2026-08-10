import { describe, expect, it } from "vitest";

import {
  canTransitionRevisionState,
  contentDigest,
  nextRevisionNumber,
  parseActivityEntryRow,
  parseRevisionRow,
  publishStatements,
  resolveSaveDraftBaseline,
  rollbackStatements,
  saveDraftStatements,
  validateCmsBlock,
  validateCmsBlocks,
  validateCmsLink,
  validateRevisionContent,
  type CmsBlock,
  type CmsRevisionContent,
} from "./cms";

const validBlocks = {
  full: [
    { type: "intro", text: "Meet me, Yusoof Moh" },
    { type: "section", heading: "What I do", text: "Applications and data" },
    { type: "bullet_list", items: ["TypeScript", "React"] },
    {
      type: "contact",
      email: "me@yusoofsh.id",
      links: [{ kind: "url", label: "Mail", target: "https://yusoofsh.id" }],
    },
  ] satisfies CmsBlock[],
  tldr: [{ type: "paragraph", text: "Bismillah." }] satisfies CmsBlock[],
};

describe("link validation", () => {
  it("accepts typed links", () => {
    expect(
      validateCmsLink({
        kind: "url",
        label: "Site",
        target: "https://yusoofsh.id",
      }).link,
    ).toEqual({ kind: "url", label: "Site", target: "https://yusoofsh.id" });
    expect(
      validateCmsLink({
        kind: "email",
        label: "Mail",
        target: "me@yusoofsh.id",
      }).link,
    ).toEqual({ kind: "email", label: "Mail", target: "me@yusoofsh.id" });
    expect(
      validateCmsLink({ kind: "internal", label: "Home", target: "/home" })
        .link,
    ).toEqual({ kind: "internal", label: "Home", target: "/home" });
    expect(
      validateCmsLink({ kind: "shortlink", label: "Docs", target: "AbCd1234" })
        .link,
    ).toEqual({ kind: "shortlink", label: "Docs", target: "AbCd1234" });
  });

  it("rejects unsafe or invalid links", () => {
    expect(
      validateCmsLink({
        kind: "url",
        label: "X",
        target: "javascript:alert(1)",
      }).error,
    ).toBe("URL links must use http or https");
    expect(
      validateCmsLink({ kind: "url", label: "X", target: "not a url" }).error,
    ).toBe("URL links must be valid URLs");
    expect(
      validateCmsLink({ kind: "email", label: "X", target: "nope" }).error,
    ).toBe("Email links must be valid email addresses");
    expect(
      validateCmsLink({
        kind: "internal",
        label: "X",
        target: "https://evil.example",
      }).error,
    ).toBe("Internal links must be same-origin paths");
    expect(
      validateCmsLink({ kind: "shortlink", label: "X", target: "not-a-code" })
        .error,
    ).toBe("Shortlinks must be valid codes");
    expect(
      validateCmsLink({ kind: "html", label: "X", target: "/x" }).error,
    ).toBe("Link kind is not supported");
    expect(
      validateCmsLink({ kind: "url", label: "", target: "https://yusoofsh.id" })
        .error,
    ).toBe("Link labels are required");
  });
});

describe("block validation", () => {
  it("accepts every allowed block type", () => {
    expect(validateCmsBlock({ type: "intro", text: "Hi" }).block).toEqual({
      type: "intro",
      text: "Hi",
    });
    expect(validateCmsBlock({ type: "paragraph", text: "Hi" }).block).toEqual({
      type: "paragraph",
      text: "Hi",
    });
    expect(
      validateCmsBlock({ type: "section", heading: "H", text: "Body" }).block,
    ).toEqual({ type: "section", heading: "H", text: "Body" });
    expect(
      validateCmsBlock({ type: "bullet_list", items: ["a", "b"] }).block,
    ).toEqual({ type: "bullet_list", items: ["a", "b"] });
  });

  it("rejects arbitrary HTML and unknown types", () => {
    expect(validateCmsBlock({ type: "script", text: "<script>" }).error).toBe(
      "Content blocks must use a supported type",
    );
    expect(
      validateCmsBlock({ type: "intro", text: "<img onerror=x>" }).error,
    ).toBeUndefined();
    expect(validateCmsBlock({ type: "intro" }).error).toBe(
      "intro blocks require text",
    );
    expect(validateCmsBlock({ type: "section", heading: "" }).error).toBe(
      "Section headings are required",
    );
    expect(validateCmsBlock({ type: "bullet_list", items: [] }).error).toBe(
      "Bullet lists need at least one item",
    );
  });

  it("validates full block lists and their bounds", () => {
    const parsed = validateCmsBlocks(validBlocks.full, "full");
    expect(parsed.error).toBeUndefined();
    expect(parsed.blocks).toHaveLength(4);
    expect(validateCmsBlocks("nope", "full").error).toBe(
      "full content must be a block list",
    );
    const tooMany = Array.from({ length: 65 }, () => ({
      type: "paragraph",
      text: "x",
    }));
    expect(validateCmsBlocks(tooMany, "full").error).toBe(
      "full content is limited to 64 blocks",
    );
  });
});

describe("revision content validation", () => {
  it("accepts a valid revision payload", () => {
    const parsed = validateRevisionContent({
      blocksFull: validBlocks.full,
      blocksTldr: validBlocks.tldr,
      title: "Homepage",
      seoTitle: "Yusoof Moh",
      profileMetadata: { role: "Engineer" },
    });
    expect(parsed.error).toBeUndefined();
    expect(parsed.content?.title).toBe("Homepage");
    expect(parsed.content?.blocksFull).toHaveLength(4);
  });

  it("rejects missing titles and oversized fields", () => {
    expect(
      validateRevisionContent({ blocksFull: [], blocksTldr: [], title: " " })
        .error,
    ).toBe("Revision titles are required");
    expect(
      validateRevisionContent({
        blocksFull: [],
        blocksTldr: [],
        title: "x".repeat(513),
      }).error,
    ).toBe("Revision titles are too long");
  });

  it("rejects functions inside profile metadata", () => {
    const parsed = validateRevisionContent({
      blocksFull: [],
      blocksTldr: [],
      profileMetadata: { fn: () => 1 },
      title: "Homepage",
    });
    expect(parsed.error).toBe("Profile metadata must be a plain object");
  });
});

describe("revision state transitions", () => {
  it("allows draft publish and archival", () => {
    expect(canTransitionRevisionState("draft", "published")).toBe(true);
    expect(canTransitionRevisionState("draft", "archived")).toBe(true);
    expect(canTransitionRevisionState("published", "archived")).toBe(true);
  });

  it("forbids re-publishing, restoring, or re-opening", () => {
    expect(canTransitionRevisionState("published", "published")).toBe(false);
    expect(canTransitionRevisionState("archived", "draft")).toBe(false);
    expect(canTransitionRevisionState("archived", "published")).toBe(false);
    expect(canTransitionRevisionState("published", "draft")).toBe(false);
  });
});

describe("revision numbering", () => {
  it("increments from the latest number", () => {
    expect(nextRevisionNumber(null)).toBe(1);
    expect(nextRevisionNumber({ number: 0 })).toBe(1);
    expect(nextRevisionNumber({ number: 7 })).toBe(8);
  });
});

describe("save draft optimistic concurrency", () => {
  it("accepts a matching draft baseline", () => {
    expect(
      resolveSaveDraftBaseline({
        currentDraftId: "rev-7",
        expectedRevisionId: "rev-7",
      }),
    ).toBe("ok");
  });

  it("rejects a stale tab", () => {
    expect(
      resolveSaveDraftBaseline({
        currentDraftId: "rev-9",
        expectedRevisionId: "rev-7",
      }),
    ).toBe("stale");
  });

  it("accepts a first save with no existing draft", () => {
    expect(
      resolveSaveDraftBaseline({
        currentDraftId: null,
        expectedRevisionId: "doc-1",
      }),
    ).toBe("ok");
  });
});

describe("SQL plan builders", () => {
  const createdAt = "2026-08-09T12:00:00.000Z";
  const revision: CmsRevisionContent = {
    blocksFull: validBlocks.full,
    blocksTldr: validBlocks.tldr,
    profileMetadata: {},
    seoDescription: "",
    seoKeywords: "",
    seoTitle: "Yusoof Moh",
    socialCopy: "",
    title: "Homepage",
  };

  it("archives the prior draft and inserts a new one with blocks", () => {
    const statements = saveDraftStatements({
      actor: "operator",
      content: revision,
      createdAt,
      currentDraftId: "rev-old",
      documentId: "doc-1",
      payloadHash: "abc",
      revisionId: "rev-new",
      revisionNumber: 8,
    });
    expect(statements).toHaveLength(8);
    expect(statements[0]!.sql).toContain("SET state = 'archived'");
    expect(statements[1]!.sql).toContain("INSERT INTO content_revisions");
    expect(statements[1]!.params).toContain("abc");
    const blockStatements = statements.filter((statement) =>
      statement.sql.includes("INSERT INTO content_blocks"),
    );
    expect(blockStatements).toHaveLength(5);
    expect(statements.at(-1)!.sql).toContain("draft_saved");
  });

  it("does not archive when no draft exists", () => {
    const statements = saveDraftStatements({
      actor: "operator",
      content: revision,
      createdAt,
      currentDraftId: null,
      documentId: "doc-1",
      payloadHash: "abc",
      revisionId: "rev-new",
      revisionNumber: 1,
    });
    expect(statements).toHaveLength(7);
  });

  it("builds one atomic publish batch", () => {
    const statements = publishStatements({
      actor: "operator",
      createdAt,
      documentId: "doc-1",
      publishedRevisionId: "rev-8",
      revisionId: "rev-8",
    });
    expect(statements).toHaveLength(4);
    expect(statements[0]!.sql).toContain("state = 'archived'");
    expect(statements[1]!.sql).toContain("state = 'published'");
    expect(statements[2]!.sql).toContain("published_revision_id");
    expect(statements[2]!.params).toContain("rev-8");
    expect(statements[3]!.sql).toContain("published");
  });

  it("builds a rollback clone", () => {
    const statements = rollbackStatements({
      actor: "operator",
      content: revision,
      createdAt,
      currentDraftId: "rev-5",
      documentId: "doc-1",
      payloadHash: "old",
      revisionId: "rev-new",
      revisionNumber: 9,
      sourceRevisionId: "rev-3",
    });
    expect(statements).toHaveLength(8);
    expect(statements[1]!.sql).toContain("INSERT INTO content_revisions");
    expect(statements[1]!.params).toContain("old");
    expect(statements.at(-1)!.sql).toContain("rollback_prepared");
  });
});

describe("row parsing", () => {
  it("parses a revision row with JSON columns", () => {
    const row = parseRevisionRow({
      archived_at: null,
      author: "operator",
      created_at: "2026-08-09T12:00:00.000Z",
      document_id: "doc-1",
      id: "rev-7",
      number: 7,
      payload_hash: "abc",
      profile_metadata: "{}",
      seo_description: "",
      seo_keywords: "",
      seo_title: "Yusoof Moh",
      social_copy: "",
      state: "draft",
      title: "Homepage",
    });
    expect(row?.id).toBe("rev-7");
    expect(row?.state).toBe("draft");
    expect(row?.number).toBe(7);
  });

  it("rejects rows with invalid state or content", () => {
    expect(parseRevisionRow({ id: "rev-1", state: "deleted" })).toBeNull();
    expect(
      parseRevisionRow({
        author: "operator",
        created_at: "2026-08-09T12:00:00.000Z",
        document_id: "doc-1",
        id: "rev-1",
        number: 1,
        payload_hash: "abc",
        profile_metadata: "{}",
        seo_description: "",
        seo_keywords: "",
        seo_title: "",
        social_copy: "",
        state: "draft",
        title: "",
      }),
    ).toBeNull();
  });

  it("parses activity rows", () => {
    const row = parseActivityEntryRow({
      actor: "operator",
      created_at: "2026-08-09T12:00:00.000Z",
      id: "act-1",
      kind: "published",
      payload: '{"revisionId":"rev-7"}',
      summary: "Published a content revision",
    });
    expect(row?.kind).toBe("published");
    expect(row?.payload).toEqual({ revisionId: "rev-7" });
    expect(parseActivityEntryRow({ id: "act-2", kind: "" })).toBeNull();
  });
});

describe("content digest", () => {
  it("produces a stable SHA-256 digest", async () => {
    const content: CmsRevisionContent = {
      blocksFull: [{ type: "intro", text: "Hi" }],
      blocksTldr: [],
      profileMetadata: {},
      seoDescription: "",
      seoKeywords: "",
      seoTitle: "",
      socialCopy: "",
      title: "Homepage",
    };
    const first = await contentDigest(content);
    const second = await contentDigest(content);
    expect(first).toBe(second);
    expect(first).toMatch(/^[0-9a-f]{64}$/);
  });
});
