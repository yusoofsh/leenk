export interface DashboardBindings {
  accountId: string | undefined;
  analyticsToken: string | undefined;
  cms: unknown;
  staticFiles: R2Bucket | undefined;
  staticUploadToken: string | undefined;
}

export function readDashboardBindings(env: unknown): DashboardBindings {
  const value = (key: string): unknown => Reflect.get(Object(env), key);
  const stringValue = (key: string): string | undefined => {
    const candidate = value(key);
    return typeof candidate === "string" && candidate.length > 0
      ? candidate
      : undefined;
  };
  const bucket = value("STATIC_FILES");
  return {
    accountId: stringValue("CLOUDFLARE_ACCOUNT_ID"),
    analyticsToken: stringValue("CLOUDFLARE_ANALYTICS_TOKEN"),
    cms: value("CMS"),
    staticFiles: isR2Bucket(bucket) ? bucket : undefined,
    staticUploadToken: stringValue("STATIC_UPLOAD_TOKEN"),
  };
}

function isR2Bucket(value: unknown): value is R2Bucket {
  return (
    typeof value === "object" &&
    value !== null &&
    "list" in value &&
    "get" in value &&
    "head" in value &&
    "put" in value &&
    "delete" in value
  );
}
