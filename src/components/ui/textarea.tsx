import * as React from "react";
import * as stylex from "@stylexjs/stylex";

import { mergeStylex } from "~/lib/sx";
import { mq } from "~/styles/breakpoints.stylex";
import { colors, radii } from "~/styles/tokens.stylex";

const styles = stylex.create({
  textarea: {
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
    display: "flex",
    fontSize: {
      default: "1rem",
      [mq.md]: "0.875rem",
    },
    minHeight: "4rem",
    outline: "none",
    paddingBlock: "0.5rem",
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
    },
    ":focus-visible": {
      boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
    },
  },
});

function Textarea({
  className,
  style,
  ...props
}: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      {...props}
      {...mergeStylex(stylex.props(styles.textarea), className, style)}
    />
  );
}

export { Textarea };
