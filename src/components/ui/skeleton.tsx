import * as stylex from "@stylexjs/stylex";

import { mergeStylex } from "~/lib/sx";
import { colors, radii } from "~/styles/tokens.stylex";

const styles = stylex.create({
  skeleton: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
  },
});

function Skeleton({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      {...props}
      {...mergeStylex(
        stylex.props(styles.skeleton),
        className ? `animate-pulse ${className}` : "animate-pulse",
        style,
      )}
    />
  );
}

export { Skeleton };
