import type { DashboardCapability } from "./auth-guard";

async function sessionAllows(
  request: Request,
  capability: DashboardCapability,
): Promise<boolean> {
  try {
    const { sessionAllows: check } = await import("./session-auth");
    return await check(request, capability);
  } catch {
    // Outside the Worker runtime (tests, local tooling) the auth module is
    // not available; the token path remains the fallback.
    return false;
  }
}

export async function authorizeMutation(
  request: Request,
  uploadToken: string | undefined,
  unavailableCode: string,
  unavailableMessage: string,
  capability?: DashboardCapability,
): Promise<Response | null> {
  const authorization = request.headers.get("authorization");
  const providedToken = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : "";
  if (
    uploadToken &&
    providedToken &&
    (await tokensMatch(providedToken, uploadToken))
  ) {
    return null;
  }
  if (capability && (await sessionAllows(request, capability))) {
    return null;
  }

  if (!uploadToken) {
    return apiError(503, unavailableCode, unavailableMessage);
  }
  return apiError(401, "UNAUTHORIZED", "A valid upload token is required", {
    "WWW-Authenticate": "Bearer",
  });
}

export function apiError(
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

export async function tokensMatch(
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
