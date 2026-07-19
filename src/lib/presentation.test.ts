import { describe, expect, it } from "vitest";

import { createStarShadows, shouldTrackPointer } from "./presentation";

describe("createStarShadows", () => {
  it("returns stable geometry for the same layer seed", () => {
    expect(createStarShadows(8, 101)).toBe(createStarShadows(8, 101));
  });

  it("keeps color out of the generated geometry", () => {
    const shadows = createStarShadows(8, 101);

    expect(shadows).not.toMatch(/#|rgb|oklch|white|black/i);
  });

  it("uses different geometry for different layer seeds", () => {
    expect(createStarShadows(8, 101)).not.toBe(createStarShadows(8, 202));
  });
});

describe("shouldTrackPointer", () => {
  it("tracks only a fine mouse pointer when motion is allowed", () => {
    expect(shouldTrackPointer("mouse", true, false)).toBe(true);
    expect(shouldTrackPointer("touch", true, false)).toBe(false);
    expect(shouldTrackPointer("mouse", false, false)).toBe(false);
    expect(shouldTrackPointer("mouse", true, true)).toBe(false);
  });
});
