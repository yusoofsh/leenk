import * as stylex from "@stylexjs/stylex";

export const mq = stylex.defineConsts({
  lg: "@media (min-width: 64rem)",
  md: "@media (min-width: 48rem)",
  reduce: "@media (prefers-reduced-motion: reduce)",
  sm: "@media (min-width: 40rem)",
  xl: "@media (min-width: 80rem)",
});
