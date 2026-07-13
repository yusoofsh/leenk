import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";

import {
  handleStaticFileRequest,
  type StaticFileMetadata,
  type StaticFileObject,
  type StaticFileStorage,
} from "~/lib/static-files";

function toStaticFileObject(object: R2Object | R2ObjectBody): StaticFileObject {
  const metadata = object.httpMetadata;
  const result: StaticFileObject = {
    body: "body" in object ? object.body : null,
    httpEtag: object.httpEtag,
    metadata: {
      cacheControl: metadata?.cacheControl ?? "public, max-age=300",
      contentType: metadata?.contentType ?? "application/octet-stream",
    },
    size: object.size,
    uploaded: object.uploaded,
  };
  if (metadata?.contentDisposition) {
    result.metadata.contentDisposition = metadata.contentDisposition;
  }
  if (metadata?.contentEncoding)
    result.metadata.contentEncoding = metadata.contentEncoding;
  if (metadata?.contentLanguage)
    result.metadata.contentLanguage = metadata.contentLanguage;
  return result;
}

function createStorage(bucket: R2Bucket): StaticFileStorage {
  return {
    async get(key) {
      const object = await bucket.get(key);
      return object ? toStaticFileObject(object) : null;
    },
    async head(key) {
      const object = await bucket.head(key);
      return object ? toStaticFileObject(object) : null;
    },
    async put(key, value, metadata: StaticFileMetadata) {
      const object = await bucket.put(key, value, { httpMetadata: metadata });
      return toStaticFileObject(object);
    },
  };
}

function uploadToken(): string | undefined {
  const value: unknown = Reflect.get(env, "STATIC_UPLOAD_TOKEN");
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

const route: APIRoute = ({ params, request }) => {
  return handleStaticFileRequest(
    request,
    params.path,
    createStorage(env.STATIC_FILES),
    uploadToken(),
  );
};

export const GET = route;
export const HEAD = route;
export const POST = route;
export const ALL = route;
