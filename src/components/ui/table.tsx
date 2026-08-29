import * as React from "react";
import * as stylex from "@stylexjs/stylex";

import { mergeStylex } from "~/lib/sx";
import { colors } from "~/styles/tokens.stylex";

const styles = stylex.create({
  body: {},
  caption: {
    color: colors.mutedForeground,
    fontSize: "0.875rem",
    marginTop: "1rem",
  },
  cell: {
    padding: "0.5rem",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  },
  container: {
    overflowX: "auto",
    position: "relative",
    width: "100%",
  },
  footer: {
    backgroundColor: "color-mix(in oklab, var(--muted) 50%, transparent)",
    borderTopWidth: 1,
    fontWeight: 500,
  },
  head: {
    color: colors.foreground,
    fontWeight: 500,
    height: "2.5rem",
    paddingInline: "0.5rem",
    textAlign: "left",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  },
  header: {},
  row: {
    borderBottomWidth: 1,
    transitionDuration: "150ms",
    transitionProperty: "background-color",
    ":hover": {
      backgroundColor: "color-mix(in oklab, var(--muted) 50%, transparent)",
    },
  },
  table: {
    captionSide: "bottom",
    fontSize: "0.875rem",
    width: "100%",
  },
});

function Table({ className, style, ...props }: React.ComponentProps<"table">) {
  return (
    <div data-slot="table-container" {...stylex.props(styles.container)}>
      <table
        data-slot="table"
        {...props}
        {...mergeStylex(stylex.props(styles.table), className, style)}
      />
    </div>
  );
}

function TableHeader({
  className,
  style,
  ...props
}: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      {...props}
      {...mergeStylex(stylex.props(styles.header), className, style)}
    />
  );
}

function TableBody({
  className,
  style,
  ...props
}: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      {...props}
      {...mergeStylex(stylex.props(styles.body), className, style)}
    />
  );
}

function TableFooter({
  className,
  style,
  ...props
}: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      {...props}
      {...mergeStylex(stylex.props(styles.footer), className, style)}
    />
  );
}

function TableRow({ className, style, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      {...props}
      {...mergeStylex(stylex.props(styles.row), className, style)}
    />
  );
}

function TableHead({ className, style, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      {...props}
      {...mergeStylex(stylex.props(styles.head), className, style)}
    />
  );
}

function TableCell({ className, style, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      {...props}
      {...mergeStylex(stylex.props(styles.cell), className, style)}
    />
  );
}

function TableCaption({
  className,
  style,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      {...props}
      {...mergeStylex(stylex.props(styles.caption), className, style)}
    />
  );
}

export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
};
