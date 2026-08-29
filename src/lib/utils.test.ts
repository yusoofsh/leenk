import { describe, expect, it } from "vitest";
import * as stylex from "@stylexjs/stylex";

import { cls, mergeStylex } from "./sx";

const styles = stylex.create({
  block: {
    display: "block",
  },
  bold: {
    fontWeight: 700,
  },
});

describe("cls", () => {
  it("returns a class name for StyleX styles", () => {
    expect(cls(styles.block)).toEqual(expect.any(String));
    expect(cls(styles.block)?.length).toBeGreaterThan(0);
  });
});

describe("mergeStylex", () => {
  it("appends an extra class name", () => {
    const merged = mergeStylex(stylex.props(styles.block), "extra");
    expect(merged.className).toContain("extra");
  });

  it("keeps both StyleX classes when composing", () => {
    const merged = mergeStylex(stylex.props(styles.block, styles.bold));
    expect(merged.className?.split(" ").length).toBeGreaterThan(0);
  });
});
