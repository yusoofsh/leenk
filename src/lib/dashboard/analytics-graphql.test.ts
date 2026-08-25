import { describe, expect, it, vi } from "vitest";

import {
  GRAPHQL_ANALYTICS_NODE,
  GRAPHQL_ANALYTICS_URL,
  GraphqlAnalyticsError,
  classifyGraphqlFailure,
  graphqlVolumeQuery,
  graphqlVolumeVariables,
  isGraphqlDataset,
  parseGraphqlVolumeResponse,
  runGraphqlVolumeQuery,
  runGraphqlVolumeReport,
  shouldRetryWithoutSettings,
  toGraphqlTime,
} from "./analytics-graphql";

describe("GraphQL volume query", () => {
  const range = { start: "2026-07-10", end: "2026-08-09" };

  it("uses the documented Adaptive Groups node and allowlisted datasets", () => {
    const query = graphqlVolumeQuery(true);
    expect(query).toContain(GRAPHQL_ANALYTICS_NODE);
    expect(query).toContain("dataset_in: $datasets");
    expect(query).not.toContain("rumPageloadEventsAdaptiveGroups");
    expect(query).not.toContain("rumWebVitalsEventsAdaptive");
    expect(query).not.toContain("workersInvocationsAdaptive");
    expect(query).not.toContain("storageTraces");
    expect(graphqlVolumeQuery(false)).not.toContain("settings");
  });

  it("binds dates and datasets as GraphQL variables", () => {
    const variables = graphqlVolumeVariables("account-1", range);
    expect(variables).toEqual({
      accountTag: "account-1",
      datasets: ["leenk_shortlinks", "leenk_site_events"],
      end: "2026-08-09T00:00:00Z",
      limit: 1000,
      start: "2026-07-10T00:00:00Z",
    });
  });

  it("rejects unsafe date literals", () => {
    expect(() => toGraphqlTime("2026-01-01'; DROP TABLE x; --")).toThrow(
      GraphqlAnalyticsError,
    );
  });
});

describe("dataset allowlist", () => {
  it("accepts only Leenk Analytics Engine datasets", () => {
    expect(isGraphqlDataset("leenk_shortlinks")).toBe(true);
    expect(isGraphqlDataset("leenk_site_events")).toBe(true);
    expect(isGraphqlDataset("rumPageloadEventsAdaptiveGroups")).toBe(false);
    expect(isGraphqlDataset("workersInvocationsAdaptive")).toBe(false);
  });
});

describe("response parsing", () => {
  it("maps Adaptive Groups rows onto the dashboard volume shape", () => {
    const result = parseGraphqlVolumeResponse({
      data: {
        viewer: {
          accounts: [
            {
              settings: {
                workersAnalyticsEngineAdaptiveGroups: {
                  enabled: true,
                  maxDuration: 2592000,
                  maxPageSize: 10000,
                  notOlderThan: 7776000,
                },
              },
              workersAnalyticsEngineAdaptiveGroups: [
                {
                  count: 12,
                  dimensions: {
                    dataset: "leenk_shortlinks",
                    date: "2026-07-10",
                  },
                },
                {
                  count: 4,
                  dimensions: {
                    dataset: "leenk_site_events",
                    date: "2026-07-11T00:00:00Z",
                  },
                },
              ],
            },
          ],
        },
      },
    });
    expect(result).toEqual({
      data: [
        { count: 12, dataset: "leenk_shortlinks", day: "2026-07-10" },
        { count: 4, dataset: "leenk_site_events", day: "2026-07-11" },
      ],
      entitlement: "available",
      limits: {
        enabled: true,
        maxDuration: 2592000,
        maxPageSize: 10000,
        notOlderThan: 7776000,
      },
    });
  });

  it("drops unknown datasets instead of forwarding them", () => {
    const result = parseGraphqlVolumeResponse({
      data: {
        viewer: {
          accounts: [
            {
              workersAnalyticsEngineAdaptiveGroups: [
                {
                  count: 9,
                  dimensions: {
                    dataset: "rumPageloadEventsAdaptiveGroups",
                    date: "2026-07-10",
                  },
                },
                {
                  count: 3,
                  dimensions: {
                    dataset: "leenk_shortlinks",
                    date: "2026-07-10",
                  },
                },
              ],
            },
          ],
        },
      },
    });
    expect(result.data).toEqual([
      { count: 3, dataset: "leenk_shortlinks", day: "2026-07-10" },
    ]);
  });

  it("reports a disabled node without inventing counts", () => {
    const result = parseGraphqlVolumeResponse({
      data: {
        viewer: {
          accounts: [
            {
              settings: {
                workersAnalyticsEngineAdaptiveGroups: { enabled: false },
              },
              workersAnalyticsEngineAdaptiveGroups: [
                {
                  count: 99,
                  dimensions: {
                    dataset: "leenk_shortlinks",
                    date: "2026-07-10",
                  },
                },
              ],
            },
          ],
        },
      },
    });
    expect(result).toEqual({
      data: [],
      entitlement: "disabled",
      limits: {
        enabled: false,
        maxDuration: null,
        maxPageSize: null,
        notOlderThan: null,
      },
    });
  });

  it("classifies a missing node from GraphQL schema errors", () => {
    expect(() =>
      parseGraphqlVolumeResponse({
        errors: [
          {
            message: `Cannot query field "${GRAPHQL_ANALYTICS_NODE}" on type "Account"`,
          },
        ],
      }),
    ).toThrow(/not available/);
    expect(shouldRetryWithoutSettings({ errors: [{ message: "nope" }] })).toBe(
      false,
    );
    expect(
      shouldRetryWithoutSettings({
        errors: [
          { message: 'Cannot query field "settings" on type "Account"' },
        ],
      }),
    ).toBe(true);
  });

  it("does not echo upstream GraphQL messages", () => {
    expect(() =>
      classifyGraphqlFailure({ errors: [{ message: "secret-token" }] }, 403),
    ).toThrow("GraphQL Analytics request failed");
  });
});

describe("runGraphqlVolumeQuery", () => {
  it("posts variables to the GraphQL endpoint", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          data: {
            viewer: {
              accounts: [
                {
                  workersAnalyticsEngineAdaptiveGroups: [
                    {
                      count: 2,
                      dimensions: {
                        dataset: "leenk_shortlinks",
                        date: "2026-07-10",
                      },
                    },
                  ],
                },
              ],
            },
          },
        }),
        { status: 200 },
      );
    });

    const result = await runGraphqlVolumeQuery(
      "account-1",
      { start: "2026-07-10", end: "2026-08-09" },
      "secret-token",
      fetchMock,
    );
    expect(result.entitlement).toBe("available");
    expect(result.data).toEqual([
      { count: 2, dataset: "leenk_shortlinks", day: "2026-07-10" },
    ]);
    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error("expected a fetch call");
    const [url, init] = call;
    expect(url).toBe(GRAPHQL_ANALYTICS_URL);
    if (init === undefined) throw new Error("expected fetch init");
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer secret-token");
    const rawBody = init.body;
    const encoded =
      typeof rawBody === "string"
        ? rawBody
        : rawBody instanceof Uint8Array
          ? new TextDecoder().decode(rawBody)
          : null;
    if (encoded === null) throw new Error("expected a string GraphQL body");
    const posted: unknown = JSON.parse(encoded);
    expect(posted).toMatchObject({
      variables: {
        accountTag: "account-1",
        datasets: ["leenk_shortlinks", "leenk_site_events"],
      },
    });
  });

  it("retries without settings when that field is missing", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (_url, init) => {
      const rawBody = init?.body;
      const encoded =
        typeof rawBody === "string"
          ? rawBody
          : rawBody instanceof Uint8Array
            ? new TextDecoder().decode(rawBody)
            : "";
      const body: unknown = encoded ? JSON.parse(encoded) : {};
      const query =
        isObjectRecord(body) && typeof body.query === "string"
          ? body.query
          : "";
      if (query.includes("settings")) {
        return new Response(
          JSON.stringify({
            errors: [
              { message: 'Cannot query field "settings" on type "Account"' },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          data: { viewer: { accounts: [{}] } },
        }),
        { status: 200 },
      );
    });

    const result = await runGraphqlVolumeQuery(
      "account-1",
      { start: "2026-07-10", end: "2026-08-09" },
      "token",
      fetchMock,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.entitlement).toBe("available");
    expect(result.data).toEqual([]);
  });
});

describe("runGraphqlVolumeReport", () => {
  it("returns a typed empty report when the node is missing", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            errors: [
              {
                message: `Cannot query field "${GRAPHQL_ANALYTICS_NODE}" on type "Account"`,
              },
            ],
          }),
          { status: 200 },
        ),
    );
    const response = await runGraphqlVolumeReport({
      accountId: "account-1",
      end: "2026-08-09",
      fetchFn: fetchMock,
      start: "2026-07-10",
      token: "token",
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      data: [],
      meta: {
        entitlement: "missing",
        node: GRAPHQL_ANALYTICS_NODE,
        sampled: true,
        source: "GraphQL Analytics",
      },
      ok: true,
    });
  });

  it("hides upstream failures behind a generic 503", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () => new Response("denied", { status: 403 }),
    );
    const response = await runGraphqlVolumeReport({
      accountId: "account-1",
      end: "2026-08-09",
      fetchFn: fetchMock,
      start: "2026-07-10",
      token: "token",
    });
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toMatchObject({
      error: "GRAPHQL_ANALYTICS_INVALID_RESPONSE",
    });
    expect(JSON.stringify(body)).not.toContain("denied");
  });

  it("requires the same analytics bindings as SQL reports", async () => {
    const response = await runGraphqlVolumeReport({
      accountId: undefined,
      end: null,
      start: null,
      token: undefined,
    });
    expect(response.status).toBe(503);
    const body = await response.json();
    expect(body).toMatchObject({
      error: "ANALYTICS_ENGINE_NOT_CONFIGURED",
      ok: false,
    });
  });
});

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
