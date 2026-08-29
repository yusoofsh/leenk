import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { Slot } from "radix-ui";

import { mergeStylex } from "~/lib/sx";
import { colors, radii } from "~/styles/tokens.stylex";

export type ButtonVariant =
  | "default"
  | "destructive"
  | "ghost"
  | "link"
  | "outline"
  | "secondary";

export type ButtonSize =
  | "default"
  | "icon"
  | "icon-lg"
  | "icon-sm"
  | "icon-xs"
  | "lg"
  | "sm"
  | "xs";

const styles = stylex.create({
  base: {
    alignItems: "center",
    borderRadius: radii.md,
    display: "inline-flex",
    flexShrink: 0,
    fontSize: "0.875rem",
    fontWeight: 500,
    gap: "0.5rem",
    justifyContent: "center",
    outline: "none",
    transitionDuration: "150ms",
    transitionProperty: "color, background-color, box-shadow, border-color",
    whiteSpace: "nowrap",
    ":disabled": {
      opacity: 0.5,
      pointerEvents: "none",
    },
    ":focus-visible": {
      borderColor: colors.ring,
      boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
    },
  },
  default: {
    backgroundColor: colors.primary,
    color: colors.primaryForeground,
    ":hover": {
      backgroundColor: "color-mix(in oklab, var(--primary) 90%, transparent)",
    },
  },
  defaultSize: {
    height: "2.25rem",
    paddingBlock: "0.5rem",
    paddingInline: "1rem",
  },
  destructive: {
    backgroundColor: colors.destructive,
    color: "white",
    ":hover": {
      backgroundColor:
        "color-mix(in oklab, var(--destructive) 90%, transparent)",
    },
  },
  ghost: {
    backgroundColor: "transparent",
    ":hover": {
      backgroundColor: colors.accent,
      color: colors.accentForeground,
    },
  },
  icon: {
    height: "2.25rem",
    width: "2.25rem",
  },
  iconLg: {
    height: "2.5rem",
    width: "2.5rem",
  },
  iconSm: {
    height: "2rem",
    width: "2rem",
  },
  iconXs: {
    borderRadius: radii.md,
    height: "1.5rem",
    width: "1.5rem",
  },
  lg: {
    borderRadius: radii.md,
    height: "2.5rem",
    paddingInline: "1.5rem",
  },
  link: {
    backgroundColor: "transparent",
    color: colors.primary,
    textUnderlineOffset: "4px",
    ":hover": {
      textDecorationLine: "underline",
    },
  },
  outline: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    boxShadow: "0 1px 2px rgb(0 0 0 / 5%)",
    ":hover": {
      backgroundColor: colors.accent,
      color: colors.accentForeground,
    },
  },
  secondary: {
    backgroundColor: colors.secondary,
    color: colors.secondaryForeground,
    ":hover": {
      backgroundColor: "color-mix(in oklab, var(--secondary) 80%, transparent)",
    },
  },
  sm: {
    borderRadius: radii.md,
    gap: "0.375rem",
    height: "2rem",
    paddingInline: "0.75rem",
  },
  xs: {
    borderRadius: radii.md,
    fontSize: "0.75rem",
    gap: "0.25rem",
    height: "1.5rem",
    paddingInline: "0.5rem",
  },
});

function Button({
  asChild = false,
  className,
  size = "default",
  style,
  variant = "default",
  ...props
}: React.ComponentProps<"button"> & {
  asChild?: boolean;
  size?: ButtonSize;
  variant?: ButtonVariant;
}) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-size={size}
      data-slot="button"
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
          size === "default" && styles.defaultSize,
          size === "icon" && styles.icon,
          size === "icon-lg" && styles.iconLg,
          size === "icon-sm" && styles.iconSm,
          size === "icon-xs" && styles.iconXs,
          size === "lg" && styles.lg,
          size === "sm" && styles.sm,
          size === "xs" && styles.xs,
        ),
        className,
        style,
      )}
    />
  );
}

export { Button };
