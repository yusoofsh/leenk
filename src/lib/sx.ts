import * as stylex from "@stylexjs/stylex";
import type { CompiledStyles, StyleXArray } from "@stylexjs/stylex";
import type { CSSProperties } from "react";

type StylexProps = ReturnType<typeof stylex.props>;

type StyleArg = StyleXArray<null | undefined | CompiledStyles | boolean>;

export function mergeStylex(
  compiled: StylexProps,
  className?: string,
  style?: CSSProperties,
): { className?: string; style?: CSSProperties } {
  const nextClass = [compiled.className, className].filter(Boolean).join(" ");
  const mergedStyle =
    compiled.style || style
      ? ({ ...compiled.style, ...style } satisfies CSSProperties)
      : undefined;
  return {
    ...(nextClass ? { className: nextClass } : {}),
    ...(mergedStyle ? { style: mergedStyle } : {}),
  };
}

export function cls(...styles: ReadonlyArray<StyleArg>): string | undefined {
  return stylex.props(...styles).className;
}
