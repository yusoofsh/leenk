import { describe, expect, it, vi } from "vitest";

import {
  parseSiteAnalyticsEvent,
  parseSiteAnalyticsPayload,
  recordSiteAnalyticsEvent,
  type SiteAnalytics,
} from "./site-analytics";

class MemorySiteAnalytics implements SiteAnalytics {
  readonly events: Array<{
    blobs?: string[];
    doubles?: number[];
    indexes?: string[];
  }> = [];

  writeDataPoint(event: {
    blobs?: string[];
    doubles?: number[];
    indexes?: string[];
  }): void {
    this.events.push(event);
  }
}

describe("site analytics", () => {
  it("accepts only the fixed event names", () => {
    expect(parseSiteAnalyticsEvent("social_link_clicked")).toBe(
      "social_link_clicked",
    );
    expect(parseSiteAnalyticsEvent("bio_mode_viewed")).toBe("bio_mode_viewed");
    expect(parseSiteAnalyticsEvent("github_clicked")).toBeUndefined();
    expect(parseSiteAnalyticsEvent("custom_event")).toBeUndefined();
    expect(parseSiteAnalyticsEvent("account@example.com")).toBeUndefined();
    expect(parseSiteAnalyticsEvent(null)).toBeUndefined();
  });

  it("accepts only bounded event dimensions", () => {
    expect(
      parseSiteAnalyticsPayload({
        dimension: "full",
        event: "bio_mode_changed",
      }),
    ).toEqual({ dimension: "full", event: "bio_mode_changed" });
    expect(
      parseSiteAnalyticsPayload({
        dimension: "github",
        event: "social_link_clicked",
      }),
    ).toEqual({ dimension: "github", event: "social_link_clicked" });
    expect(
      parseSiteAnalyticsPayload({
        dimension: "what_i_do",
        event: "content_section_viewed",
      }),
    ).toEqual({ dimension: "what_i_do", event: "content_section_viewed" });
    expect(
      parseSiteAnalyticsPayload({
        dimension: "75",
        event: "scroll_depth_reached",
      }),
    ).toEqual({ dimension: "75", event: "scroll_depth_reached" });
    expect(
      parseSiteAnalyticsPayload({
        dimension: "https://private.example/path",
        event: "social_link_clicked",
      }),
    ).toBeUndefined();
    expect(
      parseSiteAnalyticsPayload({
        dimension: "unknown",
        event: "bio_mode_viewed",
      }),
    ).toBeUndefined();
    expect(
      parseSiteAnalyticsPayload({
        dimension: "full",
        event: "contact_link_clicked",
      }),
    ).toBeUndefined();
  });

  it("records the event, dimension, and only the referrer origin", () => {
    const analytics = new MemorySiteAnalytics();

    recordSiteAnalyticsEvent(
      new Request("https://www.yusoofsh.id/api/analytics/events", {
        headers: {
          referer: "https://www.yusoofsh.id/?private=path",
        },
      }),
      { dimension: "github", event: "social_link_clicked" },
      analytics,
    );

    expect(analytics.events).toEqual([
      {
        blobs: ["social_link_clicked", "github", "https://www.yusoofsh.id"],
        doubles: [1],
        indexes: ["social_link_clicked"],
      },
    ]);
  });

  it("does not make analytics failures break the event path", () => {
    const analytics: SiteAnalytics = {
      writeDataPoint: () => {
        throw new Error("analytics unavailable");
      },
    };
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() =>
      recordSiteAnalyticsEvent(
        new Request("https://www.yusoofsh.id/api/analytics/events"),
        { event: "contact_link_clicked", dimension: "email" },
        analytics,
      ),
    ).not.toThrow();
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
