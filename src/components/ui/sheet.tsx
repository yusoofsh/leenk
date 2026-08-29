import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { XIcon } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";

import { mergeStylex } from "~/lib/sx";
import { mq } from "~/styles/breakpoints.stylex";
import { colors } from "~/styles/tokens.stylex";

const styles = stylex.create({
  close: {
    borderRadius: "2px",
    opacity: 0.7,
    position: "absolute",
    right: "1rem",
    top: "1rem",
    ":hover": {
      opacity: 1,
    },
  },
  content: {
    backgroundColor: colors.background,
    boxShadow: "0 10px 15px rgb(0 0 0 / 10%)",
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
    position: "fixed",
    transitionDuration: "300ms",
    transitionProperty: "transform",
    transitionTimingFunction: "ease-in-out",
    zIndex: 50,
  },
  description: {
    color: colors.mutedForeground,
    fontSize: "0.875rem",
  },
  footer: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    marginTop: "auto",
    padding: "1rem",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "0.375rem",
    padding: "1rem",
  },
  overlay: {
    backgroundColor: "rgb(0 0 0 / 50%)",
    inset: 0,
    position: "fixed",
    zIndex: 50,
  },
  sideBottom: {
    borderTopWidth: 1,
    bottom: 0,
    height: "auto",
    insetInline: 0,
  },
  sideLeft: {
    borderRightWidth: 1,
    height: "100%",
    insetBlock: 0,
    left: 0,
    maxWidth: {
      default: "75%",
      [mq.sm]: "24rem",
    },
    width: "75%",
  },
  sideRight: {
    borderLeftWidth: 1,
    height: "100%",
    insetBlock: 0,
    maxWidth: {
      default: "75%",
      [mq.sm]: "24rem",
    },
    right: 0,
    width: "75%",
  },
  sideTop: {
    borderBottomWidth: 1,
    height: "auto",
    insetInline: 0,
    top: 0,
  },
  title: {
    color: colors.foreground,
    fontWeight: 600,
  },
});

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

function SheetPortal({
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Portal>) {
  return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
}

function SheetOverlay({
  className,
  style,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
  return (
    <SheetPrimitive.Overlay
      data-slot="sheet-overlay"
      {...props}
      {...mergeStylex(stylex.props(styles.overlay), className, style)}
    />
  );
}

function SheetContent({
  children,
  className,
  showCloseButton = true,
  side = "right",
  style,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  showCloseButton?: boolean;
  side?: "bottom" | "left" | "right" | "top";
}) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        {...props}
        {...mergeStylex(
          stylex.props(
            styles.content,
            side === "right" && styles.sideRight,
            side === "left" && styles.sideLeft,
            side === "top" && styles.sideTop,
            side === "bottom" && styles.sideBottom,
          ),
          className,
          style,
        )}
      >
        {children}
        {showCloseButton && (
          <SheetPrimitive.Close {...stylex.props(styles.close)}>
            <XIcon size={16} />
            <span className="sr-only">Close</span>
          </SheetPrimitive.Close>
        )}
      </SheetPrimitive.Content>
    </SheetPortal>
  );
}

function SheetHeader({
  className,
  style,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      {...props}
      {...mergeStylex(stylex.props(styles.header), className, style)}
    />
  );
}

function SheetFooter({
  className,
  style,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      {...props}
      {...mergeStylex(stylex.props(styles.footer), className, style)}
    />
  );
}

function SheetTitle({
  className,
  style,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return (
    <SheetPrimitive.Title
      data-slot="sheet-title"
      {...props}
      {...mergeStylex(stylex.props(styles.title), className, style)}
    />
  );
}

function SheetDescription({
  className,
  style,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      {...props}
      {...mergeStylex(stylex.props(styles.description), className, style)}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
