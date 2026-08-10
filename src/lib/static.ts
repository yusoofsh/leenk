import { apiError, authorizeMutation } from "./http";
import { validateObjectKey } from "./object-keys";
import {
  createShortlink,
  parseCampaignHeaders,
  parseShortlinkLabelHeader,
  type CreateShortlinkOptions,
  type RandomBytes,
  type ShortlinkResult,
  type ShortlinkStorage,
} from "./shortlinks";
import { recordSiteAnalyticsEvent, type SiteAnalytics } from "./site-analytics";

export { apiError, authorizeMutation } from "./http";
export { validateObjectKey } from "./object-keys";

export const MAX_STATIC_FILE_SIZE = 100 * 1024 * 1024;
export const DEFAULT_STATIC_FILE_TTL_MS = 14 * 24 * 60 * 60 * 1_000;

const DEFAULT_CACHE_CONTROL = "public, max-age=300";
const ALLOWED_METHODS = "GET, HEAD, POST, DELETE";
const EXPIRATION_HEADER = "X-Static-Expires-In";
const SHORTLINK_HEADER = "X-Static-Shortlink";

export interface StaticFileMetadata {
  cacheControl: string;
  contentDisposition?: string;
  contentEncoding?: string;
  contentLanguage?: string;
  contentType: string;
}

export interface StaticFileObject {
  body: ReadableStream<Uint8Array> | null;
  expiresAt?: Date;
  httpEtag: string;
  metadata: StaticFileMetadata;
  size: number;
  uploaded: Date;
}

export interface StaticFileStorage {
  delete(key: string): Promise<void>;
  get(key: string): Promise<StaticFileObject | null>;
  head(key: string): Promise<StaticFileObject | null>;
  put(
    key: string,
    value: ReadableStream<Uint8Array>,
    metadata: StaticFileMetadata,
    expiresAt?: Date,
  ): Promise<StaticFileObject>;
}

class UploadTooLargeError extends Error {}

export async function handleStaticFileRequest(
  request: Request,
  key: string | undefined,
  storage: StaticFileStorage,
  uploadToken: string | undefined,
  shortlinkStorage?: ShortlinkStorage,
  randomBytes?: RandomBytes,
  siteAnalytics?: SiteAnalytics,
): Promise<Response> {
  if (!key) return apiError(400, "INVALID_PATH", "A file path is required");
  const pathError = validateObjectKey(key);
  if (pathError) return apiError(400, "INVALID_PATH", pathError);

  try {
    switch (request.method) {
      case "GET":
        return serveObject(await storage.get(key), false);
      case "HEAD":
        return serveObject(await storage.head(key), true);
      case "POST":
        return uploadObject(
          request,
          key,
          storage,
          uploadToken,
          shortlinkStorage,
          randomBytes,
          siteAnalytics,
        );
      case "DELETE":
        return deleteObject(request, key, storage, uploadToken, siteAnalytics);
      default:
        return apiError(405, "METHOD_NOT_ALLOWED", "Method not allowed", {
          Allow: ALLOWED_METHODS,
        });
    }
  } catch (error) {
    if (error instanceof UploadTooLargeError) {
      return apiError(
        413,
        "FILE_TOO_LARGE",
        "Static files are limited to 100 MiB",
      );
    }

    console.error(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
        message: "static file request failed",
        method: request.method,
        path: key,
      }),
    );
    return apiError(500, "INTERNAL_ERROR", "Static file request failed");
  }
}

async function uploadObject(
  request: Request,
  key: string,
  storage: StaticFileStorage,
  uploadToken: string | undefined,
  shortlinkStorage: ShortlinkStorage | undefined,
  randomBytes: RandomBytes | undefined,
  siteAnalytics: SiteAnalytics | undefined,
): Promise<Response> {
  const authError = await authorizeMutation(
    request,
    uploadToken,
    "UPLOAD_NOT_CONFIGURED",
    "Static file uploads are not configured",
    "files:manage",
  );
  if (authError) return authError;

  const contentLength = parseContentLength(
    request.headers.get("content-length"),
  );
  if (contentLength === null) {
    return apiError(
      411,
      "LENGTH_REQUIRED",
      "Content-Length is required for static file uploads",
    );
  }
  if (contentLength > MAX_STATIC_FILE_SIZE) {
    return apiError(
      413,
      "FILE_TOO_LARGE",
      "Static files are limited to 100 MiB",
    );
  }
  if (contentLength === 0 || !request.body) {
    return apiError(
      400,
      "EMPTY_BODY",
      "The request body must contain the file data",
    );
  }

  const expiration = parseExpiration(request.headers.get(EXPIRATION_HEADER));
  if (expiration.error) {
    return apiError(400, "INVALID_EXPIRATION", expiration.error);
  }

  const shortlinkRequested =
    request.headers.get(SHORTLINK_HEADER)?.toLowerCase() === "true";
  const campaign = shortlinkRequested
    ? parseCampaignHeaders(request.headers)
    : {};
  if (campaign.error) return apiError(400, "INVALID_CAMPAIGN", campaign.error);
  const label = shortlinkRequested
    ? parseShortlinkLabelHeader(request.headers)
    : {};
  if (label.error) return apiError(400, "INVALID_LABEL", label.error);

  const metadata = requestMetadata(request.headers);
  // Keep the original request stream: R2 requires its Workers-specific known-length marker.
  const object = await storage.put(
    key,
    request.body,
    metadata,
    expiration.expiresAt ?? undefined,
  );
  const url = new URL(request.url);
  url.search = "";
  url.hash = "";

  const responseBody: {
    etag: string;
    expiresAt: string | null;
    path: string;
    shortlink?: ShortlinkResult;
    shortlinkError?: string;
    size: number;
    url: string;
  } = {
    etag: object.httpEtag,
    expiresAt: expiration.expiresAt?.toISOString() ?? null,
    path: key,
    size: object.size,
    url: url.toString(),
  };

  if (shortlinkRequested) {
    if (!shortlinkStorage) {
      responseBody.shortlinkError = "SHORTLINKS_NOT_CONFIGURED";
    } else {
      const options: CreateShortlinkOptions = {};
      if (expiration.expiresAt) options.expiresAt = expiration.expiresAt;
      if (campaign.campaign) options.campaign = campaign.campaign;
      if (label.label) options.label = label.label;
      try {
        responseBody.shortlink = await createShortlink(
          key,
          shortlinkStorage,
          url,
          randomBytes,
          options,
        );
      } catch (error) {
        console.error(
          JSON.stringify({
            error: error instanceof Error ? error.message : "Unknown error",
            event: "static_upload_shortlink_failed",
            message: "static upload succeeded but shortlink generation failed",
            path: key,
          }),
        );
        responseBody.shortlinkError = "SHORTLINKS_UNAVAILABLE";
      }
    }
  }

  if (siteAnalytics && responseBody.shortlink) {
    recordSiteAnalyticsEvent(
      request,
      {
        dimension: "static",
        event: "shortlink_created",
        label: responseBody.shortlink.label,
      },
      siteAnalytics,
    );
  }

  if (siteAnalytics) {
    recordSiteAnalyticsEvent(
      request,
      {
        dimension: shortlinkRequested ? "with_shortlink" : "without_shortlink",
        event: "static_file_uploaded",
      },
      siteAnalytics,
    );
  }

  return Response.json(responseBody, {
    status: 201,
    headers: { "Cache-Control": "no-store" },
  });
}

async function deleteObject(
  request: Request,
  key: string,
  storage: StaticFileStorage,
  uploadToken: string | undefined,
  siteAnalytics: SiteAnalytics | undefined,
): Promise<Response> {
  const authError = await authorizeMutation(
    request,
    uploadToken,
    "DELETE_NOT_CONFIGURED",
    "Static file deletion is not configured",
    "files:manage",
  );
  if (authError) return authError;

  await storage.delete(key);
  if (siteAnalytics) {
    recordSiteAnalyticsEvent(
      request,
      { event: "static_file_deleted" },
      siteAnalytics,
    );
  }
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}

function serveObject(
  object: StaticFileObject | null,
  headOnly: boolean,
): Response {
  if (!object) return apiError(404, "NOT_FOUND", "Static file not found");

  if (object.expiresAt && object.expiresAt.getTime() <= Date.now()) {
    const headers = expirationHeaders(object.expiresAt);
    const response = apiError(
      410,
      "EXPIRED",
      "Static file has expired",
      headers,
    );
    return headOnly
      ? new Response(null, {
          status: response.status,
          headers: response.headers,
        })
      : response;
  }

  const headers = new Headers({
    "Cache-Control": object.expiresAt
      ? "no-store"
      : object.metadata.cacheControl,
    "Content-Length": String(object.size),
    "Content-Type": object.metadata.contentType,
    ETag: object.httpEtag,
    "Last-Modified": object.uploaded.toUTCString(),
    "X-Content-Type-Options": "nosniff",
  });
  setOptionalHeader(
    headers,
    "Content-Disposition",
    object.metadata.contentDisposition,
  );
  setOptionalHeader(
    headers,
    "Content-Encoding",
    object.metadata.contentEncoding,
  );
  setOptionalHeader(
    headers,
    "Content-Language",
    object.metadata.contentLanguage,
  );
  if (object.expiresAt) {
    const expiresAtHeaders = expirationHeaders(object.expiresAt);
    for (const [name, value] of expiresAtHeaders) headers.set(name, value);
  }

  return new Response(headOnly ? null : object.body, { headers });
}

function parseExpiration(value: string | null): {
  error?: string;
  expiresAt?: Date | null;
} {
  if (value === "never") return { expiresAt: null };
  if (value === null) {
    return { expiresAt: new Date(Date.now() + DEFAULT_STATIC_FILE_TTL_MS) };
  }

  const match = /^(?<amount>[1-9]\d*)(?<unit>[mhd])$/.exec(value);
  if (!match?.groups) return { error: invalidExpirationMessage() };

  const amount = Number(match.groups.amount);
  const multiplier =
    match.groups.unit === "m"
      ? 60 * 1_000
      : match.groups.unit === "h"
        ? 60 * 60 * 1_000
        : 24 * 60 * 60 * 1_000;
  const ttl = amount * multiplier;
  const expiresAt = new Date(Date.now() + ttl);
  if (!Number.isSafeInteger(ttl) || !Number.isFinite(expiresAt.getTime())) {
    return { error: invalidExpirationMessage() };
  }

  return { expiresAt };
}

function invalidExpirationMessage(): string {
  return "X-Static-Expires-In must be 'never' or a duration such as 30m, 12h, or 14d";
}

function expirationHeaders(expiresAt: Date): Headers {
  return new Headers({
    Expires: expiresAt.toUTCString(),
    "X-Static-Expires-At": expiresAt.toISOString(),
  });
}

function requestMetadata(headers: Headers): StaticFileMetadata {
  const metadata: StaticFileMetadata = {
    cacheControl: headers.get("cache-control") ?? DEFAULT_CACHE_CONTROL,
    contentType: headers.get("content-type") ?? "application/octet-stream",
  };
  copyHeader(headers, "content-disposition", metadata, "contentDisposition");
  copyHeader(headers, "content-encoding", metadata, "contentEncoding");
  copyHeader(headers, "content-language", metadata, "contentLanguage");
  return metadata;
}

function parseContentLength(value: string | null): number | null {
  if (value === null) return null;
  if (!/^\d+$/.test(value)) throw new UploadTooLargeError();

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new UploadTooLargeError();
  return parsed;
}

function copyHeader(
  headers: Headers,
  headerName: string,
  metadata: StaticFileMetadata,
  metadataName: "contentDisposition" | "contentEncoding" | "contentLanguage",
): void {
  const value = headers.get(headerName);
  if (value) metadata[metadataName] = value;
}

function setOptionalHeader(
  headers: Headers,
  name: string,
  value: string | undefined,
): void {
  if (value) headers.set(name, value);
}
