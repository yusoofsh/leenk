import { describe, expect, it } from "vitest";

import {
  MAX_STATIC_FILE_SIZE,
  handleStaticFileRequest,
  type StaticFileMetadata,
  type StaticFileObject,
  type StaticFileStorage,
} from "./static-files";

class MemoryStaticFileStorage implements StaticFileStorage {
  readonly objects = new Map<
    string,
    { body: Uint8Array; metadata: StaticFileMetadata; uploaded: Date }
  >();

  async get(key: string): Promise<StaticFileObject | null> {
    const object = this.objects.get(key);
    if (!object) return null;

    return this.toObject(key, object, true);
  }

  async head(key: string): Promise<StaticFileObject | null> {
    const object = this.objects.get(key);
    if (!object) return null;

    return this.toObject(key, object, false);
  }

  async put(
    key: string,
    value: ReadableStream<Uint8Array>,
    metadata: StaticFileMetadata,
  ): Promise<StaticFileObject> {
    const body = new Uint8Array(await new Response(value).arrayBuffer());
    const object = {
      body,
      metadata,
      uploaded: new Date("2026-07-13T00:00:00Z"),
    };
    this.objects.set(key, object);
    return this.toObject(key, object, false);
  }

  private toObject(
    key: string,
    object: { body: Uint8Array; metadata: StaticFileMetadata; uploaded: Date },
    includeBody: boolean,
  ): StaticFileObject {
    return {
      body: includeBody
        ? new ReadableStream<Uint8Array>({
            start(controller) {
              controller.enqueue(object.body);
              controller.close();
            },
          })
        : null,
      httpEtag: `"${key}-${object.body.byteLength}"`,
      metadata: object.metadata,
      size: object.body.byteLength,
      uploaded: object.uploaded,
    };
  }
}

const token = "correct-horse-battery-staple";

describe("handleStaticFileRequest", () => {
  it("rejects an upload without the bearer token", async () => {
    const storage = new MemoryStaticFileStorage();
    const request = new Request("https://www.yusoofsh.id/static/example.html", {
      method: "POST",
      body: "<h1>Hello</h1>",
    });

    const response = await handleStaticFileRequest(
      request,
      "example.html",
      storage,
      token,
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "A valid upload token is required",
      },
    });
    expect(storage.objects.size).toBe(0);
  });

  it("streams a binary upload and preserves its HTTP metadata", async () => {
    const storage = new MemoryStaticFileStorage();
    const bytes = new Uint8Array([137, 80, 78, 71]);
    const request = new Request(
      "https://www.yusoofsh.id/static/images/logo.png",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "cache-control": "public, max-age=3600",
          "content-length": String(bytes.byteLength),
          "content-type": "image/png",
        },
        body: bytes,
      },
    );

    const response = await handleStaticFileRequest(
      request,
      "images/logo.png",
      storage,
      token,
    );

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      etag: '"images/logo.png-4"',
      path: "images/logo.png",
      size: 4,
      url: "https://www.yusoofsh.id/static/images/logo.png",
    });
    expect(storage.objects.get("images/logo.png")).toMatchObject({
      body: bytes,
      metadata: {
        cacheControl: "public, max-age=3600",
        contentType: "image/png",
      },
    });
  });

  it("serves a stored object with its metadata", async () => {
    const storage = new MemoryStaticFileStorage();
    storage.objects.set("docs/guide.pdf", {
      body: new Uint8Array([37, 80, 68, 70]),
      metadata: {
        cacheControl: "public, max-age=300",
        contentType: "application/pdf",
      },
      uploaded: new Date("2026-07-13T00:00:00Z"),
    });
    const request = new Request(
      "https://www.yusoofsh.id/static/docs/guide.pdf",
    );

    const response = await handleStaticFileRequest(
      request,
      "docs/guide.pdf",
      storage,
      token,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    expect(response.headers.get("content-length")).toBe("4");
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("etag")).toBe('"docs/guide.pdf-4"');
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([37, 80, 68, 70]),
    );
  });

  it("returns metadata without a body for HEAD", async () => {
    const storage = new MemoryStaticFileStorage();
    storage.objects.set("hello.html", {
      body: new TextEncoder().encode("<h1>Hello</h1>"),
      metadata: {
        cacheControl: "public, max-age=300",
        contentType: "text/html",
      },
      uploaded: new Date("2026-07-13T00:00:00Z"),
    });
    const request = new Request("https://www.yusoofsh.id/static/hello.html", {
      method: "HEAD",
    });

    const response = await handleStaticFileRequest(
      request,
      "hello.html",
      storage,
      token,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-length")).toBe("14");
    expect(await response.text()).toBe("");
  });

  it("returns 404 for a missing object", async () => {
    const storage = new MemoryStaticFileStorage();
    const request = new Request("https://www.yusoofsh.id/static/missing.png");

    const response = await handleStaticFileRequest(
      request,
      "missing.png",
      storage,
      token,
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "NOT_FOUND", message: "Static file not found" },
    });
  });

  it("rejects invalid object paths", async () => {
    const storage = new MemoryStaticFileStorage();
    const request = new Request("https://www.yusoofsh.id/static/file", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: "data",
    });

    const response = await handleStaticFileRequest(
      request,
      "../secret",
      storage,
      token,
    );

    expect(response.status).toBe(400);
    expect(storage.objects.size).toBe(0);
  });

  it("rejects uploads larger than 100 MiB before reading the body", async () => {
    const storage = new MemoryStaticFileStorage();
    const request = new Request("https://www.yusoofsh.id/static/large.pdf", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-length": String(MAX_STATIC_FILE_SIZE + 1),
      },
      body: "data",
    });

    const response = await handleStaticFileRequest(
      request,
      "large.pdf",
      storage,
      token,
    );

    expect(response.status).toBe(413);
    expect(storage.objects.size).toBe(0);
  });

  it("requires Content-Length so the upload limit cannot be bypassed", async () => {
    const storage = new MemoryStaticFileStorage();
    const request = new Request("https://www.yusoofsh.id/static/chunked.pdf", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: "data",
    });

    const response = await handleStaticFileRequest(
      request,
      "chunked.pdf",
      storage,
      token,
    );

    expect(response.status).toBe(411);
    expect(storage.objects.size).toBe(0);
  });

  it("returns Allow for unsupported methods", async () => {
    const storage = new MemoryStaticFileStorage();
    const request = new Request("https://www.yusoofsh.id/static/example.html", {
      method: "DELETE",
    });

    const response = await handleStaticFileRequest(
      request,
      "example.html",
      storage,
      token,
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD, POST");
  });
});
