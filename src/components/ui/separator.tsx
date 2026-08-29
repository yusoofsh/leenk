import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { Separator as SeparatorPrimitive } from "radix-ui";

import { mergeStylex } from "~/lib/sx";
import { colors } from "~/styles/tokens.stylex";

const styles = stylex.create({
  horizontal: {
    height: "1px",
    width: "100%",
  },
  root: {
    backgroundColor: colors.border,
    flexShrink: 0,
  },
  vertical: {
    height: "100%",
    width: "1px",
  },
});

function Separator({
  className,
  decorative = true,
  orientation = "horizontal",
  style,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      {...props}
      {...mergeStylex(
        stylex.props(
          styles.root,
          orientation === "vertical" ? styles.vertical : styles.horizontal,
        ),
        className,
        style,
      )}
    />
  );
}

export { Separator };
