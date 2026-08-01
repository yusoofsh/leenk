import { SHORTLINK_STORAGE_PREFIX } from "./shortlink-constants";
import {
  parseShortlinkRecord,
  type ShortlinkRecord,
  type ShortlinkStorage,
} from "./shortlinks";

export interface ShortlinkR2Bucket {
  delete(key: string): Promise<void>;
  get(key: string): Promise<ShortlinkR2ObjectBody | null>;
  put(
    key: string,
    value: string,
    options?: R2PutOptions,
  ): Promise<object | null>;
}

interface ShortlinkR2ObjectBody {
  json(): Promise<unknown>;
}

export function createR2ShortlinkStorage(
  bucket: ShortlinkR2Bucket,
): ShortlinkStorage {
  return {
    async delete(code) {
      await bucket.delete(storageKey(code));
    },
    async get(code) {
      const object = await bucket.get(storageKey(code));
      if (!object) return null;
      return parseShortlinkRecord(await object.json());
    },
    async putIfAbsent(code, record: ShortlinkRecord) {
      const object = await bucket.put(
        storageKey(code),
        JSON.stringify(record),
        {
          httpMetadata: {
            cacheControl: "public, max-age=300",
            contentType: "application/json",
          },
          onlyIf: new Headers({ "If-None-Match": "*" }),
        },
      );
      return object !== null;
    },
  };
}

function storageKey(code: string): string {
  return `${SHORTLINK_STORAGE_PREFIX}${code}`;
}
