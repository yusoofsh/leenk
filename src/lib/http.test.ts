import { describe, expect, it } from "vitest";

import { isSameOriginMutationRequest } from "./http";

describe("isSameOriginMutationRequest", () => {
  it("accepts an exact same-origin Origin header", () => {
    const request = new Request("https://www.yusoofsh.id/api/shortlinks", {
      headers: { origin: "https://www.yusoofsh.id" },
      method: "POST",
    });

    expect(isSameOriginMutationRequest(request)).toBe(true);
  });

  it("accepts a same-origin Referer when Origin is absent", () => {
    const request = new Request("https://www.yusoofsh.id/static/file.txt", {
      headers: { referer: "https://www.yusoofsh.id/dashboard#files" },
      method: "DELETE",
    });

    expect(isSameOriginMutationRequest(request)).toBe(true);
  });

  it("rejects cross-origin, null, and missing origin signals", () => {
    for (const headers of [
      { origin: "https://evil.example" },
      { origin: "null" },
      {},
    ]) {
      const request = new Request("https://www.yusoofsh.id/api/shortlinks", {
        headers,
        method: "POST",
      });

      expect(isSameOriginMutationRequest(request)).toBe(false);
    }
  });
});
