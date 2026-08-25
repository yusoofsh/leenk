import {
  TIME_SERIES_LIMIT,
  analyticsEngineUnavailable,
  parseIsoDate,
  toUtcDateString,
  validateDashboardRange,
  type DateRange,
} from "~/lib/dashboard/analytics-engine";
import { dashboardError, dashboardOk } from "~/lib/dashboard/http";

export const GRAPHQL_ANALYTICS_URL =
  "https://api.cloudflare.com/client/v4/graphql";
export const GRAPHQL_ANALYTICS_NODE = "workersAnalyticsEngineAdaptiveGroups";
export const GRAPHQL_ANALYTICS_SOURCE = "GraphQL Analytics";

export const GRAPHQL_DATASETS = [
  "leenk_shortlinks",
  "leenk_site_events",
] as const;

export type GraphqlDataset = (typeof GRAPHQL_DATASETS)[number];

export type GraphqlEntitlement =
  | "available"
  | "disabled"
  | "missing"
  | "unknown";

export type GraphqlAnalyticsErrorCode =
  | "GRAPHQL_ANALYTICS_INVALID_RESPONSE"
  | "GRAPHQL_ANALYTICS_UNAVAILABLE"
  | "GRAPHQL_NODE_UNAVAILABLE";

export class GraphqlAnalyticsError extends Error {
  readonly code: GraphqlAnalyticsErrorCode;

  constructor(
    code: GraphqlAnalyticsErrorCode = "GRAPHQL_ANALYTICS_UNAVAILABLE",
    message = "GraphQL Analytics request failed",
  ) {
    super(message);
    this.name = "GraphqlAnalyticsError";
    this.code = code;
  }
}

export interface GraphqlVolumeRow {
  count: number;
  dataset: GraphqlDataset;
  day: string;
}

export interface GraphqlNodeLimits {
  enabled: boolean;
  maxDuration: number | null;
  maxPageSize: number | null;
  notOlderThan: number | null;
}

export type GraphqlVolumeResult =
  | {
      data: GraphqlVolumeRow[];
      entitlement: "available";
      limits: GraphqlNodeLimits | null;
    }
  | {
      data: [];
      entitlement: "disabled" | "missing";
      limits: GraphqlNodeLimits | null;
    };

const VOLUME_QUERY = `query AnalyticsEngineVolume(
  $accountTag: string!
  $datasets: [string!]!
  $end: Time!
  $limit: uint64!
  $start: Time!
) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      settings {
        workersAnalyticsEngineAdaptiveGroups {
          enabled
          maxDuration
          maxPageSize
          notOlderThan
        }
      }
      workersAnalyticsEngineAdaptiveGroups(
        filter: {
          dataset_in: $datasets
          datetime_geq: $start
          datetime_lt: $end
        }
        limit: $limit
        orderBy: [date_ASC]
      ) {
        count
        dimensions {
          dataset
          date
        }
      }
    }
  }
}`;

const VOLUME_QUERY_WITHOUT_SETTINGS = `query AnalyticsEngineVolume(
  $accountTag: string!
  $datasets: [string!]!
  $end: Time!
  $limit: uint64!
  $start: Time!
) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      workersAnalyticsEngineAdaptiveGroups(
        filter: {
          dataset_in: $datasets
          datetime_geq: $start
          datetime_lt: $end
        }
        limit: $limit
        orderBy: [date_ASC]
      ) {
        count
        dimensions {
          dataset
          date
        }
      }
    }
  }
}`;

export function graphqlVolumeQuery(includeSettings: boolean): string {
  return includeSettings ? VOLUME_QUERY : VOLUME_QUERY_WITHOUT_SETTINGS;
}

export function toGraphqlTime(date: string): string {
  if (!parseIsoDate(date)) {
    throw new GraphqlAnalyticsError(
      "GRAPHQL_ANALYTICS_INVALID_RESPONSE",
      "GraphQL Analytics time literals require YYYY-MM-DD",
    );
  }
  return `${date}T00:00:00Z`;
}

export function graphqlVolumeVariables(
  accountId: string,
  range: DateRange,
): Record<string, unknown> {
  return {
    accountTag: accountId,
    datasets: [...GRAPHQL_DATASETS],
    end: toGraphqlTime(range.end),
    limit: TIME_SERIES_LIMIT,
    start: toGraphqlTime(range.start),
  };
}

export function isGraphqlDataset(value: unknown): value is GraphqlDataset {
  return value === "leenk_shortlinks" || value === "leenk_site_events";
}

export function classifyGraphqlFailure(body: unknown, status: number): never {
  if (status === 401 || status === 403) {
    throw new GraphqlAnalyticsError();
  }
  if (isSchemaMissing(body)) {
    throw new GraphqlAnalyticsError(
      "GRAPHQL_NODE_UNAVAILABLE",
      "GraphQL Analytics node is not available",
    );
  }
  throw new GraphqlAnalyticsError();
}

export function shouldRetryWithoutSettings(body: unknown): boolean {
  const messages = graphqlErrorMessages(body);
  if (messages.length === 0) return false;
  return messages.some(
    (message) =>
      /settings/i.test(message) &&
      /Cannot query field|Unknown field|Cannot query/i.test(message),
  );
}

export function parseGraphqlVolumeResponse(body: unknown): GraphqlVolumeResult {
  if (!isObjectRecord(body)) {
    throw new GraphqlAnalyticsError("GRAPHQL_ANALYTICS_INVALID_RESPONSE");
  }
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    classifyGraphqlFailure(body, 200);
  }

  const accounts = viewerAccounts(body);
  const limits = parseNodeLimits(accounts[0]?.settings);
  if (limits && !limits.enabled) {
    return { data: [], entitlement: "disabled", limits };
  }

  const groups = accounts.flatMap((account) => {
    const rows = account[GRAPHQL_ANALYTICS_NODE];
    return Array.isArray(rows) ? rows : [];
  });
  const data = parseVolumeRows(groups);
  return { data, entitlement: "available", limits };
}

export async function runGraphqlVolumeQuery(
  accountId: string,
  range: DateRange,
  token: string,
  fetchFn: typeof fetch = fetch,
): Promise<GraphqlVolumeResult> {
  const variables = graphqlVolumeVariables(accountId, range);
  const withSettings = await postGraphql(
    graphqlVolumeQuery(true),
    variables,
    token,
    fetchFn,
  );
  if (shouldRetryWithoutSettings(withSettings.body)) {
    const withoutSettings = await postGraphql(
      graphqlVolumeQuery(false),
      variables,
      token,
      fetchFn,
    );
    if (!withoutSettings.ok) {
      classifyGraphqlFailure(withoutSettings.body, withoutSettings.status);
    }
    return parseGraphqlVolumeResponse(withoutSettings.body);
  }
  if (!withSettings.ok) {
    classifyGraphqlFailure(withSettings.body, withSettings.status);
  }
  return parseGraphqlVolumeResponse(withSettings.body);
}

export interface GraphqlVolumeReportInput {
  accountId: string | undefined;
  end: string | null;
  fetchFn?: typeof fetch;
  start: string | null;
  token: string | undefined;
}

export async function runGraphqlVolumeReport(
  input: GraphqlVolumeReportInput,
): Promise<Response> {
  if (!input.accountId || !input.token) return analyticsEngineUnavailable();

  const validation = validateDashboardRange(input.start, input.end);
  if (validation.error || !validation.range) {
    return dashboardError(
      400,
      "INVALID_RANGE",
      validation.error ?? "The analytics date range is invalid",
    );
  }

  try {
    const result = await runGraphqlVolumeQuery(
      input.accountId,
      validation.range,
      input.token,
      input.fetchFn,
    );
    return dashboardOk(result.data, {
      entitlement: result.entitlement,
      node: GRAPHQL_ANALYTICS_NODE,
      range: validation.range,
      sampled: true,
      source: GRAPHQL_ANALYTICS_SOURCE,
    });
  } catch (error) {
    if (
      error instanceof GraphqlAnalyticsError &&
      error.code === "GRAPHQL_NODE_UNAVAILABLE"
    ) {
      return dashboardOk([], {
        entitlement: "missing",
        node: GRAPHQL_ANALYTICS_NODE,
        range: validation.range,
        sampled: true,
        source: GRAPHQL_ANALYTICS_SOURCE,
      });
    }
    if (error instanceof GraphqlAnalyticsError) {
      return dashboardError(
        503,
        error.code,
        "GraphQL Analytics is temporarily unavailable",
      );
    }
    return dashboardError(
      500,
      "INTERNAL_ERROR",
      "The analytics report could not be loaded",
    );
  }
}

interface GraphqlPostResult {
  body: unknown;
  ok: boolean;
  status: number;
}

async function postGraphql(
  query: string,
  variables: Record<string, unknown>,
  token: string,
  fetchFn: typeof fetch,
): Promise<GraphqlPostResult> {
  let response: Response;
  try {
    response = await fetchFn(GRAPHQL_ANALYTICS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
    });
  } catch {
    throw new GraphqlAnalyticsError();
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new GraphqlAnalyticsError("GRAPHQL_ANALYTICS_INVALID_RESPONSE");
  }
  return { body, ok: response.ok, status: response.status };
}

function parseVolumeRows(rows: unknown[]): GraphqlVolumeRow[] {
  const result: GraphqlVolumeRow[] = [];
  for (const entry of rows) {
    if (!isObjectRecord(entry)) continue;
    const dimensions = isObjectRecord(entry.dimensions)
      ? entry.dimensions
      : null;
    if (!dimensions) continue;
    const dataset = parseDataset(dimensions.dataset);
    const day = parseGraphqlDate(dimensions.date);
    if (!dataset || !day) continue;
    result.push({
      count: toFiniteNumber(entry.count),
      dataset,
      day,
    });
  }
  return result;
}

function parseDataset(value: unknown): GraphqlDataset | null {
  return isGraphqlDataset(value) ? value : null;
}

function parseGraphqlDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = parseIsoDate(value.slice(0, 10));
  return date ? toUtcDateString(date) : null;
}

function parseNodeLimits(value: unknown): GraphqlNodeLimits | null {
  if (!isObjectRecord(value)) return null;
  const node = value[GRAPHQL_ANALYTICS_NODE];
  if (!isObjectRecord(node)) return null;
  return {
    enabled: node.enabled !== false,
    maxDuration: optionalFiniteNumber(node.maxDuration),
    maxPageSize: optionalFiniteNumber(node.maxPageSize),
    notOlderThan: optionalFiniteNumber(node.notOlderThan),
  };
}

function viewerAccounts(body: unknown): Array<Record<string, unknown>> {
  if (!isObjectRecord(body) || !isObjectRecord(body.data)) return [];
  if (!isObjectRecord(body.data.viewer)) return [];
  const accounts = body.data.viewer.accounts;
  if (!Array.isArray(accounts)) return [];
  return accounts.filter(isObjectRecord);
}

function graphqlErrorMessages(body: unknown): string[] {
  if (!isObjectRecord(body) || !Array.isArray(body.errors)) return [];
  const messages: string[] = [];
  for (const entry of body.errors) {
    if (isObjectRecord(entry) && typeof entry.message === "string") {
      messages.push(entry.message);
    }
  }
  return messages;
}

function isSchemaMissing(body: unknown): boolean {
  const messages = graphqlErrorMessages(body);
  const combined = messages.join("\n");
  return (
    combined.includes(GRAPHQL_ANALYTICS_NODE) &&
    /Cannot query field|Unknown field|does not exist/i.test(combined)
  );
}

function toFiniteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function optionalFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
