import { describe, expect, it, vi } from "vitest";

import {
  AnalyticsEngineError,
  analyticsEngineSqlUrl,
  parseAnalyticsEngineResponse,
  parseIsoDate,
  runAnalyticsQuery,
  shortlinkCampaignQuery,
  shortlinkClicksQuery,
  shortlinkHistoryQuery,
  siteEventsQuery,
  sumWeighted,
  toDateTimeLiteral,
  toNumber,
  toUtcDateString,
  validateDashboardRange,
} from "./analytics-engine";

describe("analytics engine SQL URL", () => {
  it("builds the account-scoped SQL endpoint", () => {
    expect(analyticsEngineSqlUrl("abc123")).toBe(
      "https://api.cloudflare.com/client/v4/accounts/abc123/analytics_engine/sql",
    );
  });

  it("encodes the account id", () => {
    expect(analyticsEngineSqlUrl("a b&c")).toContain(
      "/accounts/a%20b%26c/analytics_engine/sql",
    );
  });
});

describe("ISO date parsing", () => {
  it("accepts valid calendar dates", () => {
    const date = parseIsoDate("2026-07-10");
    expect(date?.toISOString()).toBe("2026-07-10T00:00:00.000Z");
  });

  it("rejects non-dates and impossible calendar dates", () => {
    expect(parseIsoDate("2026-7-10")).toBeNull();
    expect(parseIsoDate("2026-07")).toBeNull();
    expect(parseIsoDate("07-10-2026")).toBeNull();
    expect(parseIsoDate("2026-02-31")).toBeNull();
    expect(parseIsoDate("2026-13-01")).toBeNull();
    expect(parseIsoDate("")).toBeNull();
    expect(parseIsoDate("nonsense")).toBeNull();
  });

  it("formats dates as UTC strings and SQL literals", () => {
    expect(toUtcDateString(new Date("2026-08-09T04:30:00.000Z"))).toBe(
      "2026-08-09",
    );
    expect(toDateTimeLiteral("2026-08-09")).toBe(
      "toDateTime('2026-08-09 00:00:00')",
    );
  });
});

describe("dashboard range validation", () => {
  const now = new Date("2026-08-09T12:00:00.000Z");

  it("defaults to the last 30 days", () => {
    const result = validateDashboardRange(null, null, now);
    expect(result.range).toEqual({ start: "2026-07-10", end: "2026-08-09" });
  });

  it("defaults the start when only an end is provided", () => {
    const result = validateDashboardRange(null, "2026-08-01", now);
    expect(result.range).toEqual({ start: "2026-07-02", end: "2026-08-01" });
  });

  it("accepts a validated start and end", () => {
    const result = validateDashboardRange("2026-07-01", "2026-07-31", now);
    expect(result.range).toEqual({ start: "2026-07-01", end: "2026-07-31" });
  });

  it("rejects malformed dates", () => {
    expect(validateDashboardRange("bad", "2026-07-31", now).error).toBe(
      "Invalid start date",
    );
    expect(validateDashboardRange("2026-07-01", "2026-13-01", now).error).toBe(
      "Invalid end date",
    );
  });

  it("requires start before end", () => {
    expect(validateDashboardRange("2026-07-31", "2026-07-31", now).error).toBe(
      "The start date must be before the end date",
    );
    expect(validateDashboardRange("2026-08-01", "2026-07-01", now).error).toBe(
      "The start date must be before the end date",
    );
  });

  it("caps the range at 90 days", () => {
    expect(validateDashboardRange("2026-05-01", "2026-08-09", now).error).toBe(
      "The date range cannot exceed 90 days",
    );
    expect(
      validateDashboardRange("2026-05-11", "2026-08-09", now).range,
    ).toEqual({ start: "2026-05-11", end: "2026-08-09" });
  });
});

describe("query templates", () => {
  const range = { start: "2026-07-10", end: "2026-08-09" };

  it("builds the shortlink clicks time series", () => {
    const sql = shortlinkClicksQuery(range);
    expect(sql).toContain("FROM leenk_shortlinks");
    expect(sql).toContain("index1 AS label");
    expect(sql).toContain("SUM(_sample_interval * double1) AS clicks");
    expect(sql).toContain("toDateTime('2026-07-10 00:00:00')");
    expect(sql).toContain("toDateTime('2026-08-09 00:00:00')");
    expect(sql).toContain("LIMIT 1000");
  });

  it("builds the legacy code-indexed history report", () => {
    const sql = shortlinkHistoryQuery(range);
    expect(sql).toContain("FROM leenk_shortlinks");
    expect(sql).toContain("index1 AS label");
    expect(sql).toContain("SUM(_sample_interval * double1) AS clicks");
    expect(sql).toContain("LIMIT 1000");
  });

  it("builds the campaign breakdown with a ranked cap", () => {
    const sql = shortlinkCampaignQuery(range);
    expect(sql).toContain("FROM leenk_shortlinks");
    expect(sql).toContain("blob4 AS campaign");
    expect(sql).toContain("blob5 AS source");
    expect(sql).toContain("blob6 AS medium");
    expect(sql).toContain("ORDER BY clicks DESC, label ASC");
    expect(sql).toContain("LIMIT 100");
  });

  it("builds the site events report", () => {
    const sql = siteEventsQuery(range);
    expect(sql).toContain("FROM leenk_site_events");
    expect(sql).toContain("blob1 AS event");
    expect(sql).toContain("blob2 AS dimension");
  });

  it("never interpolates arbitrary user SQL", () => {
    expect(() =>
      shortlinkClicksQuery({
        start: "2026-01-01'; DROP TABLE x; --",
        end: "2026-02-01",
      }),
    ).toThrow(/YYYY-MM-DD/);
  });
});

describe("response parsing", () => {
  it("parses the documented data array", () => {
    const response = parseAnalyticsEngineResponse({
      meta: [{ name: "day" }],
      data: [
        { day: "2026-07-10", label: "docs", clicks: 4 },
        { day: "2026-07-11", label: "docs", clicks: 7 },
      ],
    });
    expect(response.data).toEqual([
      { day: "2026-07-10", label: "docs", clicks: 4 },
      { day: "2026-07-11", label: "docs", clicks: 7 },
    ]);
  });

  it("parses rows paired with meta column names", () => {
    const response = parseAnalyticsEngineResponse({
      meta: [{ name: "day" }, { name: "clicks" }],
      rows: [["2026-07-10", 4]],
    });
    expect(response.data).toEqual([{ day: "2026-07-10", clicks: 4 }]);
  });

  it("drops unknown cell types and non-record rows", () => {
    const response = parseAnalyticsEngineResponse({
      data: [{ day: "2026-07-10", note: { nested: true } }],
    });
    expect(response.data).toEqual([{ day: "2026-07-10" }]);
  });

  it("rejects malformed responses", () => {
    expect(() => parseAnalyticsEngineResponse(null)).toThrow(
      AnalyticsEngineError,
    );
    expect(() => parseAnalyticsEngineResponse({})).toThrow(
      AnalyticsEngineError,
    );
    expect(() => parseAnalyticsEngineResponse({ data: "nope" })).toThrow(
      AnalyticsEngineError,
    );
  });
});

describe("runAnalyticsQuery", () => {
  it("posts the SQL body with a bearer token", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(JSON.stringify({ data: [{ clicks: 3 }] }), {
        status: 200,
      });
    });

    const result = await runAnalyticsQuery(
      "SELECT 1",
      "secret-token",
      "account-1",
      fetchMock,
    );

    expect(result.data).toEqual([{ clicks: 3 }]);
    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error("expected a fetch call");
    const [url, init] = call;
    expect(url).toBe(
      "https://api.cloudflare.com/client/v4/accounts/account-1/analytics_engine/sql",
    );
    if (init === undefined) throw new Error("expected fetch init");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer secret-token");
    expect(init.body).toBe("SELECT 1");
  });

  it("throws without echoing upstream details on failure", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response("denied", { status: 403 }),
    );
    await expect(
      runAnalyticsQuery("SELECT 1", "bad", "account-1", fetchMock),
    ).rejects.toThrow(AnalyticsEngineError);
  });

  it("throws a generic error when the network fails", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      throw new Error("connect refused");
    });
    await expect(
      runAnalyticsQuery("SELECT 1", "x", "account-1", fetchMock),
    ).rejects.toThrow("Analytics Engine request failed");
  });
});

describe("weighted helpers", () => {
  it("sums weighted counts and coerces unsafe values", () => {
    expect(
      sumWeighted(
        [
          { clicks: 4 },
          { clicks: 7 },
          { clicks: "5" },
          { clicks: Number.NaN },
          {},
        ],
        "clicks",
      ),
    ).toBe(11);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber("12")).toBe(0);
    expect(toNumber(12)).toBe(12);
  });
});
