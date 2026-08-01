import { apiError, authorizeMutation } from "./http";
import { validateObjectKey } from "./object-keys";

export const SHORTLINK_ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
export const SHORTLINK_MIN_LENGTH = 4;
export const SHORTLINK_MAX_LENGTH = 8;
export const SHORTLINK_ATTEMPTS_PER_LENGTH = 32;
export const MAX_SHORTLINK_REQUEST_BYTES = 8 * 1_024;
export const MAX_INTERNAL_TARGET_LENGTH = 2_048;
export const MAX_CAMPAIGN_VALUE_LENGTH = 64;

const ALLOWED_METHODS = "GET, HEAD, POST, DELETE";
const INTERNAL_TARGET_BASE_URL = "https://shortlink.invalid";
const CAMPAIGN_VALUE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const EXPLICIT_ROOT_PATHS = new Set(["github", "linkedin", "twitter"]);
const SHORTLINK_CODE_PATTERN = new RegExp(
  `^[${SHORTLINK_ALPHABET}]{${SHORTLINK_MIN_LENGTH},${SHORTLINK_MAX_LENGTH}}$`,
);
const ISO_UTC_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;

export interface ShortlinkCampaign {
  medium?: string;
  name?: string;
  source?: string;
}

export interface ShortlinkRecord {
  campaign?: ShortlinkCampaign;
  expiresAt?: string;
  path?: string;
  target?: string;
}

export interface ShortlinkStorage {
  delete(code: string): Promise<void>;
  get(code: string): Promise<ShortlinkRecord | null>;
  putIfAbsent(code: string, record: ShortlinkRecord): Promise<boolean>;
}

export interface ShortlinkTargetInfo {
  expiresAt?: Date;
}

export interface ShortlinkTargetStorage {
  exists(path: string): Promise<boolean>;
  get?(path: string): Promise<ShortlinkTargetInfo | null>;
}

export interface ShortlinkAnalyticsDataPoint {
  blobs?: string[];
  doubles?: number[];
  indexes?: string[];
}

export interface ShortlinkAnalytics {
  writeDataPoint(event: ShortlinkAnalyticsDataPoint): void;
}

export type RandomBytes = (length: number) => Uint8Array;

export interface CreateShortlinkOptions {
  campaign?: ShortlinkCampaign;
  expiresAt?: Date;
}

export interface ShortlinkResult {
  campaign?: ShortlinkCampaign;
  code: string;
  expiresAt?: string;
  path?: string;
  shortUrl: string;
  target?: string;
  targetUrl: string;
}

interface ShortlinkTargetInput {
  path?: string;
  target?: string;
}

interface ParsedShortlinkInput extends CreateShortlinkOptions {
  path?: string;
  target?: string;
}

export class InvalidShortlinkCampaignError extends Error {}
export class InvalidShortlinkExpirationError extends Error {}
export class InvalidShortlinkTargetError extends Error {}
export class ShortlinkCapacityError extends Error {}

const defaultRandomBytes: RandomBytes = (length) =>
  globalThis.crypto.getRandomValues(new Uint8Array(length));

export async function createShortlink(
  targetPath: string,
  storage: ShortlinkStorage,
  baseUrl: URL,
  randomBytes: RandomBytes = defaultRandomBytes,
  options: CreateShortlinkOptions = {},
): Promise<ShortlinkResult> {
  return allocateShortlink(
    { path: targetPath },
    storage,
    baseUrl,
    randomBytes,
    options,
  );
}

export async function createInternalShortlink(
  target: string,
  storage: ShortlinkStorage,
  baseUrl: URL,
  randomBytes: RandomBytes = defaultRandomBytes,
  options: CreateShortlinkOptions = {},
): Promise<ShortlinkResult> {
  return allocateShortlink({ target }, storage, baseUrl, randomBytes, options);
}

export async function handleShortlinkRequest(
  request: Request,
  code: string | undefined,
  storage: ShortlinkStorage,
  uploadToken: string | undefined,
  targetStorage?: ShortlinkTargetStorage,
  randomBytes: RandomBytes = defaultRandomBytes,
  analytics?: ShortlinkAnalytics,
): Promise<Response> {
  try {
    if (request.method === "GET" || request.method === "HEAD") {
      if (!code) return methodNotAllowed();
      return resolveShortlink(request, code, storage, analytics);
    }

    if (request.method === "POST") {
      if (code) return methodNotAllowed();
      return createShortlinkFromRequest(
        request,
        storage,
        uploadToken,
        targetStorage,
        randomBytes,
      );
    }

    if (request.method === "DELETE") {
      if (!code) return methodNotAllowed();
      return deleteShortlink(request, code, storage, uploadToken);
    }

    return methodNotAllowed();
  } catch (error) {
    console.error(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        message: "shortlink request failed",
        method: request.method,
        code: code ?? null,
      }),
    );
    return apiError(500, "INTERNAL_ERROR", "Shortlink request failed");
  }
}

export function parseCampaign(value: unknown): {
  campaign?: ShortlinkCampaign;
  error?: string;
} {
  if (value === undefined) return {};
  if (!isObjectRecord(value)) {
    return { error: invalidCampaignMessage() };
  }

  const input = value;
  const campaign: ShortlinkCampaign = {};
  for (const field of ["name", "source", "medium"] as const) {
    const fieldValue = input[field];
    if (fieldValue === undefined) continue;
    if (
      typeof fieldValue !== "string" ||
      !CAMPAIGN_VALUE_PATTERN.test(fieldValue)
    ) {
      return { error: invalidCampaignMessage() };
    }
    campaign[field] = fieldValue;
  }

  if (Object.keys(campaign).length === 0) {
    return { error: invalidCampaignMessage() };
  }
  return { campaign };
}

export function parseCampaignHeaders(headers: Headers): {
  campaign?: ShortlinkCampaign;
  error?: string;
} {
  const values = {
    medium: headers.get("x-shortlink-medium") ?? undefined,
    name: headers.get("x-shortlink-campaign") ?? undefined,
    source: headers.get("x-shortlink-source") ?? undefined,
  };
  if (Object.values(values).every((value) => value === undefined)) return {};
  return parseCampaign(values);
}

export function validateInternalTarget(target: string): string | null {
  if (!target || target.length > MAX_INTERNAL_TARGET_LENGTH) {
    return "The internal target is empty or too long";
  }
  if (!target.startsWith("/") || target.startsWith("//")) {
    return "The internal target must be a same-origin path";
  }
  if (
    target.includes("\\") ||
    target.includes("#") ||
    hasControlCharacters(target)
  ) {
    return "The internal target is invalid";
  }

  let parsed: URL;
  try {
    parsed = new URL(target, INTERNAL_TARGET_BASE_URL);
    const decodedPath = decodeURIComponent(parsed.pathname);
    const segments = decodedPath.split("/");
    if (segments.some((segment) => segment === "." || segment === "..")) {
      return "The internal target is invalid";
    }
  } catch {
    return "The internal target is invalid";
  }

  if (
    parsed.pathname === "/api/shortlinks" ||
    parsed.pathname.startsWith("/api/shortlinks/") ||
    parsed.pathname === "/static/__shortlinks" ||
    parsed.pathname.startsWith("/static/__shortlinks/")
  ) {
    return "The internal target is reserved";
  }

  const rootCode = parsed.pathname.slice(1);
  if (
    !parsed.pathname.slice(1).includes("/") &&
    isValidShortlinkCode(rootCode) &&
    !EXPLICIT_ROOT_PATHS.has(rootCode)
  ) {
    return "The internal target cannot point to another shortlink";
  }

  return null;
}

function generateCode(length: number, randomBytes: RandomBytes): string {
  const bytes = randomBytes(length);
  let code = "";

  for (const byte of bytes) {
    code += SHORTLINK_ALPHABET[byte % SHORTLINK_ALPHABET.length];
  }

  return code;
}

async function allocateShortlink(
  target: ShortlinkTargetInput,
  storage: ShortlinkStorage,
  baseUrl: URL,
  randomBytes: RandomBytes,
  options: CreateShortlinkOptions,
): Promise<ShortlinkResult> {
  const normalizedOptions = normalizeCreateOptions(options);
  const record = buildRecord(target, normalizedOptions);
  const code = await findAvailableCode(record, storage, randomBytes);
  if (!code) {
    throw new ShortlinkCapacityError("Shortlink namespace is exhausted");
  }

  return buildShortlinkResult(code, target, baseUrl, normalizedOptions);
}

function buildRecord(
  target: ShortlinkTargetInput,
  options: CreateShortlinkOptions,
): ShortlinkRecord {
  if (target.path !== undefined) {
    const pathError = validateObjectKey(target.path);
    if (pathError) throw new InvalidShortlinkTargetError(pathError);
  } else if (target.target !== undefined) {
    const targetError = validateInternalTarget(target.target);
    if (targetError) throw new InvalidShortlinkTargetError(targetError);
  } else {
    throw new InvalidShortlinkTargetError("A shortlink target is required");
  }

  let record: ShortlinkRecord;
  if (target.path !== undefined) {
    record = { path: target.path };
  } else if (target.target !== undefined) {
    record = { target: target.target };
  } else {
    throw new InvalidShortlinkTargetError("A shortlink target is required");
  }
  if (options.expiresAt) record.expiresAt = options.expiresAt.toISOString();
  if (options.campaign) record.campaign = options.campaign;
  return record;
}

function buildShortlinkResult(
  code: string,
  target: ShortlinkTargetInput,
  baseUrl: URL,
  options: CreateShortlinkOptions,
): ShortlinkResult {
  const shortUrl = new URL(baseUrl);
  shortUrl.pathname = `/${code}`;
  shortUrl.search = "";
  shortUrl.hash = "";

  const targetPath =
    target.path !== undefined ? `/static/${target.path}` : target.target!;
  const targetUrl = new URL(baseUrl);
  const parsedTarget = new URL(targetPath, baseUrl);
  targetUrl.pathname = parsedTarget.pathname;
  targetUrl.search = parsedTarget.search;
  targetUrl.hash = "";

  const result: ShortlinkResult = {
    code,
    shortUrl: shortUrl.toString(),
    targetUrl: targetUrl.toString(),
  };
  if (target.path !== undefined) result.path = target.path;
  if (target.target !== undefined) result.target = target.target;
  if (options.expiresAt) result.expiresAt = options.expiresAt.toISOString();
  if (options.campaign) result.campaign = options.campaign;
  return result;
}

async function findAvailableCode(
  record: ShortlinkRecord,
  storage: ShortlinkStorage,
  randomBytes: RandomBytes,
  length = SHORTLINK_MIN_LENGTH,
): Promise<string | null> {
  if (length > SHORTLINK_MAX_LENGTH) return null;
  const code = await findAvailableCodeAtLength(
    length,
    record,
    storage,
    randomBytes,
  );
  return code ?? findAvailableCode(record, storage, randomBytes, length + 1);
}

async function findAvailableCodeAtLength(
  length: number,
  record: ShortlinkRecord,
  storage: ShortlinkStorage,
  randomBytes: RandomBytes,
  attempt = 0,
  attemptedCodes = new Set<string>(),
): Promise<string | null> {
  if (attempt >= SHORTLINK_ATTEMPTS_PER_LENGTH) return null;
  const code = generateCode(length, randomBytes);
  if (attemptedCodes.has(code)) {
    return findAvailableCodeAtLength(
      length,
      record,
      storage,
      randomBytes,
      attempt + 1,
      attemptedCodes,
    );
  }
  attemptedCodes.add(code);
  if (await storage.putIfAbsent(code, record)) return code;
  return findAvailableCodeAtLength(
    length,
    record,
    storage,
    randomBytes,
    attempt + 1,
    attemptedCodes,
  );
}

async function createShortlinkFromRequest(
  request: Request,
  storage: ShortlinkStorage,
  uploadToken: string | undefined,
  targetStorage: ShortlinkTargetStorage | undefined,
  randomBytes: RandomBytes,
): Promise<Response> {
  const authError = await authorizeMutation(
    request,
    uploadToken,
    "SHORTLINKS_NOT_CONFIGURED",
    "Shortlink writes are not configured",
  );
  if (authError) return authError;

  const input = await parseShortlinkInput(request);
  if (input instanceof Response) return input;

  let expiresAt = input.expiresAt;
  if (input.path !== undefined) {
    if (!targetStorage) {
      return apiError(
        503,
        "SHORTLINKS_NOT_CONFIGURED",
        "Shortlink writes are not configured",
      );
    }

    const targetInfo = targetStorage.get
      ? await targetStorage.get(input.path)
      : (await targetStorage.exists(input.path))
        ? {}
        : null;
    if (!targetInfo) {
      return apiError(
        404,
        "STATIC_TARGET_NOT_FOUND",
        "The static file does not exist",
      );
    }

    if (targetInfo.expiresAt && !isFiniteDate(targetInfo.expiresAt)) {
      return apiError(
        500,
        "INVALID_TARGET_METADATA",
        "Static target metadata is invalid",
      );
    }
    if (targetInfo.expiresAt && targetInfo.expiresAt.getTime() <= Date.now()) {
      return apiError(
        410,
        "STATIC_TARGET_EXPIRED",
        "The static file has expired",
      );
    }
    expiresAt = earliestDate(expiresAt, targetInfo.expiresAt);
  }

  try {
    const result =
      input.path !== undefined
        ? await createShortlink(
            input.path,
            storage,
            new URL(request.url),
            randomBytes,
            createOptions(expiresAt, input.campaign),
          )
        : await createInternalShortlink(
            input.target!,
            storage,
            new URL(request.url),
            randomBytes,
            createOptions(expiresAt, input.campaign),
          );
    return Response.json(result, {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (
      error instanceof InvalidShortlinkTargetError ||
      error instanceof InvalidShortlinkExpirationError
    ) {
      return apiError(400, "INVALID_SHORTLINK", error.message);
    }
    if (error instanceof InvalidShortlinkCampaignError) {
      return apiError(400, "INVALID_CAMPAIGN", error.message);
    }
    if (error instanceof ShortlinkCapacityError) {
      return apiError(
        503,
        "SHORTLINKS_UNAVAILABLE",
        "Shortlink allocation is temporarily unavailable",
      );
    }
    throw error;
  }
}

async function parseShortlinkInput(
  request: Request,
): Promise<ParsedShortlinkInput | Response> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    return apiError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Shortlink creation requires application/json",
    );
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength === null) {
    return apiError(
      411,
      "LENGTH_REQUIRED",
      "Content-Length is required for shortlink creation",
    );
  }
  if (!/^\d+$/.test(contentLength)) {
    return apiError(400, "INVALID_CONTENT_LENGTH", "Content-Length is invalid");
  }

  const parsedLength = Number(contentLength);
  if (!Number.isSafeInteger(parsedLength)) {
    return apiError(400, "INVALID_CONTENT_LENGTH", "Content-Length is invalid");
  }
  if (parsedLength > MAX_SHORTLINK_REQUEST_BYTES) {
    return apiError(
      413,
      "REQUEST_TOO_LARGE",
      "Shortlink creation requests are limited to 8 KiB",
    );
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return apiError(400, "INVALID_JSON", "The request body must be valid JSON");
  }
  if (!isObjectRecord(input)) {
    return apiError(
      400,
      "INVALID_TARGET",
      "The request body must contain either a string path or target",
    );
  }

  const body = input;
  const hasPath = "path" in body;
  const hasTarget = "target" in body;
  if (hasPath === hasTarget) {
    return apiError(
      400,
      "INVALID_TARGET",
      "The request body must contain exactly one of path or target",
    );
  }

  const result: ParsedShortlinkInput = {};
  if (hasPath) {
    if (typeof body.path !== "string") {
      return apiError(400, "INVALID_TARGET_PATH", "Path must be a string");
    }
    const pathError = validateObjectKey(body.path);
    if (pathError) return apiError(400, "INVALID_TARGET_PATH", pathError);
    result.path = body.path;
  } else {
    if (typeof body.target !== "string") {
      return apiError(
        400,
        "INVALID_INTERNAL_TARGET",
        "Target must be a string",
      );
    }
    const targetError = validateInternalTarget(body.target);
    if (targetError)
      return apiError(400, "INVALID_INTERNAL_TARGET", targetError);
    result.target = body.target;
  }

  const expiration = parseExpiration(body.expiresAt);
  if (expiration.error) {
    return apiError(400, "INVALID_EXPIRATION", expiration.error);
  }
  if (expiration.expiresAt) result.expiresAt = expiration.expiresAt;

  const campaign = parseCampaign(body.campaign);
  if (campaign.error) return apiError(400, "INVALID_CAMPAIGN", campaign.error);
  if (campaign.campaign) result.campaign = campaign.campaign;
  return result;
}

async function resolveShortlink(
  request: Request,
  code: string,
  storage: ShortlinkStorage,
  analytics?: ShortlinkAnalytics,
): Promise<Response> {
  if (!isValidShortlinkCode(code)) return shortlinkNotFound();

  const record = await storage.get(code);
  if (!record) return shortlinkNotFound();

  const targetPath = record.path;
  const target = record.target;
  if (targetPath !== undefined && target !== undefined) {
    return apiError(500, "INVALID_RECORD", "Shortlink record is invalid");
  }

  let targetUrl: URL;
  if (targetPath !== undefined) {
    const pathError = validateObjectKey(targetPath);
    if (pathError) {
      console.error(
        JSON.stringify({
          code,
          message: "shortlink record has an invalid target path",
        }),
      );
      return apiError(500, "INVALID_RECORD", "Shortlink record is invalid");
    }
    targetUrl = new URL(request.url);
    targetUrl.pathname = `/static/${targetPath}`;
    targetUrl.search = "";
    targetUrl.hash = "";
  } else if (target !== undefined) {
    const targetError = validateInternalTarget(target);
    if (targetError) {
      console.error(
        JSON.stringify({
          code,
          message: "shortlink record has an invalid internal target",
        }),
      );
      return apiError(500, "INVALID_RECORD", "Shortlink record is invalid");
    }
    targetUrl = new URL(target, request.url);
    targetUrl.hash = "";
  } else {
    return apiError(500, "INVALID_RECORD", "Shortlink record is invalid");
  }

  const expiresAt = record.expiresAt
    ? parseStoredExpiration(record.expiresAt)
    : undefined;
  if (record.expiresAt && !expiresAt) {
    return apiError(500, "INVALID_RECORD", "Shortlink record is invalid");
  }
  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    return expiredShortlinkResponse(request, expiresAt);
  }

  if (request.method === "GET" && analytics) {
    trackShortlinkClick(request, code, record.campaign, analytics);
  }

  return new Response(null, {
    status: 302,
    headers: {
      "Cache-Control":
        expiresAt || record.campaign ? "no-store" : "public, max-age=300",
      Location: targetUrl.toString(),
    },
  });
}

async function deleteShortlink(
  request: Request,
  code: string,
  storage: ShortlinkStorage,
  uploadToken: string | undefined,
): Promise<Response> {
  const authError = await authorizeMutation(
    request,
    uploadToken,
    "SHORTLINKS_NOT_CONFIGURED",
    "Shortlink writes are not configured",
  );
  if (authError) return authError;
  if (!isValidShortlinkCode(code)) return shortlinkNotFound();

  await storage.delete(code);
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}

function normalizeCreateOptions(
  options: CreateShortlinkOptions,
): CreateShortlinkOptions {
  let expiresAt: Date | undefined;
  if (options.expiresAt !== undefined) {
    if (
      !isFiniteDate(options.expiresAt) ||
      options.expiresAt.getTime() <= Date.now()
    ) {
      throw new InvalidShortlinkExpirationError(
        "Shortlink expiration must be a future date",
      );
    }
    expiresAt = new Date(options.expiresAt);
  }

  let campaign: ShortlinkCampaign | undefined;
  if (options.campaign !== undefined) {
    const parsed = parseCampaign(options.campaign);
    if (parsed.error || !parsed.campaign) {
      throw new InvalidShortlinkCampaignError(
        parsed.error ?? invalidCampaignMessage(),
      );
    }
    campaign = parsed.campaign;
  }

  const normalized: CreateShortlinkOptions = {};
  if (campaign) normalized.campaign = campaign;
  if (expiresAt) normalized.expiresAt = expiresAt;
  return normalized;
}

function createOptions(
  expiresAt?: Date,
  campaign?: ShortlinkCampaign,
): CreateShortlinkOptions {
  const options: CreateShortlinkOptions = {};
  if (expiresAt) options.expiresAt = expiresAt;
  if (campaign) options.campaign = campaign;
  return options;
}

function parseExpiration(value: unknown): {
  error?: string;
  expiresAt?: Date;
} {
  if (value === undefined) return {};
  if (typeof value !== "string" || !ISO_UTC_TIMESTAMP_PATTERN.test(value)) {
    return { error: invalidExpirationMessage() };
  }

  const expiresAt = new Date(value);
  if (!isFiniteDate(expiresAt) || expiresAt.getTime() <= Date.now()) {
    return { error: invalidExpirationMessage() };
  }
  return { expiresAt };
}

function parseStoredExpiration(value: string): Date | null {
  if (!ISO_UTC_TIMESTAMP_PATTERN.test(value)) return null;
  const expiresAt = new Date(value);
  return isFiniteDate(expiresAt) ? expiresAt : null;
}

function earliestDate(first?: Date, second?: Date): Date | undefined {
  if (!first) return second;
  if (!second) return first;
  return first.getTime() <= second.getTime() ? first : second;
}

function expiredShortlinkResponse(request: Request, expiresAt: Date): Response {
  const response = apiError(410, "SHORTLINK_EXPIRED", "Shortlink has expired", {
    Expires: expiresAt.toUTCString(),
    "X-Shortlink-Expires-At": expiresAt.toISOString(),
  });
  return request.method === "HEAD"
    ? new Response(null, {
        status: response.status,
        headers: response.headers,
      })
    : response;
}

function trackShortlinkClick(
  request: Request,
  code: string,
  campaign: ShortlinkCampaign | undefined,
  analytics: ShortlinkAnalytics,
): void {
  const referrerOrigin = safeReferrerOrigin(request.headers.get("referer"));
  try {
    analytics.writeDataPoint({
      blobs: [
        code,
        campaign?.name ?? "",
        campaign?.source ?? "",
        campaign?.medium ?? "",
        referrerOrigin,
      ],
      doubles: [1],
      indexes: [code],
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        event: "shortlink_analytics_write_failed",
        message: "shortlink analytics write failed",
      }),
    );
  }
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

function isFiniteDate(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasControlCharacters(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) return true;
  }
  return false;
}

function invalidCampaignMessage(): string {
  return "Campaign values must use letters, numbers, dots, underscores, or hyphens and be at most 64 characters";
}

function invalidExpirationMessage(): string {
  return "expiresAt must be a future ISO-8601 UTC timestamp";
}

export function isValidShortlinkCode(code: string): boolean {
  return SHORTLINK_CODE_PATTERN.test(code);
}

export function parseShortlinkRecord(value: unknown): ShortlinkRecord | null {
  if (!isObjectRecord(value)) return null;

  const input = value;
  const hasPath = "path" in input;
  const hasTarget = "target" in input;
  if (hasPath === hasTarget) return null;
  const path = input.path;
  const target = input.target;
  if (hasPath && typeof path !== "string") return null;
  if (hasTarget && typeof target !== "string") return null;
  if (input.expiresAt !== undefined && typeof input.expiresAt !== "string") {
    return null;
  }
  if (
    typeof input.expiresAt === "string" &&
    !parseStoredExpiration(input.expiresAt)
  ) {
    return null;
  }

  const campaign = parseCampaign(input.campaign);
  if (campaign.error) return null;

  const record: ShortlinkRecord = {};
  if (typeof path === "string") record.path = path;
  if (typeof target === "string") record.target = target;
  if (typeof input.expiresAt === "string") record.expiresAt = input.expiresAt;
  if (campaign.campaign) record.campaign = campaign.campaign;
  return record;
}

function methodNotAllowed(): Response {
  return apiError(405, "METHOD_NOT_ALLOWED", "Method not allowed", {
    Allow: ALLOWED_METHODS,
  });
}

function shortlinkNotFound(): Response {
  return apiError(404, "SHORTLINK_NOT_FOUND", "Shortlink not found");
}
