import * as stylex from "@stylexjs/stylex";

import { mq } from "~/styles/breakpoints.stylex";
import { colors } from "~/styles/tokens.stylex";

export const dashboard = stylex.create({
  actions: {
    display: "flex",
    gap: "0.5rem",
  },
  caption: {
    color: colors.mutedForeground,
    fontSize: "0.75rem",
    margin: 0,
  },
  cellMuted: {
    color: colors.mutedForeground,
  },
  cellNumeric: {
    fontVariantNumeric: "tabular-nums",
  },
  cellRight: {
    textAlign: "right",
  },
  cellTruncate: {
    maxWidth: "12rem",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  chart: {
    height: "16rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  flush: {
    padding: 0,
  },
  headerRow: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: "0.75rem",
    justifyContent: "space-between",
  },
  metric: {
    fontSize: "1.5rem",
    fontWeight: 600,
    margin: 0,
    fontVariantNumeric: "tabular-nums",
  },
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  stack: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  statGrid: {
    display: "grid",
    gap: "1rem",
    gridTemplateColumns: {
      [mq.sm]: "repeat(2, minmax(0, 1fr))",
      [mq.xl]: "repeat(4, minmax(0, 1fr))",
    },
  },
  subtitle: {
    color: colors.mutedForeground,
    fontSize: "0.875rem",
    margin: 0,
  },
  title: {
    fontSize: "1.25rem",
    fontWeight: 600,
    margin: 0,
  },
  wrap: {
    alignItems: "center",
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
  },
});
