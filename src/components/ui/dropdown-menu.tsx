import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui";

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
    maxHeight: "var(--radix-dropdown-menu-content-available-height)",
    minWidth: "8rem",
    overflowX: "hidden",
    overflowY: "auto",
    padding: "0.25rem",
    zIndex: 50,
  },
  indicator: {
    alignItems: "center",
    display: "flex",
    height: "0.875rem",
    justifyContent: "center",
    left: "0.5rem",
    pointerEvents: "none",
    position: "absolute",
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
    paddingInline: "0.5rem",
    position: "relative",
    userSelect: "none",
    ":focus": {
      backgroundColor: colors.accent,
      color: colors.accentForeground,
    },
  },
  itemCheckbox: {
    paddingLeft: "2rem",
    paddingRight: "0.5rem",
  },
  itemDestructive: {
    color: colors.destructive,
  },
  label: {
    fontSize: "0.875rem",
    fontWeight: 500,
    paddingBlock: "0.375rem",
    paddingInline: "0.5rem",
  },
  separator: {
    backgroundColor: colors.border,
    height: "1px",
    marginBlock: "0.25rem",
    marginInline: "-0.25rem",
  },
  shortcut: {
    color: colors.mutedForeground,
    fontSize: "0.75rem",
    letterSpacing: "0.1em",
    marginLeft: "auto",
  },
  subContent: {
    backgroundColor: colors.popover,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    boxShadow: "0 10px 15px rgb(0 0 0 / 10%)",
    color: colors.popoverForeground,
    minWidth: "8rem",
    overflow: "hidden",
    padding: "0.25rem",
    zIndex: 50,
  },
  subTrigger: {
    alignItems: "center",
    borderRadius: radii.sm,
    cursor: "default",
    display: "flex",
    fontSize: "0.875rem",
    gap: "0.5rem",
    outline: "none",
    paddingBlock: "0.375rem",
    paddingInline: "0.5rem",
    userSelect: "none",
    ":focus": {
      backgroundColor: colors.accent,
      color: colors.accentForeground,
    },
  },
});

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return (
    <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
  );
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return (
    <DropdownMenuPrimitive.Trigger
      data-slot="dropdown-menu-trigger"
      {...props}
    />
  );
}

function DropdownMenuContent({
  className,
  sideOffset = 4,
  style,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        {...props}
        {...mergeStylex(stylex.props(styles.content), className, style)}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return (
    <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
  );
}

function DropdownMenuItem({
  className,
  inset,
  style,
  variant = "default",
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  inset?: boolean;
  variant?: "default" | "destructive";
}) {
  return (
    <DropdownMenuPrimitive.Item
      data-inset={inset}
      data-slot="dropdown-menu-item"
      data-variant={variant}
      {...props}
      {...mergeStylex(
        stylex.props(
          styles.item,
          variant === "destructive" && styles.itemDestructive,
        ),
        className,
        style,
      )}
    />
  );
}

function DropdownMenuCheckboxItem({
  checked,
  children,
  className,
  style,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      {...(checked === undefined ? {} : { checked })}
      {...props}
      {...mergeStylex(
        stylex.props(styles.item, styles.itemCheckbox),
        className,
        style,
      )}
    >
      <span {...stylex.props(styles.indicator)}>
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon size={16} />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return (
    <DropdownMenuPrimitive.RadioGroup
      data-slot="dropdown-menu-radio-group"
      {...props}
    />
  );
}

function DropdownMenuRadioItem({
  children,
  className,
  style,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      {...props}
      {...mergeStylex(
        stylex.props(styles.item, styles.itemCheckbox),
        className,
        style,
      )}
    >
      <span {...stylex.props(styles.indicator)}>
        <DropdownMenuPrimitive.ItemIndicator>
          <CircleIcon size={8} />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  style,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Label> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.Label
      data-inset={inset}
      data-slot="dropdown-menu-label"
      {...props}
      {...mergeStylex(stylex.props(styles.label), className, style)}
    />
  );
}

function DropdownMenuSeparator({
  className,
  style,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      {...props}
      {...mergeStylex(stylex.props(styles.separator), className, style)}
    />
  );
}

function DropdownMenuShortcut({
  className,
  style,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      {...props}
      {...mergeStylex(stylex.props(styles.shortcut), className, style)}
    />
  );
}

function DropdownMenuSub({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

function DropdownMenuSubTrigger({
  children,
  className,
  inset,
  style,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubTrigger> & {
  inset?: boolean;
}) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-inset={inset}
      data-slot="dropdown-menu-sub-trigger"
      {...props}
      {...mergeStylex(stylex.props(styles.subTrigger), className, style)}
    >
      {children}
      <ChevronRightIcon size={16} style={{ marginLeft: "auto" }} />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  style,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.SubContent
      data-slot="dropdown-menu-sub-content"
      {...props}
      {...mergeStylex(stylex.props(styles.subContent), className, style)}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
