import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { Select as SelectPrimitive } from "radix-ui";

import { mergeStylex } from "~/lib/sx";
import { colors, radii } from "~/styles/tokens.stylex";

const styles = stylex.create({
  content: {
    backgroundColor: colors.popover,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    boxShadow: "0 4px 6px rgb(0 0 0 / 10%)",
    color: colors.popoverForeground,
    maxHeight: "var(--radix-select-content-available-height)",
    minWidth: "8rem",
    overflowX: "hidden",
    overflowY: "auto",
    position: "relative",
    zIndex: 50,
  },
  indicator: {
    alignItems: "center",
    display: "flex",
    height: "0.875rem",
    justifyContent: "center",
    position: "absolute",
    right: "0.5rem",
    width: "0.875rem",
  },
  item: {
    alignItems: "center",
    borderRadius: radii.sm,
    cursor: "default",
    display: "flex",
    fontSize: "0.875rem",
    gap: "0.5rem",
    outline: "none",
    paddingBlock: "0.375rem",
    paddingLeft: "0.5rem",
    paddingRight: "2rem",
    position: "relative",
    userSelect: "none",
    width: "100%",
    ":focus": {
      backgroundColor: colors.accent,
      color: colors.accentForeground,
    },
  },
  label: {
    color: colors.mutedForeground,
    fontSize: "0.75rem",
    paddingBlock: "0.375rem",
    paddingInline: "0.5rem",
  },
  scrollButton: {
    alignItems: "center",
    cursor: "default",
    display: "flex",
    justifyContent: "center",
    paddingBlock: "0.25rem",
  },
  separator: {
    backgroundColor: colors.border,
    height: "1px",
    marginBlock: "0.25rem",
    marginInline: "-0.25rem",
    pointerEvents: "none",
  },
  trigger: {
    alignItems: "center",
    backgroundColor: {
      default: "transparent",
      ":is(.dark *)": "color-mix(in oklab, var(--input) 30%, transparent)",
    },
    borderColor: colors.input,
    borderRadius: radii.md,
    borderWidth: 1,
    boxShadow: "0 1px 2px rgb(0 0 0 / 5%)",
    display: "flex",
    fontSize: "0.875rem",
    gap: "0.5rem",
    height: "2.25rem",
    justifyContent: "space-between",
    outline: "none",
    paddingBlock: "0.5rem",
    paddingInline: "0.75rem",
    whiteSpace: "nowrap",
    width: "fit-content",
    ":disabled": {
      cursor: "not-allowed",
      opacity: 0.5,
    },
    ":focus-visible": {
      borderColor: colors.ring,
      boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
    },
  },
  triggerSm: {
    height: "2rem",
  },
  viewport: {
    padding: "0.25rem",
  },
});

function Select({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root data-slot="select" {...props} />;
}

function SelectGroup({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Group>) {
  return <SelectPrimitive.Group data-slot="select-group" {...props} />;
}

function SelectValue({
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value data-slot="select-value" {...props} />;
}

function SelectTrigger({
  children,
  className,
  size = "default",
  style,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & {
  size?: "default" | "sm";
}) {
  return (
    <SelectPrimitive.Trigger
      data-size={size}
      data-slot="select-trigger"
      {...props}
      {...mergeStylex(
        stylex.props(styles.trigger, size === "sm" && styles.triggerSm),
        className,
        style,
      )}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDownIcon size={16} style={{ opacity: 0.5 }} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  align = "center",
  children,
  className,
  position = "item-aligned",
  style,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        align={align}
        data-slot="select-content"
        position={position}
        {...props}
        {...mergeStylex(stylex.props(styles.content), className, style)}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport {...stylex.props(styles.viewport)}>
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectLabel({
  className,
  style,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Label>) {
  return (
    <SelectPrimitive.Label
      data-slot="select-label"
      {...props}
      {...mergeStylex(stylex.props(styles.label), className, style)}
    />
  );
}

function SelectItem({
  children,
  className,
  style,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      {...props}
      {...mergeStylex(stylex.props(styles.item), className, style)}
    >
      <span
        data-slot="select-item-indicator"
        {...stylex.props(styles.indicator)}
      >
        <SelectPrimitive.ItemIndicator>
          <CheckIcon size={16} />
        </SelectPrimitive.ItemIndicator>
      </span>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({
  className,
  style,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      {...props}
      {...mergeStylex(stylex.props(styles.separator), className, style)}
    />
  );
}

function SelectScrollUpButton({
  className,
  style,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpButton>) {
  return (
    <SelectPrimitive.ScrollUpButton
      data-slot="select-scroll-up-button"
      {...props}
      {...mergeStylex(stylex.props(styles.scrollButton), className, style)}
    >
      <ChevronUpIcon size={16} />
    </SelectPrimitive.ScrollUpButton>
  );
}

function SelectScrollDownButton({
  className,
  style,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownButton>) {
  return (
    <SelectPrimitive.ScrollDownButton
      data-slot="select-scroll-down-button"
      {...props}
      {...mergeStylex(stylex.props(styles.scrollButton), className, style)}
    >
      <ChevronDownIcon size={16} />
    </SelectPrimitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
