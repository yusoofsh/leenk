import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { Tabs as TabsPrimitive } from "radix-ui";

import { mergeStylex } from "~/lib/sx";
import { colors, radii } from "~/styles/tokens.stylex";

const styles = stylex.create({
  content: {
    flex: 1,
    outline: "none",
  },
  list: {
    alignItems: "center",
    borderRadius: radii.lg,
    display: "inline-flex",
    height: "2.25rem",
    justifyContent: "center",
    padding: "3px",
    width: "fit-content",
  },
  listDefault: {
    backgroundColor: colors.muted,
  },
  listLine: {
    backgroundColor: "transparent",
    borderRadius: 0,
    gap: "0.25rem",
  },
  root: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  trigger: {
    alignItems: "center",
    backgroundColor: {
      default: "transparent",
      ":is([data-state=active])": colors.background,
    },
    borderColor: "transparent",
    borderRadius: radii.md,
    borderWidth: 1,
    color: {
      default: "color-mix(in oklab, var(--foreground) 60%, transparent)",
      ":hover": colors.foreground,
      ":is([data-state=active])": colors.foreground,
    },
    display: "inline-flex",
    flex: 1,
    fontSize: "0.875rem",
    fontWeight: 500,
    gap: "0.375rem",
    height: "calc(100% - 1px)",
    justifyContent: "center",
    outline: "none",
    paddingBlock: "0.25rem",
    paddingInline: "0.5rem",
    position: "relative",
    transitionDuration: "150ms",
    transitionProperty: "color, background-color, box-shadow",
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
});

function Tabs({
  className,
  orientation = "horizontal",
  style,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-orientation={orientation}
      data-slot="tabs"
      orientation={orientation}
      {...props}
      {...mergeStylex(stylex.props(styles.root), className, style)}
    />
  );
}

function TabsList({
  className,
  style,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & {
  variant?: "default" | "line";
}) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      {...props}
      {...mergeStylex(
        stylex.props(
          styles.list,
          variant === "line" ? styles.listLine : styles.listDefault,
        ),
        className,
        style,
      )}
    />
  );
}

function TabsTrigger({
  className,
  style,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      {...props}
      {...mergeStylex(stylex.props(styles.trigger), className, style)}
    />
  );
}

function TabsContent({
  className,
  style,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      {...props}
      {...mergeStylex(stylex.props(styles.content), className, style)}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
