import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { XIcon } from "lucide-react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { Button } from "~/components/ui/button";
import { mergeStylex } from "~/lib/sx";
import { mq } from "~/styles/breakpoints.stylex";
import { colors, radii } from "~/styles/tokens.stylex";

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
    ":focus": {
      boxShadow: `0 0 0 2px ${colors.ring}`,
      outline: "none",
    },
  },
  content: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    boxShadow: "0 10px 15px rgb(0 0 0 / 10%)",
    display: "grid",
    gap: "1rem",
    left: "50%",
    maxWidth: {
      default: "calc(100% - 2rem)",
      [mq.sm]: "32rem",
    },
    outline: "none",
    padding: "1.5rem",
    position: "fixed",
    top: "50%",
    transform: "translate(-50%, -50%)",
    width: "100%",
    zIndex: 50,
  },
  description: {
    color: colors.mutedForeground,
    fontSize: "0.875rem",
  },
  footer: {
    display: "flex",
    flexDirection: {
      default: "column-reverse",
      [mq.sm]: "row",
    },
    gap: "0.5rem",
    justifyContent: {
      default: "stretch",
      [mq.sm]: "flex-end",
    },
  },
  header: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    textAlign: {
      default: "center",
      [mq.sm]: "left",
    },
  },
  overlay: {
    backgroundColor: "rgb(0 0 0 / 50%)",
    inset: 0,
    position: "fixed",
    zIndex: 50,
  },
  title: {
    fontSize: "1.125rem",
    fontWeight: 600,
    lineHeight: 1,
  },
});

function Dialog({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
  className,
  style,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      {...props}
      {...mergeStylex(stylex.props(styles.overlay), className, style)}
    />
  );
}

function DialogContent({
  children,
  className,
  showCloseButton = true,
  style,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean;
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        {...props}
        {...mergeStylex(stylex.props(styles.content), className, style)}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            {...stylex.props(styles.close)}
          >
            <XIcon size={16} />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({
  className,
  style,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      {...props}
      {...mergeStylex(stylex.props(styles.header), className, style)}
    />
  );
}

function DialogFooter({
  children,
  className,
  showCloseButton = false,
  style,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean;
}) {
  return (
    <div
      data-slot="dialog-footer"
      {...props}
      {...mergeStylex(stylex.props(styles.footer), className, style)}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  );
}

function DialogTitle({
  className,
  style,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      {...props}
      {...mergeStylex(stylex.props(styles.title), className, style)}
    />
  );
}

function DialogDescription({
  className,
  style,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      {...props}
      {...mergeStylex(stylex.props(styles.description), className, style)}
    />
  );
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
};
