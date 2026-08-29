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
export const GRAPHQL_RUM_NODE = "rumPageloadEventsAdaptiveGroups";
export const GRAPHQL_VITALS_NODE = "rumWebVitalsEventsAdaptiveGroups";
export const GRAPHQL_WORKERS_NODE = "workersInvocationsAdaptive";
export const GRAPHQL_ANALYTICS_SOURCE = "GraphQL Analytics";

export const GRAPHQL_DATASETS = [
  "leenk_shortlinks",
  "leenk_site_events",
] as const;

export const GRAPHQL_WORKER_SCRIPTS = ["leenk", "dev-leenk"] as const;

export type GraphqlDataset = (typeof GRAPHQL_DATASETS)[number];
export type GraphqlWorkerScript = (typeof GRAPHQL_WORKER_SCRIPTS)[number];

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

export interface GraphqlRumRow {
  day: string;
  pageviews: number;
  sampleInterval: number | null;
  visits: number;
}

export interface GraphqlVitalsRow {
  clsP75: number | null;
  count: number;
  day: string;
  inpP75: number | null;
  lcpP75: number | null;
  sampleInterval: number | null;
  ttfbP75: number | null;
}

export interface GraphqlWorkersRow {
  cpuTimeP50: number | null;
  cpuTimeP99: number | null;
  day: string;
  errors: number;
  requests: number;
  sampleInterval: number | null;
  scriptName: GraphqlWorkerScript;
  status: string;
  subrequests: number;
}

export interface GraphqlNodeLimits {
  enabled: boolean;
  maxDuration: number | null;
  maxPageSize: number | null;
  notOlderThan: number | null;
}

export type GraphqlEmptyEntitlement = "disabled" | "missing";

export type GraphqlNodeResult<T> =
  | {
      data: T;
      entitlement: "available";
      limits: GraphqlNodeLimits | null;
    }
  | {
      data: [];
      entitlement: GraphqlEmptyEntitlement;
      limits: GraphqlNodeLimits | null;
    };

export type GraphqlVolumeResult = GraphqlNodeResult<GraphqlVolumeRow[]>;
export type GraphqlRumResult = GraphqlNodeResult<GraphqlRumRow[]>;
export type GraphqlVitalsResult = GraphqlNodeResult<GraphqlVitalsRow[]>;
export type GraphqlWorkersResult = GraphqlNodeResult<GraphqlWorkersRow[]>;

export interface GraphqlReportInput {
  accountId: string | undefined;
  end: string | null;
  fetchFn?: typeof fetch;
  start: string | null;
  token: string | undefined;
}

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

const RUM_QUERY = `query WebAnalyticsRum(
  $accountTag: string!
  $end: Time!
  $limit: uint64!
  $start: Time!
) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      settings {
        rumPageloadEventsAdaptiveGroups {
          enabled
          maxDuration
          maxPageSize
          notOlderThan
        }
      }
      rumPageloadEventsAdaptiveGroups(
        filter: {
          datetime_geq: $start
          datetime_lt: $end
        }
        limit: $limit
        orderBy: [date_ASC]
      ) {
        count
        avg {
          sampleInterval
        }
        sum {
          visits
        }
        dimensions {
          date
        }
      }
    }
  }
}`;

const RUM_QUERY_WITHOUT_SETTINGS = `query WebAnalyticsRum(
  $accountTag: string!
  $end: Time!
  $limit: uint64!
  $start: Time!
) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      rumPageloadEventsAdaptiveGroups(
        filter: {
          datetime_geq: $start
          datetime_lt: $end
        }
        limit: $limit
        orderBy: [date_ASC]
      ) {
        count
        avg {
          sampleInterval
        }
        sum {
          visits
        }
        dimensions {
          date
        }
      }
    }
  }
}`;

const VITALS_QUERY = `query WebAnalyticsVitals(
  $accountTag: string!
  $end: Time!
  $limit: uint64!
  $start: Time!
) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      settings {
        rumWebVitalsEventsAdaptiveGroups {
          enabled
          maxDuration
          maxPageSize
          notOlderThan
        }
      }
      rumWebVitalsEventsAdaptiveGroups(
        filter: {
          datetime_geq: $start
          datetime_lt: $end
        }
        limit: $limit
        orderBy: [date_ASC]
      ) {
        count
        avg {
          sampleInterval
        }
        quantiles {
          cumulativeLayoutShiftP75
          interactionToNextPaintP75
          largestContentfulPaintP75
          timeToFirstByteP75
        }
        dimensions {
          date
        }
      }
    }
  }
}`;

const VITALS_QUERY_WITHOUT_SETTINGS = `query WebAnalyticsVitals(
  $accountTag: string!
  $end: Time!
  $limit: uint64!
  $start: Time!
) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      rumWebVitalsEventsAdaptiveGroups(
        filter: {
          datetime_geq: $start
          datetime_lt: $end
        }
        limit: $limit
        orderBy: [date_ASC]
      ) {
        count
        avg {
          sampleInterval
        }
        quantiles {
          cumulativeLayoutShiftP75
          interactionToNextPaintP75
          largestContentfulPaintP75
          timeToFirstByteP75
        }
        dimensions {
          date
        }
      }
    }
  }
}`;

const WORKERS_QUERY = `query WorkersInvocations(
  $accountTag: string!
  $developmentScript: string!
  $end: Time!
  $limit: uint64!
  $productionScript: string!
  $start: Time!
) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      settings {
        workersInvocationsAdaptive {
          enabled
          maxDuration
          maxPageSize
          notOlderThan
        }
      }
      production: workersInvocationsAdaptive(
        filter: {
          datetime_geq: $start
          datetime_lt: $end
          scriptName: $productionScript
        }
        limit: $limit
        orderBy: [date_ASC]
      ) {
        avg {
          sampleInterval
        }
        dimensions {
          date
          scriptName
          status
        }
        quantiles {
          cpuTimeP50
          cpuTimeP99
        }
        sum {
          errors
          requests
          subrequests
        }
      }
      development: workersInvocationsAdaptive(
        filter: {
          datetime_geq: $start
          datetime_lt: $end
          scriptName: $developmentScript
        }
        limit: $limit
        orderBy: [date_ASC]
      ) {
        avg {
          sampleInterval
        }
        dimensions {
          date
          scriptName
          status
        }
        quantiles {
          cpuTimeP50
          cpuTimeP99
        }
        sum {
          errors
          requests
          subrequests
        }
      }
    }
  }
}`;

const WORKERS_QUERY_WITHOUT_SETTINGS = `query WorkersInvocations(
  $accountTag: string!
  $developmentScript: string!
  $end: Time!
  $limit: uint64!
  $productionScript: string!
  $start: Time!
) {
  viewer {
    accounts(filter: { accountTag: $accountTag }) {
      production: workersInvocationsAdaptive(
        filter: {
          datetime_geq: $start
          datetime_lt: $end
          scriptName: $productionScript
        }
        limit: $limit
        orderBy: [date_ASC]
      ) {
        avg {
          sampleInterval
        }
        dimensions {
          date
          scriptName
          status
        }
        quantiles {
          cpuTimeP50
          cpuTimeP99
        }
        sum {
          errors
          requests
          subrequests
        }
      }
      development: workersInvocationsAdaptive(
        filter: {
          datetime_geq: $start
          datetime_lt: $end
          scriptName: $developmentScript
        }
        limit: $limit
        orderBy: [date_ASC]
      ) {
        avg {
          sampleInterval
        }
        dimensions {
          date
          scriptName
          status
        }
        quantiles {
          cpuTimeP50
          cpuTimeP99
        }
        sum {
          errors
          requests
          subrequests
        }
      }
    }
  }
}`;

export function graphqlVolumeQuery(includeSettings: boolean): string {
  return includeSettings ? VOLUME_QUERY : VOLUME_QUERY_WITHOUT_SETTINGS;
}

export function graphqlRumQuery(includeSettings: boolean): string {
  return includeSettings ? RUM_QUERY : RUM_QUERY_WITHOUT_SETTINGS;
}

export function graphqlVitalsQuery(includeSettings: boolean): string {
  return includeSettings ? VITALS_QUERY : VITALS_QUERY_WITHOUT_SETTINGS;
}

export function graphqlWorkersQuery(includeSettings: boolean): string {
  return includeSettings ? WORKERS_QUERY : WORKERS_QUERY_WITHOUT_SETTINGS;
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

export function graphqlTimeVariables(
  accountId: string,
  range: DateRange,
): Record<string, unknown> {
  return {
    accountTag: accountId,
    end: toGraphqlTime(range.end),
    limit: TIME_SERIES_LIMIT,
    start: toGraphqlTime(range.start),
  };
}

export function graphqlVolumeVariables(
  accountId: string,
  range: DateRange,
): Record<string, unknown> {
  return {
    ...graphqlTimeVariables(accountId, range),
    datasets: [...GRAPHQL_DATASETS],
  };
}

export function graphqlWorkersVariables(
  accountId: string,
  range: DateRange,
): Record<string, unknown> {
  return {
    ...graphqlTimeVariables(accountId, range),
    developmentScript: "dev-leenk",
    productionScript: "leenk",
  };
}

export function isGraphqlDataset(value: unknown): value is GraphqlDataset {
  return value === "leenk_shortlinks" || value === "leenk_site_events";
}

export function isGraphqlWorkerScript(
  value: unknown,
): value is GraphqlWorkerScript {
  return value === "leenk" || value === "dev-leenk";
}

export function classifyGraphqlFailure(
  body: unknown,
  status: number,
  node: string = GRAPHQL_ANALYTICS_NODE,
): never {
  if (status === 401 || status === 403) {
    throw new GraphqlAnalyticsError();
  }
  if (isSchemaMissing(body, node)) {
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
  return parseGraphqlNodeResponse(
    body,
    GRAPHQL_ANALYTICS_NODE,
    parseVolumeRows,
  );
}

export function parseGraphqlRumResponse(body: unknown): GraphqlRumResult {
  return parseGraphqlNodeResponse(body, GRAPHQL_RUM_NODE, parseRumRows);
}

export function parseGraphqlVitalsResponse(body: unknown): GraphqlVitalsResult {
  return parseGraphqlNodeResponse(body, GRAPHQL_VITALS_NODE, parseVitalsRows);
}

export function parseGraphqlWorkersResponse(
  body: unknown,
): GraphqlWorkersResult {
  return parseGraphqlNodeResponse(body, GRAPHQL_WORKERS_NODE, parseWorkersRows);
}

export async function runGraphqlVolumeQuery(
  accountId: string,
  range: DateRange,
  token: string,
  fetchFn: typeof fetch = fetch,
): Promise<GraphqlVolumeResult> {
  return runGraphqlNodeQuery(
    GRAPHQL_ANALYTICS_NODE,
    graphqlVolumeQuery(true),
    graphqlVolumeQuery(false),
    graphqlVolumeVariables(accountId, range),
    token,
    parseGraphqlVolumeResponse,
    fetchFn,
  );
}

export async function runGraphqlRumQuery(
  accountId: string,
  range: DateRange,
  token: string,
  fetchFn: typeof fetch = fetch,
): Promise<GraphqlRumResult> {
  return runGraphqlNodeQuery(
    GRAPHQL_RUM_NODE,
    graphqlRumQuery(true),
    graphqlRumQuery(false),
    graphqlTimeVariables(accountId, range),
    token,
    parseGraphqlRumResponse,
    fetchFn,
  );
}

export async function runGraphqlVitalsQuery(
  accountId: string,
  range: DateRange,
  token: string,
  fetchFn: typeof fetch = fetch,
): Promise<GraphqlVitalsResult> {
  return runGraphqlNodeQuery(
    GRAPHQL_VITALS_NODE,
    graphqlVitalsQuery(true),
    graphqlVitalsQuery(false),
    graphqlTimeVariables(accountId, range),
    token,
    parseGraphqlVitalsResponse,
    fetchFn,
  );
}

export async function runGraphqlWorkersQuery(
  accountId: string,
  range: DateRange,
  token: string,
  fetchFn: typeof fetch = fetch,
): Promise<GraphqlWorkersResult> {
  return runGraphqlNodeQuery(
    GRAPHQL_WORKERS_NODE,
    graphqlWorkersQuery(true),
    graphqlWorkersQuery(false),
    graphqlWorkersVariables(accountId, range),
    token,
    parseGraphqlWorkersResponse,
    fetchFn,
  );
}

export async function runGraphqlVolumeReport(
  input: GraphqlReportInput,
): Promise<Response> {
  return runGraphqlAnalyticsReport(
    input,
    GRAPHQL_ANALYTICS_NODE,
    runGraphqlVolumeQuery,
  );
}

export async function runGraphqlRumReport(
  input: GraphqlReportInput,
): Promise<Response> {
  return runGraphqlAnalyticsReport(input, GRAPHQL_RUM_NODE, runGraphqlRumQuery);
}

export async function runGraphqlVitalsReport(
  input: GraphqlReportInput,
): Promise<Response> {
  return runGraphqlAnalyticsReport(
    input,
    GRAPHQL_VITALS_NODE,
    runGraphqlVitalsQuery,
  );
}

export async function runGraphqlWorkersReport(
  input: GraphqlReportInput,
): Promise<Response> {
  return runGraphqlAnalyticsReport(
    input,
    GRAPHQL_WORKERS_NODE,
    runGraphqlWorkersQuery,
  );
}

interface GraphqlPostResult {
  body: unknown;
  ok: boolean;
  status: number;
}

async function runGraphqlAnalyticsReport<T>(
  input: GraphqlReportInput,
  node: string,
  run: (
    accountId: string,
    range: DateRange,
    token: string,
    fetchFn: typeof fetch,
  ) => Promise<GraphqlNodeResult<T>>,
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
    const result = await run(
      input.accountId,
      validation.range,
      input.token,
      input.fetchFn ?? fetch,
    );
    return dashboardOk(result.data, {
      entitlement: result.entitlement,
      node,
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
        node,
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

async function runGraphqlNodeQuery<T>(
  node: string,
  queryWithSettings: string,
  queryWithoutSettings: string,
  variables: Record<string, unknown>,
  token: string,
  parse: (body: unknown) => GraphqlNodeResult<T>,
  fetchFn: typeof fetch,
): Promise<GraphqlNodeResult<T>> {
  const withSettings = await postGraphql(
    queryWithSettings,
    variables,
    token,
    fetchFn,
  );
  if (shouldRetryWithoutSettings(withSettings.body)) {
    const withoutSettings = await postGraphql(
      queryWithoutSettings,
      variables,
      token,
      fetchFn,
    );
    if (!withoutSettings.ok) {
      classifyGraphqlFailure(
        withoutSettings.body,
        withoutSettings.status,
        node,
      );
    }
    return parse(withoutSettings.body);
  }
  if (!withSettings.ok) {
    classifyGraphqlFailure(withSettings.body, withSettings.status, node);
  }
  return parse(withSettings.body);
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

function parseGraphqlNodeResponse<T>(
  body: unknown,
  node: string,
  parseRows: (accounts: Array<Record<string, unknown>>) => T,
): GraphqlNodeResult<T> {
  if (!isObjectRecord(body)) {
    throw new GraphqlAnalyticsError("GRAPHQL_ANALYTICS_INVALID_RESPONSE");
  }
  if (Array.isArray(body.errors) && body.errors.length > 0) {
    classifyGraphqlFailure(body, 200, node);
  }

  const accounts = viewerAccounts(body);
  const limits = parseNodeLimits(accounts[0]?.settings, node);
  if (limits && !limits.enabled) {
    return { data: [], entitlement: "disabled", limits };
  }

  const data = parseRows(accounts);
  return { data, entitlement: "available", limits };
}

function parseVolumeRows(
  accounts: Array<Record<string, unknown>>,
): GraphqlVolumeRow[] {
  const groups = accounts.flatMap((account) => {
    const rows = account[GRAPHQL_ANALYTICS_NODE];
    return Array.isArray(rows) ? rows : [];
  });
  const result: GraphqlVolumeRow[] = [];
  for (const entry of groups) {
    if (!isObjectRecord(entry)) continue;
    const dimensions = objectValue(entry.dimensions);
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

function parseRumRows(
  accounts: Array<Record<string, unknown>>,
): GraphqlRumRow[] {
  const groups = accounts.flatMap((account) => {
    const rows = account[GRAPHQL_RUM_NODE];
    return Array.isArray(rows) ? rows : [];
  });
  const result: GraphqlRumRow[] = [];
  for (const entry of groups) {
    if (!isObjectRecord(entry)) continue;
    const dimensions = objectValue(entry.dimensions);
    const day = dimensions ? parseGraphqlDate(dimensions.date) : null;
    if (!day) continue;
    const sum = objectValue(entry.sum);
    const avg = objectValue(entry.avg);
    result.push({
      day,
      pageviews: toFiniteNumber(entry.count),
      sampleInterval: optionalFiniteNumber(avg?.sampleInterval),
      visits: toFiniteNumber(sum?.visits),
    });
  }
  return result;
}

function parseVitalsRows(
  accounts: Array<Record<string, unknown>>,
): GraphqlVitalsRow[] {
  const groups = accounts.flatMap((account) => {
    const rows = account[GRAPHQL_VITALS_NODE];
    return Array.isArray(rows) ? rows : [];
  });
  const result: GraphqlVitalsRow[] = [];
  for (const entry of groups) {
    if (!isObjectRecord(entry)) continue;
    const dimensions = objectValue(entry.dimensions);
    const day = dimensions ? parseGraphqlDate(dimensions.date) : null;
    if (!day) continue;
    const quantiles = objectValue(entry.quantiles);
    const avg = objectValue(entry.avg);
    result.push({
      clsP75: optionalFiniteNumber(quantiles?.cumulativeLayoutShiftP75),
      count: toFiniteNumber(entry.count),
      day,
      inpP75: optionalFiniteNumber(quantiles?.interactionToNextPaintP75),
      lcpP75: optionalFiniteNumber(quantiles?.largestContentfulPaintP75),
      sampleInterval: optionalFiniteNumber(avg?.sampleInterval),
      ttfbP75: optionalFiniteNumber(quantiles?.timeToFirstByteP75),
    });
  }
  return result;
}

function parseWorkersRows(
  accounts: Array<Record<string, unknown>>,
): GraphqlWorkersRow[] {
  const groups = accounts.flatMap((account) => {
    const production = Array.isArray(account.production)
      ? account.production
      : [];
    const development = Array.isArray(account.development)
      ? account.development
      : [];
    const unaliased = Array.isArray(account[GRAPHQL_WORKERS_NODE])
      ? account[GRAPHQL_WORKERS_NODE]
      : [];
    return [...production, ...development, ...unaliased];
  });
  const result: GraphqlWorkersRow[] = [];
  for (const entry of groups) {
    if (!isObjectRecord(entry)) continue;
    const dimensions = objectValue(entry.dimensions);
    if (!dimensions) continue;
    const day = parseGraphqlDate(dimensions.date);
    const scriptName = parseWorkerScript(dimensions.scriptName);
    if (!day || !scriptName) continue;
    const sum = objectValue(entry.sum);
    const quantiles = objectValue(entry.quantiles);
    const avg = objectValue(entry.avg);
    result.push({
      cpuTimeP50: optionalFiniteNumber(quantiles?.cpuTimeP50),
      cpuTimeP99: optionalFiniteNumber(quantiles?.cpuTimeP99),
      day,
      errors: toFiniteNumber(sum?.errors),
      requests: toFiniteNumber(sum?.requests),
      sampleInterval: optionalFiniteNumber(avg?.sampleInterval),
      scriptName,
      status: parseWorkerStatus(dimensions.status),
      subrequests: toFiniteNumber(sum?.subrequests),
    });
  }
  return result;
}

function parseDataset(value: unknown): GraphqlDataset | null {
  return isGraphqlDataset(value) ? value : null;
}

function parseWorkerScript(value: unknown): GraphqlWorkerScript | null {
  return isGraphqlWorkerScript(value) ? value : null;
}

function parseWorkerStatus(value: unknown): string {
  return typeof value === "string" && value.length > 0 ? value : "unknown";
}

function parseGraphqlDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = parseIsoDate(value.slice(0, 10));
  return date ? toUtcDateString(date) : null;
}

function parseNodeLimits(
  value: unknown,
  node: string,
): GraphqlNodeLimits | null {
  if (!isObjectRecord(value)) return null;
  const settings = value[node];
  if (!isObjectRecord(settings)) return null;
  return {
    enabled: settings.enabled !== false,
    maxDuration: optionalFiniteNumber(settings.maxDuration),
    maxPageSize: optionalFiniteNumber(settings.maxPageSize),
    notOlderThan: optionalFiniteNumber(settings.notOlderThan),
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

function isSchemaMissing(body: unknown, node: string): boolean {
  const messages = graphqlErrorMessages(body);
  const combined = messages.join("\n");
  return (
    combined.includes(node) &&
    /Cannot query field|Unknown field|does not exist/i.test(combined)
  );
}

function toFiniteNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function optionalFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return isObjectRecord(value) ? value : null;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
