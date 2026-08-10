import { describe, expect, it } from "vitest";

import {
  isProtectedPath,
  memberCanManage,
  memberCanRead,
  memberHasCapability,
} from "./auth-guard";

describe("isProtectedPath", () => {
  it("protects the dashboard API prefixes", () => {
    expect(isProtectedPath("/api/dashboard/activity")).toBe(true);
    expect(isProtectedPath("/api/dashboard/analytics/shortlinks")).toBe(true);
  });

  it("leaves public paths open", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(isProtectedPath("/login")).toBe(false);
    // The dashboard page checks its own session; the middleware only guards
    // the API so single-segment pages route correctly in production.
    expect(isProtectedPath("/dashboard")).toBe(false);
    expect(isProtectedPath("/static/report.pdf")).toBe(false);
    expect(isProtectedPath("/api/auth/sign-in")).toBe(false);
    expect(isProtectedPath("/xucU")).toBe(false);
    expect(isProtectedPath("/api/shortlinks")).toBe(false);
  });
});

describe("role capabilities", () => {
  it("grants the owner every capability", () => {
    expect(memberHasCapability("owner", "settings:manage")).toBe(true);
    expect(memberHasCapability("owner", "content:manage")).toBe(true);
    expect(memberHasCapability("owner", "files:read")).toBe(true);
  });

  it("keeps members read-only", () => {
    expect(memberCanRead("content", "member")).toBe(true);
    expect(memberCanRead("files", "member")).toBe(true);
    expect(memberCanRead("analytics", "member")).toBe(true);
    expect(memberCanManage("content", "member")).toBe(false);
    expect(memberCanManage("settings", "member")).toBe(false);
  });

  it("lets admins manage content, files, and shortlinks", () => {
    expect(memberCanManage("content", "admin")).toBe(true);
    expect(memberCanManage("files", "admin")).toBe(true);
    expect(memberCanManage("shortlinks", "admin")).toBe(true);
    expect(memberCanManage("settings", "admin")).toBe(true);
  });

  it("rejects unknown roles", () => {
    expect(memberHasCapability("superuser", "content:read")).toBe(false);
  });
});
