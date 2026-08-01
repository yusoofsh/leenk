import { describe, expect, it } from "vitest";

import {
  createR2ShortlinkStorage,
  type ShortlinkR2Bucket,
} from "./shortlink-storage";

describe("createR2ShortlinkStorage", () => {
  it("stores mappings under a private prefix with an atomic absent condition", async () => {
    const puts: Array<{
      body: unknown;
      key: string;
      options: R2PutOptions;
    }> = [];
    const bucket: ShortlinkR2Bucket = {
      async delete() {},
      async get() {
        return null;
      },
      async put(key: string, body: string, options: R2PutOptions = {}) {
        puts.push({ body, key, options });
        return {};
      },
    };

    const storage = createR2ShortlinkStorage(bucket);

    expect(await storage.putIfAbsent("aB3x", { path: "docs/guide.pdf" })).toBe(
      true,
    );
    expect(puts).toHaveLength(1);
    const put = puts[0];
    if (!put) throw new Error("Expected one R2 put call");
    expect(put.key).toBe("__shortlinks/aB3x");
    expect(put.body).toBe('{"path":"docs/guide.pdf"}');
    expect(put.options.onlyIf).toBeInstanceOf(Headers);
    const onlyIf = put.options.onlyIf;
    if (!(onlyIf instanceof Headers)) {
      throw new Error("Expected an If-None-Match header condition");
    }
    expect(onlyIf.get("If-None-Match")).toBe("*");
  });

  it("parses stored mappings", async () => {
    const bucket: ShortlinkR2Bucket = {
      async delete() {},
      async get() {
        return {
          async json() {
            return { path: "docs/guide.pdf" };
          },
        };
      },
      async put() {
        return null;
      },
    };

    const storage = createR2ShortlinkStorage(bucket);

    await expect(storage.get("aB3x")).resolves.toEqual({
      path: "docs/guide.pdf",
    });
  });
});
