import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

import { mq } from "~/styles/breakpoints.stylex";
import { colors } from "~/styles/tokens.stylex";

const styles = stylex.create({
  heading: {
    fontSize: {
      default: "1.875rem",
      [mq.md]: "2.25rem",
      [mq.lg]: "3rem",
      [mq.xl]: "3.75rem",
    },
    fontWeight: 700,
    letterSpacing: "-0.025em",
    marginBottom: {
      default: "2.5rem",
      [mq.sm]: "2.75rem",
      [mq.md]: "3rem",
      [mq.lg]: "3.5rem",
    },
    textAlign: "left",
  },
  heading404: {
    fontSize: {
      default: "1.5rem",
      [mq.sm]: "1.875rem",
      [mq.md]: "2.25rem",
      [mq.lg]: "3rem",
      [mq.xl]: "3.75rem",
    },
    fontWeight: 700,
    textAlign: "left",
  },
  mode: {
    fontSize: {
      default: "0.9375rem",
      [mq.sm]: "1rem",
      [mq.md]: "1.125rem",
      [mq.lg]: "1.25rem",
      [mq.xl]: "1.125rem",
    },
    marginTop: {
      default: "1.25rem",
      [mq.sm]: "1.5rem",
    },
  },
  root: {
    color: colors.foreground,
    fontWeight: 400,
    marginBlock: {
      default: "1.5rem",
      [mq.md]: "2rem",
      [mq.lg]: "5rem",
      [mq.xl]: "4rem",
    },
    marginInline: "auto",
    maxWidth: {
      default: "65ch",
      [mq.sm]: "42rem",
      [mq.md]: "48rem",
      [mq.lg]: "56rem",
      [mq.xl]: "56rem",
    },
    paddingInline: {
      default: "1.5rem",
      [mq.sm]: "2rem",
      [mq.lg]: "1.5rem",
      [mq.xl]: "1rem",
    },
    position: "relative",
    textAlign: "left",
    width: "100%",
    zIndex: 10,
  },
  root404: {
    maxWidth: {
      default: "65ch",
      [mq.sm]: "42rem",
      [mq.md]: "48rem",
      [mq.lg]: "56rem",
      [mq.xl]: "72rem",
    },
  },
  switchRow: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: "0.25rem",
  },
  titleWrap: {
    display: "flex",
    flexDirection: "column",
  },
});

export function ReadingSurface({
  children,
  variant = "home",
}: {
  children: ReactNode;
  variant?: "home" | "not-found";
}) {
  return (
    <div
      data-reading-surface
      {...stylex.props(styles.root, variant === "not-found" && styles.root404)}
    >
      {children}
    </div>
  );
}

export function HomeTitle({ children }: { children: ReactNode }) {
  return <h1 {...stylex.props(styles.heading)}>{children}</h1>;
}

export function HomeTitleWrap({ children }: { children: ReactNode }) {
  return <div {...stylex.props(styles.titleWrap)}>{children}</div>;
}

export function BioSwitchRow({ children }: { children: ReactNode }) {
  return <div {...stylex.props(styles.switchRow)}>{children}</div>;
}

export function BioMode({
  children,
  mode,
}: {
  children: ReactNode;
  mode: "full" | "tldr";
}) {
  return (
    <div data-mode={mode} {...stylex.props(styles.mode)}>
      {children}
    </div>
  );
}

export function NotFoundHeading({ children }: { children: ReactNode }) {
  return <h1 {...stylex.props(styles.heading404)}>{children}</h1>;
}
