import * as React from "react";
import * as stylex from "@stylexjs/stylex";

import { mergeStylex } from "~/lib/sx";
import { colors, radii } from "~/styles/tokens.stylex";

const styles = stylex.create({
  action: {
    alignSelf: "start",
    gridColumnStart: 2,
    gridRow: "1 / span 2",
    justifySelf: "end",
  },
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    boxShadow: "0 1px 2px rgb(0 0 0 / 5%)",
    color: colors.cardForeground,
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
    paddingBlock: "1.5rem",
  },
  content: {
    paddingInline: "1.5rem",
  },
  description: {
    color: colors.mutedForeground,
    fontSize: "0.875rem",
  },
  footer: {
    alignItems: "center",
    display: "flex",
    paddingInline: "1.5rem",
  },
  header: {
    alignItems: "start",
    display: "grid",
    gap: "0.5rem",
    paddingInline: "1.5rem",
  },
  title: {
    fontWeight: 600,
    lineHeight: 1,
  },
});

function Card({ className, style, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      {...props}
      {...mergeStylex(stylex.props(styles.card), className, style)}
    />
  );
}

function CardHeader({
  className,
  style,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      {...props}
      {...mergeStylex(stylex.props(styles.header), className, style)}
    />
  );
}

function CardTitle({
  className,
  style,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      {...props}
      {...mergeStylex(stylex.props(styles.title), className, style)}
    />
  );
}

function CardDescription({
  className,
  style,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      {...props}
      {...mergeStylex(stylex.props(styles.description), className, style)}
    />
  );
}

function CardAction({
  className,
  style,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      {...props}
      {...mergeStylex(stylex.props(styles.action), className, style)}
    />
  );
}

function CardContent({
  className,
  style,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      {...props}
      {...mergeStylex(stylex.props(styles.content), className, style)}
    />
  );
}

function CardFooter({
  className,
  style,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      {...props}
      {...mergeStylex(stylex.props(styles.footer), className, style)}
    />
  );
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
