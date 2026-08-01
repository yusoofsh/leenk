import type {
  ShortlinkAnalytics,
  ShortlinkAnalyticsDataPoint,
} from "./shortlinks";

interface AnalyticsBinding {
  writeDataPoint(event: ShortlinkAnalyticsDataPoint): void;
}

export function getShortlinkAnalytics(
  value: unknown,
): ShortlinkAnalytics | undefined {
  if (!isAnalyticsBinding(value)) return undefined;
  return {
    writeDataPoint(event) {
      value.writeDataPoint(event);
    },
  };
}

function isAnalyticsBinding(value: unknown): value is AnalyticsBinding {
  return (
    typeof value === "object" &&
    value !== null &&
    "writeDataPoint" in value &&
    typeof value.writeDataPoint === "function"
  );
}
