import { apiError } from "~/lib/http";
import { dashboardError, dashboardOk } from "~/lib/dashboard/http";

export const ANALYTICS_ENGINE_API_URL = "https://api.cloudflare.com/client/v4";
export const ANALYTICS_ENGINE_SQL_PATH = "analytics_engine/sql";
export const DEFAULT_RANGE_DAYS = 30;
export const MAX_RANGE_DAYS = 90;
export const TIME_SERIES_LIMIT = 1_000;
export const RANKED_LIMIT = 100;

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 24 * 60 * 60 * 1_000;

export interface DateRange {
  end: string;
  start: string;
}

export interface RangeValidationResult {
  error?: string;
  range?: DateRange;
}

export interface AnalyticsEngineRow {
  [column: string]: number | string;
}

export interface AnalyticsEngineResponse {
  data: AnalyticsEngineRow[];
}

export interface AnalyticsEngineReport {
  data: AnalyticsEngineRow[];
  meta: {
    range: DateRange;
    sampled: true;
    source: "Analytics Engine";
  };
}

export class AnalyticsEngineError extends Error {
  readonly code: string;

  constructor(
    code = "ANALYTICS_ENGINE_UNAVAILABLE",
    message = "Analytics Engine request failed",
  ) {
    super(message);
    this.name = "AnalyticsEngineError";
    this.code = code;
  }
}

export function analyticsEngineSqlUrl(accountId: string): string {
  return `${ANALYTICS_ENGINE_API_URL}/accounts/${encodeURIComponent(
    accountId,
  )}/${ANALYTICS_ENGINE_SQL_PATH}`;
}

export function parseIsoDate(value: string): Date | null {
  if (!ISO_DATE_PATTERN.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

export function toUtcDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function toDateTimeLiteral(date: string): string {
  if (!ISO_DATE_PATTERN.test(date)) {
    throw new AnalyticsEngineError(
      "ANALYTICS_ENGINE_INVALID_DATE",
      "Analytics Engine date literals require YYYY-MM-DD",
    );
  }
  return `toDateTime('${date} 00:00:00')`;
}

export function validateDashboardRange(
  startValue: string | null,
  endValue: string | null,
  now: Date = new Date(),
): RangeValidationResult {
  const endDate = endValue ? parseIsoDate(endValue) : null;
  if (endValue && !endDate) return { error: "Invalid end date" };

  const effectiveEnd = endDate ?? startOfUtcDay(now);
  const defaultStart = new Date(
    effectiveEnd.getTime() - DEFAULT_RANGE_DAYS * DAY_MS,
  );
  const startDate = startValue ? parseIsoDate(startValue) : defaultStart;
  if (startValue && !startDate) return { error: "Invalid start date" };

  if (startDate! >= effectiveEnd) {
    return { error: "The start date must be before the end date" };
  }
  const rangeDays = (effectiveEnd.getTime() - startDate!.getTime()) / DAY_MS;
  if (rangeDays > MAX_RANGE_DAYS) {
    return { error: "The date range cannot exceed 90 days" };
  }

  return {
    range: {
      start: toUtcDateString(startDate!),
      end: toUtcDateString(effectiveEnd),
    },
  };
}

export function shortlinkClicksQuery(range: DateRange): string {
  return `SELECT
  toStartOfInterval(timestamp, INTERVAL '1' DAY) AS day,
  index1 AS label,
  SUM(_sample_interval * double1) AS clicks
FROM leenk_shortlinks
WHERE timestamp >= ${toDateTimeLiteral(range.start)}
  AND timestamp < ${toDateTimeLiteral(range.end)}
GROUP BY day, label
ORDER BY day ASC, label ASC
LIMIT ${TIME_SERIES_LIMIT}
FORMAT JSON`;
}

// Legacy rows predating the label migration use the short code as `index1`
// and appear in the label column as codes until retention expires. The
// schema blobs overlap between row generations, so no query-side marker
// separates them; the UI labels this mixed view truthfully.

export function shortlinkCampaignQuery(range: DateRange): string {
  return `SELECT
  index1 AS label,
  blob4 AS campaign,
  blob5 AS source,
  blob6 AS medium,
  SUM(_sample_interval * double1) AS clicks
FROM leenk_shortlinks
WHERE timestamp >= ${toDateTimeLiteral(range.start)}
  AND timestamp < ${toDateTimeLiteral(range.end)}
GROUP BY label, campaign, source, medium
ORDER BY clicks DESC, label ASC
LIMIT ${RANKED_LIMIT}
FORMAT JSON`;
}

export function siteEventsQuery(range: DateRange): string {
  return `SELECT
  toStartOfInterval(timestamp, INTERVAL '1' DAY) AS day,
  blob1 AS event,
  blob2 AS dimension,
  SUM(_sample_interval * double1) AS events
FROM leenk_site_events
WHERE timestamp >= ${toDateTimeLiteral(range.start)}
  AND timestamp < ${toDateTimeLiteral(range.end)}
GROUP BY day, event, dimension
ORDER BY day ASC, event ASC, dimension ASC
LIMIT ${TIME_SERIES_LIMIT}
FORMAT JSON`;
}

export function parseAnalyticsEngineResponse(
  body: unknown,
): AnalyticsEngineResponse {
  if (!isObjectRecord(body)) {
    throw new AnalyticsEngineError("ANALYTICS_ENGINE_INVALID_RESPONSE");
  }
  const rawData = body.data;
  const rawRows = body.rows;
  const rawMeta = body.meta;

  if (Array.isArray(rawData)) {
    return { data: parseRows(rawData) };
  }
  if (Array.isArray(rawRows) && Array.isArray(rawMeta)) {
    const columns = rawMeta.map((entry) =>
      isObjectRecord(entry) && typeof entry.name === "string" ? entry.name : "",
    );
    return { data: parseArrayRows(rawRows, columns) };
  }
  throw new AnalyticsEngineError("ANALYTICS_ENGINE_INVALID_RESPONSE");
}

export async function runAnalyticsQuery(
  sql: string,
  token: string,
  accountId: string,
  fetchFn: typeof fetch = fetch,
): Promise<AnalyticsEngineResponse> {
  let response: Response;
  try {
    response = await fetchFn(analyticsEngineSqlUrl(accountId), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain;charset=UTF-8",
      },
      body: sql,
    });
  } catch {
    throw new AnalyticsEngineError();
  }
  if (!response.ok) {
    throw new AnalyticsEngineError();
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new AnalyticsEngineError("ANALYTICS_ENGINE_INVALID_RESPONSE");
  }
  return parseAnalyticsEngineResponse(body);
}

export function toNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function sumWeighted(
  rows: AnalyticsEngineRow[],
  column: string,
): number {
  return rows.reduce((total, row) => total + toNumber(row[column]), 0);
}

export function analyticsEngineUnavailable(): Response {
  return apiError(
    503,
    "ANALYTICS_ENGINE_NOT_CONFIGURED",
    "Analytics Engine is not configured",
  );
}

export interface AnalyticsReportInput {
  accountId: string | undefined;
  buildQuery: (range: DateRange) => string;
  end: string | null;
  fetchFn?: typeof fetch;
  legacy?: boolean;
  start: string | null;
  token: string | undefined;
}

export async function runAnalyticsReport(
  input: AnalyticsReportInput,
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
    const response = await runAnalyticsQuery(
      input.buildQuery(validation.range),
      input.token,
      input.accountId,
      input.fetchFn,
    );
    return dashboardOk(response.data, {
      ...(input.legacy ? { legacy: true } : {}),
      range: validation.range,
      sampled: true,
      source: "Analytics Engine",
    });
  } catch (error) {
    if (error instanceof AnalyticsEngineError) {
      return dashboardError(
        503,
        error.code,
        "Analytics Engine is temporarily unavailable",
      );
    }
    return dashboardError(
      500,
      "INTERNAL_ERROR",
      "The analytics report could not be loaded",
    );
  }
}

function startOfUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function parseRows(rows: unknown[]): AnalyticsEngineRow[] {
  const result: AnalyticsEngineRow[] = [];
  for (const entry of rows) {
    if (!isObjectRecord(entry)) continue;
    const row: AnalyticsEngineRow = {};
    for (const [key, value] of Object.entries(entry)) {
      if (typeof value === "number" || typeof value === "string")
        row[key] = value;
    }
    result.push(row);
  }
  return result;
}

function parseArrayRows(
  rows: unknown[],
  columns: string[],
): AnalyticsEngineRow[] {
  const result: AnalyticsEngineRow[] = [];
  for (const entry of rows) {
    if (!Array.isArray(entry)) continue;
    const row: AnalyticsEngineRow = {};
    for (let index = 0; index < entry.length; index += 1) {
      const column = columns[index];
      const value = entry[index];
      if (column && (typeof value === "number" || typeof value === "string")) {
        row[column] = value;
      }
    }
    result.push(row);
  }
  return result;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
