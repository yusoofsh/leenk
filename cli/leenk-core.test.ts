import { describe, expect, it } from "vitest";

import {
  buildObjectUrl,
  contentTypeForPath,
  formatUploadResult,
  normalizeFileInput,
  parseUploadArguments,
  validateRemotePath,
} from "./leenk-core";

describe("normalizeFileInput", () => {
  it("accepts absolute file URLs", () => {
    expect(
      normalizeFileInput("file:///Users/yusoofsh/Documents/report%20final.pdf"),
    ).toBe("/Users/yusoofsh/Documents/report final.pdf");
  });

  it("leaves filesystem paths unchanged", () => {
    expect(normalizeFileInput("./report.pdf")).toBe("./report.pdf");
  });
});

describe("validateRemotePath", () => {
  it("accepts nested object paths", () => {
    expect(validateRemotePath("reports/2026/report.pdf")).toBeNull();
  });

  it("rejects traversal and reserved shortlink storage", () => {
    expect(validateRemotePath("../secret")).toMatch(/invalid segment/i);
    expect(validateRemotePath("__shortlinks/code")).toMatch(/reserved/i);
  });
});

describe("parseUploadArguments", () => {
  it("creates a shortlink with a 14-day expiry by default", () => {
    expect(parseUploadArguments(["./report.pdf"])).toEqual({
      campaign: undefined,
      expiration: undefined,
      filePath: "./report.pdf",
      medium: undefined,
      remotePath: undefined,
      shortlink: true,
      source: undefined,
    });
  });

  it("supports explicit upload overrides", () => {
    expect(
      parseUploadArguments([
        "--expires",
        "never",
        "--no-shortlink",
        "./report.pdf",
        "reports/report.pdf",
      ]),
    ).toMatchObject({
      expiration: "never",
      remotePath: "reports/report.pdf",
      shortlink: false,
    });
  });
});

describe("upload output", () => {
  it("formats all confirmed details", () => {
    expect(
      formatUploadResult({
        etag: '"abc123"',
        expiresAt: "2026-08-18T12:00:00.000Z",
        path: "report.pdf",
        shortlink: { shortUrl: "https://www.yusoofsh.id/aB3x" },
        size: 4242,
        url: "https://www.yusoofsh.id/static/report.pdf",
      }),
    ).toBe(
      [
        "Path: report.pdf",
        "Size: 4,242 bytes",
        'ETag: "abc123"',
        "Expires: 2026-08-18T12:00:00.000Z",
        "Public URL: https://www.yusoofsh.id/static/report.pdf",
        "Short URL: https://www.yusoofsh.id/aB3x",
      ].join("\n"),
    );
  });
});

describe("HTTP helpers", () => {
  it("encodes each remote path segment", () => {
    expect(buildObjectUrl("https://www.yusoofsh.id/", "reports/a b.pdf")).toBe(
      "https://www.yusoofsh.id/static/reports/a%20b.pdf",
    );
  });

  it("detects common static file content types", () => {
    expect(contentTypeForPath("page.html")).toBe("text/html; charset=utf-8");
    expect(contentTypeForPath("document.pdf")).toBe("application/pdf");
    expect(contentTypeForPath("archive.unknown")).toBe(
      "application/octet-stream",
    );
  });
});
