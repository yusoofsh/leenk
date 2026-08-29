import * as stylex from "@stylexjs/stylex";

import { mq } from "~/styles/breakpoints.stylex";

const styles = stylex.create({
  button: {
    alignItems: "center",
    backgroundColor: {
      default: "white",
      ":hover": "#f8fafc",
      ":is(.dark *)": "#1e293b",
    },
    borderRadius: "9999px",
    boxShadow: "0 1px 2px rgb(15 23 42 / 12%)",
    color: {
      default: "#1e293b",
      ":is(.dark *)": "#f1f5f9",
    },
    display: "inline-flex",
    fontSize: {
      default: "0.5rem",
      [mq.sm]: "0.6rem",
      [mq.md]: "0.75rem",
    },
    fontWeight: 600,
    justifyContent: "center",
    letterSpacing: {
      default: "0.25em",
      [mq.sm]: "0.3em",
    },
    minHeight: "1.5rem",
    minWidth: "1.5rem",
    paddingBlock: "0.25rem",
    paddingInline: {
      default: "0.625rem",
      [mq.sm]: "0.75rem",
    },
    position: "relative",
    textTransform: "uppercase",
    transform: {
      default: "none",
      ":active": "scale(0.97)",
      [mq.reduce]: "none",
    },
    transitionDuration: "150ms",
    transitionProperty: "color, background-color, box-shadow, transform",
    transitionTimingFunction: "cubic-bezier(0.23, 1, 0.32, 1)",
    ":focus-visible": {
      outlineColor: "#64748b",
      outlineOffset: "2px",
      outlineStyle: "solid",
      outlineWidth: "2px",
    },
  },
  label: {
    fontSize: {
      default: "0.5rem",
      [mq.sm]: "0.6rem",
      [mq.md]: "0.75rem",
    },
    fontWeight: 600,
    letterSpacing: {
      default: "0.25em",
      [mq.sm]: "0.3em",
    },
    paddingLeft: {
      default: "0.375rem",
      [mq.sm]: "0.5rem",
    },
  },
  root: {
    alignItems: "center",
    backgroundColor: {
      default: "#f1f5f9",
      ":is(.dark *)": "rgb(15 23 42 / 70%)",
    },
    borderRadius: "9999px",
    boxShadow: {
      default: "inset 0 1px 2px rgb(15 23 42 / 8%), 0 0 0 1px #e2e8f0",
      ":is(.dark *)": "inset 0 1px 2px rgb(15 23 42 / 8%), 0 0 0 1px #334155",
    },
    color: {
      default: "#475569",
      ":is(.dark *)": "#cbd5e1",
    },
    display: "flex",
    gap: {
      default: "0.25rem",
      [mq.sm]: "0.5rem",
    },
    padding: "0.25rem",
    textTransform: "uppercase",
  },
});

type PreferenceControlProps = {
  buttonLabel: string;
  dataSlot: string;
  label: string;
  onToggle: () => void;
  pressed: boolean;
  value: string;
};

export function PreferenceControl({
  buttonLabel,
  dataSlot,
  label,
  onToggle,
  pressed,
  value,
}: PreferenceControlProps) {
  return (
    <div {...stylex.props(styles.root)}>
      <span {...stylex.props(styles.label)}>{label}</span>
      <button
        aria-label={buttonLabel}
        aria-pressed={pressed}
        data-slot={dataSlot}
        onClick={onToggle}
        type="button"
        {...stylex.props(styles.button)}
      >
        {value}
      </button>
    </div>
  );
}
