import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("combines conditional class names", () => {
    expect(cn("block", null, { "font-bold": true })).toBe("block font-bold");
  });

  it("resolves conflicting Tailwind utilities", () => {
    expect(cn("px-2 text-sm", "px-4 text-lg")).toBe("px-4 text-lg");
  });
});
