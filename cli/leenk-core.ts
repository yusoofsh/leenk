import { basename } from "node:path";
import { fileURLToPath } from "node:url";

export interface UploadArguments {
  campaign: string | undefined;
  expiration: string | undefined;
  filePath: string;
  label: string | undefined;
  medium: string | undefined;
  remotePath: string | undefined;
  shortlink: boolean;
  source: string | undefined;
}

export interface UploadResult {
  etag: string;
  expiresAt: string | null;
  path: string;
  shortlink?: { label?: string; shortUrl: string };
  shortlinkError?: string;
  size: number;
  url: string;
}

const CAMPAIGN_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const EXPIRATION_PATTERN = /^[1-9][0-9]*[mhd]$/;

const CONTENT_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".css": "text/css; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".gif": "image/gif",
  ".htm": "text/html; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".md": "text/markdown; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
  ".xml": "application/xml",
  ".zip": "application/zip",
};

export function normalizeFileInput(input: string): string {
  if (!input.startsWith("file://")) return input;
  return fileURLToPath(input);
}

export function validateRemotePath(path: string): string | null {
  if (!path) return "remote path cannot be empty";
  if (path.startsWith("/")) return "remote path must not start with /";
  if (path.endsWith("/")) return "remote path must name a file";
  if (path.startsWith("__shortlinks/")) return "remote path is reserved";
  if (
    path
      .split("/")
      .some((segment) => !segment || segment === "." || segment === "..")
  ) {
    return "remote path contains an invalid segment";
  }
  return null;
}

export function buildObjectUrl(origin: string, path: string): string {
  return new URL(`${origin.replace(/\/$/, "")}/static/${path}`).toString();
}

export function contentTypeForPath(path: string): string {
  const dot = path.lastIndexOf(".");
  const extension = dot >= 0 ? path.slice(dot).toLowerCase() : "";
  return CONTENT_TYPES[extension] ?? "application/octet-stream";
}

export function defaultRemotePath(filePath: string): string {
  return basename(normalizeFileInput(filePath));
}

export function parseUploadArguments(args: string[]): UploadArguments {
  let expiration: string | undefined;
  let shortlink = true;
  let campaign: string | undefined;
  let label: string | undefined;
  let source: string | undefined;
  let medium: string | undefined;
  const positional: string[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    if (argument === "--expires") {
      index += 1;
      if (index >= args.length) throw new Error("--expires requires a value");
      expiration = args[index]!;
    } else if (argument.startsWith("--expires=")) {
      expiration = argument.slice("--expires=".length);
    } else if (argument === "--shortlink") {
      shortlink = true;
    } else if (argument === "--no-shortlink") {
      shortlink = false;
    } else if (argument === "--campaign") {
      index += 1;
      if (index >= args.length) throw new Error("--campaign requires a value");
      campaign = args[index]!;
    } else if (argument.startsWith("--campaign=")) {
      campaign = argument.slice("--campaign=".length);
    } else if (argument === "--label") {
      index += 1;
      if (index >= args.length) throw new Error("--label requires a value");
      label = args[index]!;
    } else if (argument.startsWith("--label=")) {
      label = argument.slice("--label=".length);
    } else if (argument === "--source") {
      index += 1;
      if (index >= args.length) throw new Error("--source requires a value");
      source = args[index]!;
    } else if (argument.startsWith("--source=")) {
      source = argument.slice("--source=".length);
    } else if (argument === "--medium") {
      index += 1;
      if (index >= args.length) throw new Error("--medium requires a value");
      medium = args[index]!;
    } else if (argument.startsWith("--medium=")) {
      medium = argument.slice("--medium=".length);
    } else if (argument.startsWith("-")) {
      throw new Error(`unknown upload option: ${argument}`);
    } else {
      positional.push(argument);
    }
  }

  if (positional.length < 1 || positional.length > 2) {
    throw new Error("usage: leenk upload [OPTIONS] FILE [REMOTE_PATH]");
  }
  if (
    expiration &&
    expiration !== "never" &&
    !EXPIRATION_PATTERN.test(expiration)
  ) {
    throw new Error(
      "expiration must be 'never' or a duration such as 30m, 12h, or 14d",
    );
  }
  validateCampaignValue("campaign", campaign);
  validateCampaignValue("label", label);
  validateCampaignValue("source", source);
  validateCampaignValue("medium", medium);
  if (!shortlink && (campaign || label || source || medium)) {
    throw new Error("shortlink metadata options require shortlink creation");
  }

  return {
    campaign,
    expiration,
    filePath: positional[0]!,
    label,
    medium,
    remotePath: positional.length === 2 ? positional[1] : undefined,
    shortlink,
    source,
  };
}

function validateCampaignValue(name: string, value: string | undefined): void {
  if (value && !CAMPAIGN_PATTERN.test(value)) {
    throw new Error(`${name} must use 1-64 letters, numbers, '.', '_', or '-'`);
  }
}

export function formatUploadResult(result: UploadResult): string {
  const lines = [
    `Path: ${result.path}`,
    `Size: ${result.size.toLocaleString("en-US")} bytes`,
    `ETag: ${result.etag}`,
    `Expires: ${result.expiresAt ?? "never"}`,
    `Public URL: ${result.url}`,
  ];
  if (result.shortlink) {
    lines.push(`Short URL: ${result.shortlink.shortUrl}`);
    if (result.shortlink.label)
      lines.push(`Shortlink label: ${result.shortlink.label}`);
  }
  if (result.shortlinkError)
    lines.push(`Shortlink warning: ${result.shortlinkError}`);
  return lines.join("\n");
}
