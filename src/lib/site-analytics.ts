const SITE_ANALYTICS_EVENT_NAMES = [
  "email_clicked",
  "github_clicked",
  "linkedin_clicked",
  "twitter_clicked",
] as const;

export type SiteAnalyticsEvent = (typeof SITE_ANALYTICS_EVENT_NAMES)[number];
export const MAX_SITE_ANALYTICS_REQUEST_BYTES = 512;

export interface SiteAnalyticsDataPoint {
  blobs?: string[];
  doubles?: number[];
  indexes?: string[];
}

export interface SiteAnalytics {
  writeDataPoint(event: SiteAnalyticsDataPoint): void;
}

export function getSiteAnalytics(value: unknown): SiteAnalytics | undefined {
  if (!isAnalyticsBinding(value)) return undefined;
  return {
    writeDataPoint(event) {
      value.writeDataPoint(event);
    },
  };
}

export function parseSiteAnalyticsEvent(
  value: unknown,
): SiteAnalyticsEvent | undefined {
  return typeof value === "string" && isSiteAnalyticsEvent(value)
    ? value
    : undefined;
}

export function recordSiteAnalyticsEvent(
  request: Request,
  event: SiteAnalyticsEvent,
  analytics: SiteAnalytics,
): void {
  const referrerOrigin = safeReferrerOrigin(request.headers.get("referer"));
  try {
    analytics.writeDataPoint({
      blobs: [event, referrerOrigin],
      doubles: [1],
      indexes: [event],
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        event: "site_analytics_write_failed",
        message: "site analytics write failed",
        siteEvent: event,
      }),
    );
  }
}

function isSiteAnalyticsEvent(value: string): value is SiteAnalyticsEvent {
  return (SITE_ANALYTICS_EVENT_NAMES as readonly string[]).includes(value);
}

function isAnalyticsBinding(value: unknown): value is SiteAnalytics {
  return (
    typeof value === "object" &&
    value !== null &&
    "writeDataPoint" in value &&
    typeof value.writeDataPoint === "function"
  );
}

function safeReferrerOrigin(value: string | null): string {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.origin
      : "";
  } catch {
    return "";
  }
}
