import * as React from "react";
import * as stylex from "@stylexjs/stylex";

import { mergeStylex } from "~/lib/sx";
import { colors, radii } from "~/styles/tokens.stylex";

const styles = stylex.create({
  default: {
    backgroundColor: colors.card,
    color: colors.cardForeground,
  },
  description: {
    color: colors.mutedForeground,
    display: "grid",
    fontSize: "0.875rem",
    gap: "0.25rem",
    gridColumnStart: 2,
    justifyItems: "start",
  },
  destructive: {
    backgroundColor: colors.card,
    color: colors.destructive,
  },
  root: {
    alignItems: "start",
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    display: "grid",
    fontSize: "0.875rem",
    gap: "0.125rem",
    gridTemplateColumns: "0 1fr",
    paddingBlock: "0.75rem",
    paddingInline: "1rem",
    position: "relative",
    width: "100%",
  },
  title: {
    fontWeight: 500,
    gridColumnStart: 2,
    letterSpacing: "-0.025em",
    minHeight: "1rem",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
});

function Alert({
  className,
  style,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & { variant?: "default" | "destructive" }) {
  return (
    <div
      data-slot="alert"
      role="alert"
      {...props}
      {...mergeStylex(
        stylex.props(
          styles.root,
          variant === "destructive" ? styles.destructive : styles.default,
        ),
        className,
        style,
      )}
    />
  );
}

function AlertTitle({
  className,
  style,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-title"
      {...props}
      {...mergeStylex(stylex.props(styles.title), className, style)}
    />
  );
}

function AlertDescription({
  className,
  style,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="alert-description"
      {...props}
      {...mergeStylex(stylex.props(styles.description), className, style)}
    />
  );
}

export { Alert, AlertDescription, AlertTitle };
