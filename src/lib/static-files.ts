export const MAX_STATIC_FILE_SIZE = 100 * 1024 * 1024;

const DEFAULT_CACHE_CONTROL = "public, max-age=300";
const ALLOWED_METHODS = "GET, HEAD, POST";
const MAX_OBJECT_KEY_LENGTH = 1_024;

export interface StaticFileMetadata {
  cacheControl: string;
  contentDisposition?: string;
  contentEncoding?: string;
  contentLanguage?: string;
  contentType: string;
}

export interface StaticFileObject {
  body: ReadableStream<Uint8Array> | null;
  httpEtag: string;
  metadata: StaticFileMetadata;
  size: number;
  uploaded: Date;
}

export interface StaticFileStorage {
  get(key: string): Promise<StaticFileObject | null>;
  head(key: string): Promise<StaticFileObject | null>;
  put(
    key: string,
    value: ReadableStream<Uint8Array>,
    metadata: StaticFileMetadata,
  ): Promise<StaticFileObject>;
}

class UploadTooLargeError extends Error {}

export async function handleStaticFileRequest(
  request: Request,
  key: string | undefined,
  storage: StaticFileStorage,
  uploadToken: string | undefined,
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
        return uploadObject(request, key, storage, uploadToken);
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
): Promise<Response> {
  if (!uploadToken) {
    return apiError(
      503,
      "UPLOAD_NOT_CONFIGURED",
      "Static file uploads are not configured",
    );
  }

  const authorization = request.headers.get("authorization");
  const providedToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  if (!providedToken || !(await tokensMatch(providedToken, uploadToken))) {
    return apiError(401, "UNAUTHORIZED", "A valid upload token is required", {
      "WWW-Authenticate": "Bearer",
    });
  }

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

  const metadata = requestMetadata(request.headers);
  // Keep the original request stream: R2 requires its Workers-specific known-length marker.
  const object = await storage.put(key, request.body, metadata);
  const url = new URL(request.url);
  url.search = "";
  url.hash = "";

  return Response.json(
    {
      etag: object.httpEtag,
      path: key,
      size: object.size,
      url: url.toString(),
    },
    {
      status: 201,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

function serveObject(
  object: StaticFileObject | null,
  headOnly: boolean,
): Response {
  if (!object) return apiError(404, "NOT_FOUND", "Static file not found");

  const headers = new Headers({
    "Cache-Control": object.metadata.cacheControl,
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

  return new Response(headOnly ? null : object.body, { headers });
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

function validateObjectKey(key: string): string | null {
  if (key.length > MAX_OBJECT_KEY_LENGTH) return "The file path is too long";
  if (key.includes("\\") || key.includes("\0"))
    return "The file path is invalid";

  const segments = key.split("/");
  if (
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return "The file path is invalid";
  }

  return null;
}

function parseContentLength(value: string | null): number | null {
  if (value === null) return null;
  if (!/^\d+$/.test(value)) throw new UploadTooLargeError();

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) throw new UploadTooLargeError();
  return parsed;
}

async function tokensMatch(
  provided: string,
  expected: string,
): Promise<boolean> {
  const encoder = new TextEncoder();
  const [providedHash, expectedHash] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  const subtle = crypto.subtle as SubtleCrypto & {
    timingSafeEqual?: (a: ArrayBuffer, b: ArrayBuffer) => boolean;
  };
  if (subtle.timingSafeEqual)
    return subtle.timingSafeEqual(providedHash, expectedHash);

  const a = new Uint8Array(providedHash);
  const b = new Uint8Array(expectedHash);
  let mismatch = 0;
  for (let index = 0; index < a.length; index += 1)
    mismatch |= a[index]! ^ b[index]!;
  return mismatch === 0;
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

function apiError(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit,
): Response {
  const responseHeaders = new Headers(headers);
  responseHeaders.set("Cache-Control", "no-store");
  return Response.json(
    { error: { code, message } },
    {
      status,
      headers: responseHeaders,
    },
  );
}
