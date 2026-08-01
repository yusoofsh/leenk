import { SHORTLINK_STORAGE_PREFIX } from "./shortlink-constants";

const MAX_OBJECT_KEY_LENGTH = 1_024;

export function validateObjectKey(key: string): string | null {
  if (key.length > MAX_OBJECT_KEY_LENGTH) return "The file path is too long";
  if (key.startsWith(SHORTLINK_STORAGE_PREFIX))
    return "The file path is reserved";
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
