import { describe, expect, it, vi } from "vitest";

import {
  parseSiteAnalyticsEvent,
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
  it("accepts only the fixed contact-link event names", () => {
    expect(parseSiteAnalyticsEvent("email_clicked")).toBe("email_clicked");
    expect(parseSiteAnalyticsEvent("github_clicked")).toBe("github_clicked");
    expect(parseSiteAnalyticsEvent("twitter_clicked")).toBe("twitter_clicked");
    expect(parseSiteAnalyticsEvent("linkedin_clicked")).toBe(
      "linkedin_clicked",
    );
    expect(parseSiteAnalyticsEvent("account@example.com")).toBeUndefined();
    expect(parseSiteAnalyticsEvent("custom_event")).toBeUndefined();
    expect(parseSiteAnalyticsEvent(null)).toBeUndefined();
  });

  it("records the event and only the referrer origin", () => {
    const analytics = new MemorySiteAnalytics();

    recordSiteAnalyticsEvent(
      new Request("https://www.yusoofsh.id/api/analytics/events", {
        headers: {
          referer: "https://www.yusoofsh.id/?private=path",
        },
      }),
      "github_clicked",
      analytics,
    );

    expect(analytics.events).toEqual([
      {
        blobs: ["github_clicked", "https://www.yusoofsh.id"],
        doubles: [1],
        indexes: ["github_clicked"],
      },
    ]);
  });

  it("does not make analytics failures break the click path", () => {
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
        "email_clicked",
        analytics,
      ),
    ).not.toThrow();
    expect(consoleError).toHaveBeenCalledOnce();
    consoleError.mockRestore();
  });
});
