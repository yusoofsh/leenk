const SITE_ANALYTICS_EVENT_NAMES = [
  "bio_mode_changed",
  "bio_mode_viewed",
  "contact_link_clicked",
  "content_section_viewed",
  "error_page_viewed",
  "internal_link_clicked",
  "outbound_link_clicked",
  "scroll_depth_reached",
  "social_link_clicked",
  "shortlink_created",
  "shortlink_deleted",
  "static_file_deleted",
  "static_file_uploaded",
  "client_error",
  "time_on_page_reached",
] as const;

const SITE_ANALYTICS_LABEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

const SITE_ANALYTICS_DIMENSIONS: Partial<
  Record<SiteAnalyticsEvent, readonly string[]>
> = {
  bio_mode_changed: ["full", "tldr"],
  bio_mode_viewed: ["full", "tldr"],
  contact_link_clicked: ["email"],
  content_section_viewed: ["beyond_work", "selected_work", "what_i_do"],
  error_page_viewed: ["not_found"],
  internal_link_clicked: ["home"],
  outbound_link_clicked: ["electgo", "nadi", "ydsf"],
  scroll_depth_reached: ["25", "50", "75", "90"],
  social_link_clicked: ["github", "linkedin", "twitter"],
  shortlink_created: ["internal", "static"],
  static_file_uploaded: ["without_shortlink", "with_shortlink"],
  client_error: ["promise", "resource", "runtime"],
  time_on_page_reached: ["10", "30", "60"],
};

export type SiteAnalyticsEvent = (typeof SITE_ANALYTICS_EVENT_NAMES)[number];

export interface SiteAnalyticsEventPayload {
  dimension?: string;
  event: SiteAnalyticsEvent;
  label?: string;
}

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

export function parseSiteAnalyticsPayload(
  value: unknown,
): SiteAnalyticsEventPayload | undefined {
  if (!isObjectRecord(value)) return undefined;

  const event = parseSiteAnalyticsEvent(value.event);
  if (!event) return undefined;

  const dimension = value.dimension;
  const allowedDimensions = SITE_ANALYTICS_DIMENSIONS[event];
  if (!allowedDimensions) {
    return dimension === undefined ? { event } : undefined;
  }
  if (typeof dimension !== "string" || !allowedDimensions.includes(dimension)) {
    return undefined;
  }
  return { dimension, event };
}

export function recordSiteAnalyticsEvent(
  request: Request,
  payload: SiteAnalyticsEventPayload,
  analytics: SiteAnalytics,
): void {
  const referrerOrigin = safeReferrerOrigin(request.headers.get("referer"));
  try {
    analytics.writeDataPoint({
      blobs: [
        payload.event,
        payload.dimension ?? "",
        referrerOrigin,
        safeAnalyticsLabel(payload.label),
      ],
      doubles: [1],
      indexes: [payload.event],
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        event: "site_analytics_write_failed",
        message: "site analytics write failed",
        siteEvent: payload.event,
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

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
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

function safeAnalyticsLabel(value: string | undefined): string {
  return value && SITE_ANALYTICS_LABEL_PATTERN.test(value) ? value : "";
}
