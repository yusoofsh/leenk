import * as React from "react";
import * as stylex from "@stylexjs/stylex";
import { ChevronRight, MoreHorizontal } from "lucide-react";
import { Slot } from "radix-ui";

import { mergeStylex } from "~/lib/sx";
import { mq } from "~/styles/breakpoints.stylex";
import { colors } from "~/styles/tokens.stylex";

const styles = stylex.create({
  ellipsis: {
    alignItems: "center",
    display: "flex",
    height: "2.25rem",
    justifyContent: "center",
    width: "2.25rem",
  },
  item: {
    alignItems: "center",
    display: "inline-flex",
    gap: "0.375rem",
  },
  link: {
    transitionDuration: "150ms",
    transitionProperty: "color",
    ":hover": {
      color: colors.foreground,
    },
  },
  list: {
    alignItems: "center",
    color: colors.mutedForeground,
    display: "flex",
    flexWrap: "wrap",
    fontSize: "0.875rem",
    gap: {
      default: "0.375rem",
      [mq.sm]: "0.625rem",
    },
    overflowWrap: "break-word",
  },
  page: {
    color: colors.foreground,
    fontWeight: 400,
  },
});

function Breadcrumb({ ...props }: React.ComponentProps<"nav">) {
  return <nav aria-label="breadcrumb" data-slot="breadcrumb" {...props} />;
}

function BreadcrumbList({
  className,
  style,
  ...props
}: React.ComponentProps<"ol">) {
  return (
    <ol
      data-slot="breadcrumb-list"
      {...props}
      {...mergeStylex(stylex.props(styles.list), className, style)}
    />
  );
}

function BreadcrumbItem({
  className,
  style,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      data-slot="breadcrumb-item"
      {...props}
      {...mergeStylex(stylex.props(styles.item), className, style)}
    />
  );
}

function BreadcrumbLink({
  asChild,
  className,
  style,
  ...props
}: React.ComponentProps<"a"> & {
  asChild?: boolean;
}) {
  const Comp = asChild ? Slot.Root : "a";

  return (
    <Comp
      data-slot="breadcrumb-link"
      {...props}
      {...mergeStylex(stylex.props(styles.link), className, style)}
    />
  );
}

function BreadcrumbPage({
  className,
  style,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-current="page"
      aria-disabled="true"
      data-slot="breadcrumb-page"
      {...props}
      {...mergeStylex(stylex.props(styles.page), className, style)}
    />
  );
}

function BreadcrumbSeparator({
  children,
  className,
  style,
  ...props
}: React.ComponentProps<"li">) {
  return (
    <li
      aria-hidden="true"
      data-slot="breadcrumb-separator"
      role="presentation"
      {...props}
      {...mergeStylex(stylex.props(), className, style)}
    >
      {children ?? <ChevronRight size={14} />}
    </li>
  );
}

function BreadcrumbEllipsis({
  className,
  style,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden="true"
      data-slot="breadcrumb-ellipsis"
      role="presentation"
      {...props}
      {...mergeStylex(stylex.props(styles.ellipsis), className, style)}
    >
      <MoreHorizontal size={16} />
      <span className="sr-only">More</span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
};
