export async function authorizeMutation(
  request: Request,
  uploadToken: string | undefined,
  unavailableCode: string,
  unavailableMessage: string,
): Promise<Response | null> {
  if (!uploadToken) {
    return apiError(503, unavailableCode, unavailableMessage);
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

  return null;
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
