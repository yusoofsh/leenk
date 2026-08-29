import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { Avatar as AvatarPrimitive } from "radix-ui";

import { mergeStylex } from "~/lib/sx";
import { colors } from "~/styles/tokens.stylex";

const styles = stylex.create({
  fallback: {
    alignItems: "center",
    backgroundColor: colors.muted,
    borderRadius: "9999px",
    color: colors.mutedForeground,
    display: "flex",
    fontSize: "0.875rem",
    height: "100%",
    justifyContent: "center",
    width: "100%",
  },
  image: {
    aspectRatio: "1 / 1",
    height: "100%",
    width: "100%",
  },
  lg: {
    height: "2.5rem",
    width: "2.5rem",
  },
  root: {
    display: "flex",
    flexShrink: 0,
    overflow: "hidden",
    position: "relative",
    userSelect: "none",
  },
  sm: {
    height: "1.5rem",
    width: "1.5rem",
  },
  defaultSize: {
    height: "2rem",
    width: "2rem",
  },
});

function Avatar({
  className,
  size = "default",
  style,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Root> & {
  size?: "default" | "lg" | "sm";
}) {
  return (
    <AvatarPrimitive.Root
      data-size={size}
      data-slot="avatar"
      {...props}
      {...mergeStylex(
        stylex.props(
          styles.root,
          size === "lg" && styles.lg,
          size === "sm" && styles.sm,
          size === "default" && styles.defaultSize,
        ),
        className,
        style,
      )}
    />
  );
}

function AvatarImage({
  className,
  style,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      {...props}
      {...mergeStylex(stylex.props(styles.image), className, style)}
    />
  );
}

function AvatarFallback({
  className,
  style,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      {...props}
      {...mergeStylex(stylex.props(styles.fallback), className, style)}
    />
  );
}

export { Avatar, AvatarFallback, AvatarImage };
