import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { Label as LabelPrimitive } from "radix-ui";

import { mergeStylex } from "~/lib/sx";

const styles = stylex.create({
  label: {
    alignItems: "center",
    display: "flex",
    fontSize: "0.875rem",
    fontWeight: 500,
    gap: "0.5rem",
    lineHeight: 1,
    userSelect: "none",
  },
});

function Label({
  className,
  style,
  ...props
}: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      {...props}
      {...mergeStylex(stylex.props(styles.label), className, style)}
    />
  );
}

export { Label };
