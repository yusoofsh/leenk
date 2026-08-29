import * as React from "react";
import * as stylex from "@stylexjs/stylex";

import { mergeStylex } from "~/lib/sx";
import { mq } from "~/styles/breakpoints.stylex";
import { colors, radii } from "~/styles/tokens.stylex";

const styles = stylex.create({
  input: {
    backgroundColor: {
      default: "transparent",
      ":is(.dark *)": "color-mix(in oklab, var(--input) 30%, transparent)",
    },
    borderColor: {
      default: colors.input,
      ":focus-visible": colors.ring,
      ":is([aria-invalid=true])": colors.destructive,
    },
    borderRadius: radii.md,
    borderWidth: 1,
    boxShadow: "0 1px 2px rgb(0 0 0 / 5%)",
    fontSize: {
      default: "1rem",
      [mq.md]: "0.875rem",
    },
    height: "2.25rem",
    minWidth: 0,
    outline: "none",
    paddingBlock: "0.25rem",
    paddingInline: "0.75rem",
    transitionDuration: "150ms",
    transitionProperty: "color, box-shadow, border-color",
    width: "100%",
    "::placeholder": {
      color: colors.mutedForeground,
    },
    ":disabled": {
      cursor: "not-allowed",
      opacity: 0.5,
      pointerEvents: "none",
    },
    ":focus-visible": {
      boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
    },
  },
});

function Input({
  className,
  style,
  type,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      type={type}
      {...props}
      {...mergeStylex(stylex.props(styles.input), className, style)}
    />
  );
}

export { Input };
