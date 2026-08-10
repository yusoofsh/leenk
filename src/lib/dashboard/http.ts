export const DASHBOARD_READ_CACHE =
  "private, max-age=60, stale-while-revalidate=300";
export const DASHBOARD_NO_STORE = "no-store";

export interface DashboardMeta {
  legacy?: boolean;
  range?: {
    end: string;
    start: string;
  };
  sampled?: boolean;
  source?: string;
}

export function dashboardOk(
  data: unknown,
  meta?: DashboardMeta,
  headers?: HeadersInit,
): Response {
  const responseHeaders = new Headers(headers);
  if (!responseHeaders.has("Cache-Control")) {
    responseHeaders.set("Cache-Control", DASHBOARD_READ_CACHE);
  }
  return Response.json(
    {
      ok: true,
      data,
      ...(meta ? { meta } : {}),
    },
    { headers: responseHeaders },
  );
}

export function dashboardError(
  status: number,
  error: string,
  message: string,
): Response {
  return Response.json(
    {
      ok: false,
      error,
      message,
      status,
    },
    {
      status,
      headers: { "Cache-Control": DASHBOARD_NO_STORE },
    },
  );
}

export function dashboardMutationError(
  status: number,
  error: string,
  message: string,
): Response {
  return dashboardError(status, error, message);
}

export async function authorizeDashboardMutation(
  request: Request,
  uploadToken: string | undefined,
): Promise<Response | null> {
  if (!uploadToken) {
    return dashboardError(
      503,
      "DASHBOARD_MUTATIONS_NOT_CONFIGURED",
      "Dashboard writes are not configured",
    );
  }

  const provided = request.headers.get("x-upload-token") ?? "";
  if (!provided || !(await tokensMatch(provided, uploadToken))) {
    return dashboardError(
      401,
      "UNAUTHORIZED",
      "A valid upload token is required",
    );
  }
  return null;
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
