import { describe, expect, it, vi } from "vitest";

import {
  GRAPHQL_ANALYTICS_NODE,
  GRAPHQL_ANALYTICS_URL,
  GRAPHQL_RUM_NODE,
  GRAPHQL_VITALS_NODE,
  GRAPHQL_WORKERS_NODE,
  GraphqlAnalyticsError,
  classifyGraphqlFailure,
  graphqlRumQuery,
  graphqlTimeVariables,
  graphqlVitalsQuery,
  graphqlVolumeQuery,
  graphqlVolumeVariables,
  graphqlWorkersQuery,
  graphqlWorkersVariables,
  isGraphqlDataset,
  isGraphqlWorkerScript,
  parseGraphqlRumResponse,
  parseGraphqlVitalsResponse,
  parseGraphqlVolumeResponse,
  parseGraphqlWorkersResponse,
  runGraphqlRumQuery,
  runGraphqlRumReport,
  runGraphqlVitalsReport,
  runGraphqlVolumeQuery,
  runGraphqlVolumeReport,
  runGraphqlWorkersQuery,
  runGraphqlWorkersReport,
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

describe("GraphQL RUM query", () => {
  const range = { start: "2026-07-10", end: "2026-08-09" };

  it("uses pageload Groups with visits and no identifying dimensions", () => {
    const query = graphqlRumQuery(true);
    expect(query).toContain(GRAPHQL_RUM_NODE);
    expect(query).toContain("sum");
    expect(query).toContain("visits");
    expect(query).toContain("sampleInterval");
    expect(query).not.toContain("requestPath");
    expect(query).not.toContain("refererPath");
    expect(query).not.toContain("userAgentBrowser");
    expect(query).not.toContain("countryName");
    expect(query).not.toContain(GRAPHQL_VITALS_NODE);
    expect(query).not.toContain(GRAPHQL_WORKERS_NODE);
    expect(graphqlRumQuery(false)).not.toContain("settings");
  });

  it("reuses the volume time variables without a dataset list", () => {
    expect(graphqlTimeVariables("account-1", range)).toEqual({
      accountTag: "account-1",
      end: "2026-08-09T00:00:00Z",
      limit: 1000,
      start: "2026-07-10T00:00:00Z",
    });
  });
});

describe("GraphQL Web Vitals query", () => {
  it("uses vitals Groups p75 fields and omits element paths", () => {
    const query = graphqlVitalsQuery(true);
    expect(query).toContain(GRAPHQL_VITALS_NODE);
    expect(query).toContain("largestContentfulPaintP75");
    expect(query).toContain("interactionToNextPaintP75");
    expect(query).toContain("cumulativeLayoutShiftP75");
    expect(query).toContain("timeToFirstByteP75");
    expect(query).not.toContain("largestContentfulPaintPath");
    expect(query).not.toContain("firstInputDelayElement");
    expect(query).not.toContain("requestPath");
    expect(query).not.toContain(GRAPHQL_RUM_NODE);
    expect(graphqlVitalsQuery(false)).not.toContain("settings");
  });
});

describe("GraphQL Workers invocations query", () => {
  const range = { start: "2026-07-10", end: "2026-08-09" };

  it("queries invocation metrics for the Leenk Workers only", () => {
    const query = graphqlWorkersQuery(true);
    expect(query).toContain(GRAPHQL_WORKERS_NODE);
    expect(query).toContain("scriptName: $productionScript");
    expect(query).toContain("scriptName: $developmentScript");
    expect(query).toContain("sum");
    expect(query).toContain("requests");
    expect(query).toContain("errors");
    expect(query).not.toContain("console");
    expect(query).not.toContain("message");
    expect(query).not.toContain("storageTraces");
    expect(query).not.toContain(GRAPHQL_RUM_NODE);
    expect(graphqlWorkersQuery(false)).not.toContain("settings");
    expect(graphqlWorkersVariables("account-1", range)).toEqual({
      accountTag: "account-1",
      developmentScript: "dev-leenk",
      end: "2026-08-09T00:00:00Z",
      limit: 1000,
      productionScript: "leenk",
      start: "2026-07-10T00:00:00Z",
    });
  });

  it("accepts only the named Leenk Worker scripts", () => {
    expect(isGraphqlWorkerScript("leenk")).toBe(true);
    expect(isGraphqlWorkerScript("dev-leenk")).toBe(true);
    expect(isGraphqlWorkerScript("other-worker")).toBe(false);
  });
});

describe("RUM response parsing", () => {
  it("maps pageload Groups onto pageviews and visits", () => {
    const result = parseGraphqlRumResponse({
      data: {
        viewer: {
          accounts: [
            {
              settings: {
                rumPageloadEventsAdaptiveGroups: { enabled: true },
              },
              rumPageloadEventsAdaptiveGroups: [
                {
                  count: 40,
                  avg: { sampleInterval: 1 },
                  sum: { visits: 12 },
                  dimensions: { date: "2026-07-10" },
                },
              ],
            },
          ],
        },
      },
    });
    expect(result).toEqual({
      data: [
        {
          day: "2026-07-10",
          pageviews: 40,
          sampleInterval: 1,
          visits: 12,
        },
      ],
      entitlement: "available",
      limits: {
        enabled: true,
        maxDuration: null,
        maxPageSize: null,
        notOlderThan: null,
      },
    });
  });

  it("returns an empty report when the RUM node is disabled", () => {
    const result = parseGraphqlRumResponse({
      data: {
        viewer: {
          accounts: [
            {
              settings: {
                rumPageloadEventsAdaptiveGroups: { enabled: false },
              },
              rumPageloadEventsAdaptiveGroups: [
                {
                  count: 99,
                  sum: { visits: 99 },
                  dimensions: { date: "2026-07-10" },
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
});

describe("Web Vitals response parsing", () => {
  it("keeps missing quantiles as null instead of inventing numbers", () => {
    const result = parseGraphqlVitalsResponse({
      data: {
        viewer: {
          accounts: [
            {
              rumWebVitalsEventsAdaptiveGroups: [
                {
                  count: 8,
                  avg: { sampleInterval: 1 },
                  quantiles: {
                    cumulativeLayoutShiftP75: 0.04,
                    largestContentfulPaintP75: 1800,
                  },
                  dimensions: { date: "2026-07-11" },
                },
              ],
            },
          ],
        },
      },
    });
    expect(result.data).toEqual([
      {
        clsP75: 0.04,
        count: 8,
        day: "2026-07-11",
        inpP75: null,
        lcpP75: 1800,
        sampleInterval: 1,
        ttfbP75: null,
      },
    ]);
    expect(result.entitlement).toBe("available");
  });
});

describe("Workers invocation response parsing", () => {
  it("maps aliased Adaptive rows and drops unknown scripts", () => {
    const result = parseGraphqlWorkersResponse({
      data: {
        viewer: {
          accounts: [
            {
              production: [
                {
                  avg: { sampleInterval: 1 },
                  dimensions: {
                    date: "2026-07-10",
                    scriptName: "leenk",
                    status: "success",
                  },
                  quantiles: { cpuTimeP50: 200, cpuTimeP99: 400 },
                  sum: { errors: 0, requests: 12, subrequests: 3 },
                },
              ],
              development: [
                {
                  dimensions: {
                    date: "2026-07-10",
                    scriptName: "other-worker",
                    status: "success",
                  },
                  sum: { errors: 1, requests: 9, subrequests: 0 },
                },
                {
                  dimensions: {
                    date: "2026-07-11",
                    scriptName: "dev-leenk",
                    status: "exception",
                  },
                  sum: { errors: 2, requests: 2, subrequests: 0 },
                },
              ],
            },
          ],
        },
      },
    });
    expect(result.data).toEqual([
      {
        cpuTimeP50: 200,
        cpuTimeP99: 400,
        day: "2026-07-10",
        errors: 0,
        requests: 12,
        sampleInterval: 1,
        scriptName: "leenk",
        status: "success",
        subrequests: 3,
      },
      {
        cpuTimeP50: null,
        cpuTimeP99: null,
        day: "2026-07-11",
        errors: 2,
        requests: 2,
        sampleInterval: null,
        scriptName: "dev-leenk",
        status: "exception",
        subrequests: 0,
      },
    ]);
  });
});

describe("runGraphqlRumQuery", () => {
  it("posts the pageload node to the shared GraphQL endpoint", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({
          data: {
            viewer: {
              accounts: [
                {
                  rumPageloadEventsAdaptiveGroups: [
                    {
                      count: 5,
                      sum: { visits: 2 },
                      dimensions: { date: "2026-07-10" },
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
    const result = await runGraphqlRumQuery(
      "account-1",
      { start: "2026-07-10", end: "2026-08-09" },
      "secret-token",
      fetchMock,
    );
    expect(result.data).toEqual([
      {
        day: "2026-07-10",
        pageviews: 5,
        sampleInterval: null,
        visits: 2,
      },
    ]);
    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error("expected a fetch call");
    expect(call[0]).toBe(GRAPHQL_ANALYTICS_URL);
  });
});

describe("runGraphqlWorkersQuery", () => {
  it("binds the allowlisted Worker script names", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => {
      return new Response(
        JSON.stringify({ data: { viewer: { accounts: [{}] } } }),
        { status: 200 },
      );
    });
    await runGraphqlWorkersQuery(
      "account-1",
      { start: "2026-07-10", end: "2026-08-09" },
      "token",
      fetchMock,
    );
    const call = fetchMock.mock.calls[0];
    if (!call) throw new Error("expected a fetch call");
    const init = call[1];
    if (init === undefined) throw new Error("expected fetch init");
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
        developmentScript: "dev-leenk",
        productionScript: "leenk",
      },
    });
  });
});

describe("named GraphQL reports", () => {
  it("returns empty RUM data when the node is missing", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            errors: [
              {
                message: `Cannot query field "${GRAPHQL_RUM_NODE}" on type "Account"`,
              },
            ],
          }),
          { status: 200 },
        ),
    );
    const response = await runGraphqlRumReport({
      accountId: "account-1",
      end: "2026-08-09",
      fetchFn: fetchMock,
      start: "2026-07-10",
      token: "token",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: [],
      meta: {
        entitlement: "missing",
        node: GRAPHQL_RUM_NODE,
        sampled: true,
        source: "GraphQL Analytics",
      },
      ok: true,
    });
  });

  it("returns empty vitals data when the node is missing", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            errors: [
              {
                message: `Cannot query field "${GRAPHQL_VITALS_NODE}" on type "Account"`,
              },
            ],
          }),
          { status: 200 },
        ),
    );
    const response = await runGraphqlVitalsReport({
      accountId: "account-1",
      end: "2026-08-09",
      fetchFn: fetchMock,
      start: "2026-07-10",
      token: "token",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: [],
      meta: { entitlement: "missing", node: GRAPHQL_VITALS_NODE },
      ok: true,
    });
  });

  it("returns empty Workers data when the node is missing", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            errors: [
              {
                message: `Cannot query field "${GRAPHQL_WORKERS_NODE}" on type "Account"`,
              },
            ],
          }),
          { status: 200 },
        ),
    );
    const response = await runGraphqlWorkersReport({
      accountId: "account-1",
      end: "2026-08-09",
      fetchFn: fetchMock,
      start: "2026-07-10",
      token: "token",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      data: [],
      meta: { entitlement: "missing", node: GRAPHQL_WORKERS_NODE },
      ok: true,
    });
  });
});

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
