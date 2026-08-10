import { useCallback, useEffect, useRef, useState } from "react";

import type { CmsRevisionRecord } from "~/lib/dashboard/cms";
import type {
  FileListEntry,
  ShortlinkListEntry,
} from "~/lib/dashboard/records";

export interface DashboardError {
  error: string;
  message: string;
  ok: false;
  status: number;
}

export type DashboardResult<T> =
  | { data: T; meta?: DashboardMeta; ok: true }
  | DashboardError;

export interface DashboardMeta {
  legacy?: boolean;
  range?: {
    end: string;
    start: string;
  };
  sampled?: boolean;
  source?: string;
}

export interface AnalyticsRow {
  [column: string]: number | string;
}

export interface CmsOverviewData {
  document: {
    id: string;
    key: string;
    publishedRevisionId: string | null;
  };
  published: CmsRevisionRecord | null;
  revisions: Array<{
    archivedAt: string | null;
    author: string;
    createdAt: string;
    id: string;
    number: number;
    state: "archived" | "draft" | "published";
    title: string;
  }>;
}

export interface ActivityPage {
  entries: Array<{
    actor: string;
    createdAt: string;
    id: string;
    kind: string;
    payload: Record<string, unknown>;
    summary: string;
  }>;
  nextCursor: string | null;
}

export interface UploadTokenState {
  setToken: (token: string | null) => void;
  token: string | null;
}

let uploadToken: string | null = null;
const tokenListeners = new Set<(token: string | null) => void>();

export function setDashboardUploadToken(token: string | null): void {
  uploadToken = token;
  for (const listener of tokenListeners) listener(token);
}

export function subscribeToUploadToken(
  listener: (token: string | null) => void,
): () => void {
  tokenListeners.add(listener);
  return () => tokenListeners.delete(listener);
}

export function getDashboardUploadToken(): string | null {
  return uploadToken;
}

export async function dashboardFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<DashboardResult<T>> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body !== undefined && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getDashboardUploadToken();
  if (token) headers.set("X-Upload-Token", token);

  let response: Response;
  try {
    response = await fetch(path, { ...init, headers });
  } catch {
    return {
      error: "NETWORK_ERROR",
      message: "The dashboard could not reach the server",
      ok: false,
      status: 0,
    };
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    return {
      error: "INVALID_RESPONSE",
      message: "The server returned an unreadable response",
      ok: false,
      status: response.status,
    };
  }
  if (isErrorBody(body)) return body;
  if (response.ok && isOkBody(body)) {
    return {
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- server response is validated to the requested data shape
      data: body.data as T,
      ...(hasMeta(body) ? { meta: body.meta } : {}),
      ok: true,
    };
  }
  return {
    error: "INVALID_RESPONSE",
    message: "The server returned an unexpected response",
    ok: false,
    status: response.status,
  };
}

export type QueryState<T> =
  | { error: DashboardError; retry: () => void; state: "error" }
  | { data: T; meta?: DashboardMeta; retry: () => void; state: "ready" }
  | { retry: () => void; state: "loading" };

export function useDashboardQuery<T>(path: string): QueryState<T> {
  const [result, setResult] = useState<DashboardResult<T> | null>(null);
  const [version, setVersion] = useState(0);
  const requestIdRef = useRef(0);

  const load = useCallback(() => {
    setVersion((current) => current + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const requestId = ++requestIdRef.current;
    setResult(null);
    void dashboardFetch<T>(path).then((nextResult) => {
      if (cancelled || requestId !== requestIdRef.current) return;
      setResult(nextResult);
    });
    return () => {
      cancelled = true;
    };
  }, [path, version]);

  if (result && result.ok) {
    return {
      data: result.data,
      ...(result.meta ? { meta: result.meta } : {}),
      retry: load,
      state: "ready",
    };
  }
  if (result && !result.ok) {
    return { error: result, retry: load, state: "error" };
  }
  return { retry: load, state: "loading" };
}

export async function dashboardMutation<T>(
  path: string,
  body: unknown,
): Promise<DashboardResult<T>> {
  return dashboardFetch<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function dashboardDelete(
  path: string,
): Promise<DashboardResult<null>> {
  const headers = new Headers();
  headers.set("Accept", "application/json");
  const token = getDashboardUploadToken();
  if (token) headers.set("X-Upload-Token", token);
  let response: Response;
  try {
    response = await fetch(path, { headers, method: "DELETE" });
  } catch {
    return {
      error: "NETWORK_ERROR",
      message: "The dashboard could not reach the server",
      ok: false,
      status: 0,
    };
  }
  if (response.status === 204) return { data: null, ok: true };
  const body: unknown = await response.json().catch(() => null);
  if (isErrorBody(body)) return body;
  return {
    error: "INVALID_RESPONSE",
    message: "The server returned an unexpected response",
    ok: false,
    status: response.status,
  };
}

export function analyticsRange(days: 7 | 30 | 90): {
  end: string;
  start: string;
} {
  const now = new Date();
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - days);
  return { end: toIsoDate(end), start: toIsoDate(start) };
}

export function formatCount(value: number | string | undefined): string {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? new Intl.NumberFormat().format(number) : "0";
}

export function formatDate(value: string | undefined): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function isErrorBody(value: unknown): value is DashboardError {
  if (typeof value !== "object" || value === null) return false;
  const ok = "ok" in value ? value.ok : undefined;
  const error = "error" in value ? value.error : undefined;
  const status = "status" in value ? value.status : undefined;
  return (
    ok === false && typeof error === "string" && typeof status === "number"
  );
}

function isOkBody(value: unknown): value is { data: unknown; ok: true } {
  if (typeof value !== "object" || value === null) return false;
  if (!("ok" in value) || !("data" in value)) return false;
  return value.ok === true;
}

function hasMeta(value: object): value is { meta: DashboardMeta } {
  if (!("meta" in value)) return false;
  return typeof value.meta === "object";
}

export type { FileListEntry, ShortlinkListEntry };
