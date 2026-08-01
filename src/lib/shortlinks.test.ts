import { describe, expect, it } from "vitest";

import {
  SHORTLINK_ATTEMPTS_PER_LENGTH,
  createInternalShortlink,
  createShortlink,
  handleShortlinkRequest,
  type RandomBytes,
  type ShortlinkAnalytics,
  type ShortlinkRecord,
  type ShortlinkStorage,
  type ShortlinkTargetStorage,
  validateInternalTarget,
} from "./shortlinks";

class MemoryShortlinkStorage implements ShortlinkStorage {
  readonly records = new Map<string, ShortlinkRecord>();

  async get(code: string): Promise<ShortlinkRecord | null> {
    return this.records.get(code) ?? null;
  }

  async putIfAbsent(code: string, record: ShortlinkRecord): Promise<boolean> {
    if (this.records.has(code)) return false;
    this.records.set(code, record);
    return true;
  }

  async delete(code: string): Promise<void> {
    this.records.delete(code);
  }
}

class MemoryShortlinkTargetStorage implements ShortlinkTargetStorage {
  readonly expirations = new Map<string, Date>();
  readonly paths = new Set<string>();

  async exists(path: string): Promise<boolean> {
    return this.paths.has(path);
  }

  async get(path: string): Promise<{ expiresAt?: Date } | null> {
    if (!this.paths.has(path)) return null;
    const expiresAt = this.expirations.get(path);
    return expiresAt ? { expiresAt } : {};
  }
}

class MemoryShortlinkAnalytics implements ShortlinkAnalytics {
  readonly events: Array<{
    blobs?: string[];
    doubles?: number[];
    indexes?: string[];
  }> = [];

  writeDataPoint(event: {
    blobs?: string[];
    doubles?: number[];
    indexes?: string[];
  }): void {
    this.events.push(event);
  }
}

const token = "correct-horse-battery-staple";
const targetPath = "docs/guide.pdf";

function constantRandomBytes(value: number): RandomBytes {
  return (length) => new Uint8Array(length).fill(value);
}

function createRequest(
  url: string,
  method: string,
  body?: string,
  headers?: Record<string, string>,
): Request {
  return new Request(url, {
    method,
    body: body ?? null,
    headers: {
      ...(body
        ? {
            "content-length": String(new TextEncoder().encode(body).byteLength),
          }
        : {}),
      ...headers,
    },
  });
}

describe("createShortlink", () => {
  it("allocates the shortest four-character base62 code", async () => {
    const storage = new MemoryShortlinkStorage();

    const result = await createShortlink(
      targetPath,
      storage,
      new URL("https://yusoofsh.id/api/shortlinks"),
      constantRandomBytes(0),
    );

    expect(result).toEqual({
      code: "0000",
      path: targetPath,
      shortUrl: "https://yusoofsh.id/0000",
      targetUrl: "https://yusoofsh.id/static/docs/guide.pdf",
    });
    expect(storage.records.get("0000")).toEqual({ path: targetPath });
  });

  it("skips an occupied code without overwriting its target", async () => {
    const storage = new MemoryShortlinkStorage();
    storage.records.set("0000", { path: "docs/other.pdf" });

    let calls = 0;
    const result = await createShortlink(
      targetPath,
      storage,
      new URL("https://yusoofsh.id/api/shortlinks"),
      (length) => {
        const value = calls++ === 0 ? 0 : 1;
        return new Uint8Array(length).fill(value);
      },
    );

    expect(result.code).toBe("1111");
    expect(storage.records.get("0000")).toEqual({ path: "docs/other.pdf" });
  });

  it("grows to five characters only after the four-character attempts are exhausted", async () => {
    const storage = new MemoryShortlinkStorage();
    storage.records.set("0000", { path: "docs/other.pdf" });

    let attempts = 0;
    const result = await createShortlink(
      targetPath,
      storage,
      new URL("https://yusoofsh.id/api/shortlinks"),
      (length) => {
        attempts += 1;
        return new Uint8Array(length).fill(0);
      },
    );

    expect(attempts).toBe(SHORTLINK_ATTEMPTS_PER_LENGTH + 1);
    expect(result.code).toBe("00000");
  });
});

describe("handleShortlinkRequest", () => {
  it("creates a link only for an existing static object", async () => {
    const storage = new MemoryShortlinkStorage();
    const targets = new MemoryShortlinkTargetStorage();
    targets.paths.add(targetPath);
    const body = JSON.stringify({ path: targetPath });

    const response = await handleShortlinkRequest(
      createRequest("https://yusoofsh.id/api/shortlinks", "POST", body, {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      }),
      undefined,
      storage,
      token,
      targets,
      constantRandomBytes(0),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      code: "0000",
      path: targetPath,
      shortUrl: "https://yusoofsh.id/0000",
      targetUrl: "https://yusoofsh.id/static/docs/guide.pdf",
    });
  });

  it("rejects a shortlink request for a missing static object", async () => {
    const storage = new MemoryShortlinkStorage();
    const targets = new MemoryShortlinkTargetStorage();
    const body = JSON.stringify({ path: targetPath });

    const response = await handleShortlinkRequest(
      createRequest("https://yusoofsh.id/api/shortlinks", "POST", body, {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      }),
      undefined,
      storage,
      token,
      targets,
      constantRandomBytes(0),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: {
        code: "STATIC_TARGET_NOT_FOUND",
        message: "The static file does not exist",
      },
    });
    expect(storage.records.size).toBe(0);
  });

  it("requires the upload token to create a link", async () => {
    const body = JSON.stringify({ path: targetPath });

    const response = await handleShortlinkRequest(
      createRequest("https://yusoofsh.id/api/shortlinks", "POST", body),
      undefined,
      new MemoryShortlinkStorage(),
      token,
      new MemoryShortlinkTargetStorage(),
      constantRandomBytes(0),
    );

    expect(response.status).toBe(401);
  });

  it("redirects a four-character code to the static file", async () => {
    const storage = new MemoryShortlinkStorage();
    storage.records.set("0000", { path: targetPath });

    const response = await handleShortlinkRequest(
      createRequest("https://yusoofsh.id/0000", "GET"),
      "0000",
      storage,
      token,
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://yusoofsh.id/static/docs/guide.pdf",
    );
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
  });

  it("returns a bodyless redirect for HEAD", async () => {
    const storage = new MemoryShortlinkStorage();
    storage.records.set("0000", { path: targetPath });

    const response = await handleShortlinkRequest(
      createRequest("https://yusoofsh.id/0000", "HEAD"),
      "0000",
      storage,
      token,
    );

    expect(response.status).toBe(302);
    expect(await response.text()).toBe("");
  });

  it("deletes a link idempotently with the upload token", async () => {
    const storage = new MemoryShortlinkStorage();
    storage.records.set("0000", { path: targetPath });

    const response = await handleShortlinkRequest(
      createRequest(
        "https://yusoofsh.id/api/shortlinks/0000",
        "DELETE",
        undefined,
        {
          authorization: `Bearer ${token}`,
        },
      ),
      "0000",
      storage,
      token,
    );

    expect(response.status).toBe(204);
    expect(storage.records.has("0000")).toBe(false);
  });

  it("rejects malformed codes before reading storage", async () => {
    const storage = new MemoryShortlinkStorage();

    const response = await handleShortlinkRequest(
      createRequest("https://yusoofsh.id/nope!", "GET"),
      "nope!",
      storage,
      token,
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: {
        code: "SHORTLINK_NOT_FOUND",
        message: "Shortlink not found",
      },
    });
    expect(storage.records.size).toBe(0);
  });
});

describe("extended shortlink behavior", () => {
  it("creates an internal alias without allowing external redirects", async () => {
    const storage = new MemoryShortlinkStorage();

    const result = await createInternalShortlink(
      "/github?source=home",
      storage,
      new URL("https://yusoofsh.id/api/shortlinks"),
      constantRandomBytes(0),
    );

    expect(result).toEqual({
      code: "0000",
      shortUrl: "https://yusoofsh.id/0000",
      target: "/github?source=home",
      targetUrl: "https://yusoofsh.id/github?source=home",
    });
    expect(validateInternalTarget("https://evil.example/")).toBe(
      "The internal target must be a same-origin path",
    );
    expect(validateInternalTarget("/api/shortlinks/0000")).toBe(
      "The internal target is reserved",
    );
    expect(validateInternalTarget("/0000")).toBe(
      "The internal target cannot point to another shortlink",
    );
  });

  it("inherits a static target expiration and clamps a requested expiration", async () => {
    const storage = new MemoryShortlinkStorage();
    const targets = new MemoryShortlinkTargetStorage();
    targets.paths.add(targetPath);
    targets.expirations.set(targetPath, new Date("2099-01-01T00:00:00.000Z"));
    const body = JSON.stringify({
      expiresAt: "2099-02-01T00:00:00.000Z",
      path: targetPath,
    });

    const response = await handleShortlinkRequest(
      createRequest("https://yusoofsh.id/api/shortlinks", "POST", body, {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      }),
      undefined,
      storage,
      token,
      targets,
      constantRandomBytes(0),
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({
      code: "0000",
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
    expect(storage.records.get("0000")).toMatchObject({
      expiresAt: "2099-01-01T00:00:00.000Z",
    });
  });

  it("rejects a static target that has already expired", async () => {
    const targets = new MemoryShortlinkTargetStorage();
    targets.paths.add(targetPath);
    targets.expirations.set(targetPath, new Date("2000-01-01T00:00:00.000Z"));

    const response = await handleShortlinkRequest(
      createRequest(
        "https://yusoofsh.id/api/shortlinks",
        "POST",
        JSON.stringify({ path: targetPath }),
        {
          authorization: `Bearer ${token}`,
          "content-type": "application/json",
        },
      ),
      undefined,
      new MemoryShortlinkStorage(),
      token,
      targets,
      constantRandomBytes(0),
    );

    expect(response.status).toBe(410);
    expect(await response.json()).toEqual({
      error: {
        code: "STATIC_TARGET_EXPIRED",
        message: "The static file has expired",
      },
    });
  });

  it("returns 410 and no body for an expired shortlink", async () => {
    const storage = new MemoryShortlinkStorage();
    storage.records.set("0000", {
      expiresAt: "2000-01-01T00:00:00.000Z",
      path: targetPath,
    });

    const response = await handleShortlinkRequest(
      createRequest("https://yusoofsh.id/0000", "HEAD"),
      "0000",
      storage,
      token,
    );

    expect(response.status).toBe(410);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-shortlink-expires-at")).toBe(
      "2000-01-01T00:00:00.000Z",
    );
    expect(await response.text()).toBe("");
  });

  it("records campaign clicks with a bounded referrer origin", async () => {
    const storage = new MemoryShortlinkStorage();
    const analytics = new MemoryShortlinkAnalytics();
    storage.records.set("0000", {
      campaign: { medium: "email", name: "spring", source: "newsletter" },
      path: targetPath,
    });

    const response = await handleShortlinkRequest(
      createRequest("https://yusoofsh.id/0000", "GET", undefined, {
        referer: "https://campaign.example/landing?email=user@example.com",
      }),
      "0000",
      storage,
      token,
      undefined,
      constantRandomBytes(0),
      analytics,
    );

    expect(response.status).toBe(302);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(analytics.events).toEqual([
      {
        blobs: [
          "0000",
          "spring",
          "newsletter",
          "email",
          "https://campaign.example",
        ],
        doubles: [1],
        indexes: ["0000"],
      },
    ]);
  });
});
