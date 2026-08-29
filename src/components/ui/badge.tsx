import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { Slot } from "radix-ui";

import { mergeStylex } from "~/lib/sx";
import { colors } from "~/styles/tokens.stylex";

export type BadgeVariant =
  | "default"
  | "destructive"
  | "ghost"
  | "link"
  | "outline"
  | "secondary";

const styles = stylex.create({
  base: {
    alignItems: "center",
    borderColor: "transparent",
    borderRadius: "9999px",
    borderWidth: 1,
    display: "inline-flex",
    flexShrink: 0,
    fontSize: "0.75rem",
    fontWeight: 500,
    gap: "0.25rem",
    justifyContent: "center",
    overflow: "hidden",
    paddingBlock: "0.125rem",
    paddingInline: "0.5rem",
    whiteSpace: "nowrap",
    width: "fit-content",
  },
  default: {
    backgroundColor: colors.primary,
    color: colors.primaryForeground,
  },
  destructive: {
    backgroundColor: colors.destructive,
    color: "white",
  },
  ghost: {
    backgroundColor: "transparent",
  },
  link: {
    backgroundColor: "transparent",
    color: colors.primary,
    textUnderlineOffset: "4px",
  },
  outline: {
    borderColor: colors.border,
    color: colors.foreground,
  },
  secondary: {
    backgroundColor: colors.secondary,
    color: colors.secondaryForeground,
  },
});

function Badge({
  asChild = false,
  className,
  style,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & {
  asChild?: boolean;
  variant?: BadgeVariant;
}) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      {...props}
      {...mergeStylex(
        stylex.props(
          styles.base,
          variant === "default" && styles.default,
          variant === "destructive" && styles.destructive,
          variant === "ghost" && styles.ghost,
          variant === "link" && styles.link,
          variant === "outline" && styles.outline,
          variant === "secondary" && styles.secondary,
        ),
        className,
        style,
      )}
    />
  );
}

export { Badge };
