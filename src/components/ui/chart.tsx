/* oxlint-disable */
import * as React from "react";
import * as RechartsPrimitive from "recharts";
import type { TooltipValueType } from "recharts";

import * as stylex from "@stylexjs/stylex";

import { mergeStylex } from "~/lib/sx";
import { colors, radii } from "~/styles/tokens.stylex";

// Format: { THEME_NAME: CSS_SELECTOR }
const THEMES = { light: "", dark: ".dark" } as const;

const chartStyles = stylex.create({
  container: {
    aspectRatio: "16 / 9",
    display: "flex",
    fontSize: "0.75rem",
    justifyContent: "center",
  },
  indicatorDot: {
    backgroundColor: "var(--color-bg)",
    borderColor: "var(--color-border)",
    borderRadius: "2px",
    flexShrink: 0,
    height: "0.625rem",
    width: "0.625rem",
  },
  indicatorLine: {
    backgroundColor: "var(--color-bg)",
    borderColor: "var(--color-border)",
    borderRadius: "2px",
    flexShrink: 0,
    width: "0.25rem",
  },
  label: {
    fontWeight: 500,
  },
  legend: {
    alignItems: "center",
    display: "flex",
    gap: "1rem",
    justifyContent: "center",
  },
  legendItem: {
    alignItems: "center",
    display: "flex",
    gap: "0.375rem",
  },
  legendSwatch: {
    borderRadius: "2px",
    flexShrink: 0,
    height: "0.5rem",
    width: "0.5rem",
  },
  legendTop: {
    paddingBottom: "0.75rem",
  },
  legendBottom: {
    paddingTop: "0.75rem",
  },
  muted: {
    color: colors.mutedForeground,
  },
  row: {
    alignItems: "stretch",
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    width: "100%",
  },
  rowDot: {
    alignItems: "center",
  },
  stack: {
    display: "grid",
    gap: "0.375rem",
  },
  tooltip: {
    backgroundColor: colors.background,
    borderColor: "color-mix(in oklab, var(--border) 50%, transparent)",
    borderRadius: radii.lg,
    borderWidth: 1,
    boxShadow: "0 20px 25px rgb(0 0 0 / 10%)",
    display: "grid",
    fontSize: "0.75rem",
    gap: "0.375rem",
    minWidth: "8rem",
    paddingBlock: "0.375rem",
    paddingInline: "0.625rem",
  },
  value: {
    color: colors.foreground,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontVariantNumeric: "tabular-nums",
    fontWeight: 500,
  },
  valueRow: {
    display: "flex",
    flex: 1,
    justifyContent: "space-between",
    lineHeight: 1,
  },
  valueRowCenter: {
    alignItems: "center",
  },
  valueRowEnd: {
    alignItems: "flex-end",
  },
});

const INITIAL_DIMENSION = { width: 320, height: 200 } as const;
type TooltipNameType = number | string;

export type ChartConfig = Record<
  string,
  {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  )
>;

type ChartContextProps = {
  config: ChartConfig;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }

  return context;
}

function ChartContainer({
  id,
  className,
  children,
  config,
  initialDimension = INITIAL_DIMENSION,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"];
  initialDimension?: {
    width: number;
    height: number;
  };
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        {...mergeStylex(stylex.props(chartStyles.container), className)}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer
          initialDimension={initialDimension}
        >
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
}

const ChartStyle = ({ id, config }: { id: string; config: ChartConfig }) => {
  const colorConfig = Object.entries(config).filter(
    ([, config]) => config.theme ?? config.color,
  );

  if (!colorConfig.length) {
    return null;
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: Object.entries(THEMES)
          .map(
            ([theme, prefix]) => `
${prefix} [data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => {
    const color =
      itemConfig.theme?.[theme as keyof typeof itemConfig.theme] ??
      itemConfig.color;
    return color ? `  --color-${key}: ${color};` : null;
  })
  .join("\n")}
}
`,
          )
          .join("\n"),
      }}
    />
  );
};

const ChartTooltip = RechartsPrimitive.Tooltip;

function ChartTooltipContent({
  active,
  payload,
  className,
  indicator = "dot",
  hideLabel = false,
  hideIndicator = false,
  label,
  labelFormatter,
  labelClassName,
  formatter,
  color,
  nameKey,
  labelKey,
}: React.ComponentProps<typeof RechartsPrimitive.Tooltip> &
  React.ComponentProps<"div"> & {
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
  } & Omit<
    RechartsPrimitive.DefaultTooltipContentProps<
      TooltipValueType,
      TooltipNameType
    >,
    "accessibilityLayer"
  >) {
  const { config } = useChart();

  const tooltipLabel = React.useMemo(() => {
    if (hideLabel || !payload?.length) {
      return null;
    }

    const [item] = payload;
    const key = `${labelKey ?? item?.dataKey ?? item?.name ?? "value"}`;
    const itemConfig = getPayloadConfigFromPayload(config, item, key);
    const value =
      !labelKey && typeof label === "string"
        ? (config[label]?.label ?? label)
        : itemConfig?.label;

    if (labelFormatter) {
      return (
        <div {...mergeStylex(stylex.props(chartStyles.label), labelClassName)}>
          {labelFormatter(value, payload)}
        </div>
      );
    }

    if (!value) {
      return null;
    }

    return (
      <div {...mergeStylex(stylex.props(chartStyles.label), labelClassName)}>
        {value}
      </div>
    );
  }, [
    label,
    labelFormatter,
    payload,
    hideLabel,
    labelClassName,
    config,
    labelKey,
  ]);

  if (!active || !payload?.length) {
    return null;
  }

  const nestLabel = payload.length === 1 && indicator !== "dot";

  return (
    <div {...mergeStylex(stylex.props(chartStyles.tooltip), className)}>
      {!nestLabel ? tooltipLabel : null}
      <div {...stylex.props(chartStyles.stack)}>
        {payload
          .filter((item) => item.type !== "none")
          .map((item, index) => {
            const key = `${nameKey ?? item.name ?? item.dataKey ?? "value"}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);
            const indicatorColor = color ?? item.payload?.fill ?? item.color;

            return (
              <div
                key={index}
                {...stylex.props(
                  chartStyles.row,
                  indicator === "dot" && chartStyles.rowDot,
                )}
              >
                {formatter && item?.value !== undefined && item.name ? (
                  formatter(item.value, item.name, item, index, item.payload)
                ) : (
                  <>
                    {itemConfig?.icon ? (
                      <itemConfig.icon />
                    ) : (
                      !hideIndicator && (
                        <div
                          {...stylex.props(
                            indicator === "line"
                              ? chartStyles.indicatorLine
                              : chartStyles.indicatorDot,
                          )}
                          style={
                            {
                              "--color-bg": indicatorColor,
                              "--color-border": indicatorColor,
                            } as React.CSSProperties
                          }
                        />
                      )
                    )}
                    <div
                      {...stylex.props(
                        chartStyles.valueRow,
                        nestLabel
                          ? chartStyles.valueRowEnd
                          : chartStyles.valueRowCenter,
                      )}
                    >
                      <div {...stylex.props(chartStyles.stack)}>
                        {nestLabel ? tooltipLabel : null}
                        <span {...stylex.props(chartStyles.muted)}>
                          {itemConfig?.label ?? item.name}
                        </span>
                      </div>
                      {item.value != null && (
                        <span {...stylex.props(chartStyles.value)}>
                          {typeof item.value === "number"
                            ? item.value.toLocaleString()
                            : String(item.value)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

const ChartLegend = RechartsPrimitive.Legend;

function ChartLegendContent({
  className,
  hideIcon = false,
  payload,
  verticalAlign = "bottom",
  nameKey,
}: React.ComponentProps<"div"> & {
  hideIcon?: boolean;
  nameKey?: string;
} & RechartsPrimitive.DefaultLegendContentProps) {
  const { config } = useChart();

  if (!payload?.length) {
    return null;
  }

  return (
    <div
      {...mergeStylex(
        stylex.props(
          chartStyles.legend,
          verticalAlign === "top"
            ? chartStyles.legendTop
            : chartStyles.legendBottom,
        ),
        className,
      )}
    >
      {payload
        .filter((item) => item.type !== "none")
        .map((item, index) => {
          const key = `${nameKey ?? item.dataKey ?? "value"}`;
          const itemConfig = getPayloadConfigFromPayload(config, item, key);

          return (
            <div key={index} {...stylex.props(chartStyles.legendItem)}>
              {itemConfig?.icon && !hideIcon ? (
                <itemConfig.icon />
              ) : (
                <div
                  {...stylex.props(chartStyles.legendSwatch)}
                  style={{
                    backgroundColor: item.color,
                  }}
                />
              )}
              {itemConfig?.label}
            </div>
          );
        })}
    </div>
  );
}

// Helper to extract item config from a payload.
function getPayloadConfigFromPayload(
  config: ChartConfig,
  payload: unknown,
  key: string,
) {
  if (typeof payload !== "object" || payload === null) {
    return undefined;
  }

  const payloadPayload =
    "payload" in payload &&
    typeof payload.payload === "object" &&
    payload.payload !== null
      ? payload.payload
      : undefined;

  let configLabelKey: string = key;

  if (
    key in payload &&
    typeof payload[key as keyof typeof payload] === "string"
  ) {
    configLabelKey = payload[key as keyof typeof payload] as string;
  } else if (
    payloadPayload &&
    key in payloadPayload &&
    typeof payloadPayload[key as keyof typeof payloadPayload] === "string"
  ) {
    configLabelKey = payloadPayload[
      key as keyof typeof payloadPayload
    ] as string;
  }

  return configLabelKey in config ? config[configLabelKey] : config[key];
}

export {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  ChartStyle,
};
