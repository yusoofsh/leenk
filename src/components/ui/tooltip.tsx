import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { mergeStylex } from "~/lib/sx";
import { colors, radii } from "~/styles/tokens.stylex";

const styles = stylex.create({
  arrow: {
    backgroundColor: colors.foreground,
    fill: colors.foreground,
    height: "0.625rem",
    transform: "translateY(calc(-50% - 2px)) rotate(45deg)",
    width: "0.625rem",
    zIndex: 50,
  },
  content: {
    backgroundColor: colors.foreground,
    borderRadius: radii.md,
    color: colors.background,
    fontSize: "0.75rem",
    paddingBlock: "0.375rem",
    paddingInline: "0.75rem",
    width: "fit-content",
    zIndex: 50,
  },
});

function TooltipProvider({
  delayDuration = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  children,
  className,
  sideOffset = 0,
  style,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        {...props}
        {...mergeStylex(stylex.props(styles.content), className, style)}
      >
        {children}
        <TooltipPrimitive.Arrow {...stylex.props(styles.arrow)} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
