import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

import {
  buildObjectUrl,
  contentTypeForPath,
  defaultRemotePath,
  formatUploadResult,
  normalizeFileInput,
  parseUploadArguments,
  type UploadResult,
  validateRemotePath,
} from "./leenk-core";

const VERSION = "1.0.0";
const DEFAULT_ORIGIN = "https://www.yusoofsh.id";
const MAX_FILE_SIZE = 100 * 1024 * 1024;

interface StoredConfig {
  origin: string;
  token: string;
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

function usage(): string {
  return `Leenk static file CLI

Usage:
  leenk upload [OPTIONS] FILE [REMOTE_PATH]
  leenk inspect REMOTE_PATH
  leenk delete [--force] REMOTE_PATH
  leenk login
  leenk logout
  leenk status
  leenk --help
  leenk --version

Upload options:
  --expires DURATION   Expire after positive minutes (m), hours (h), or days (d)
  --expires never      Keep the object publicly available
  --no-shortlink       Do not create a shortlink
  --campaign VALUE     Shortlink campaign name
  --source VALUE       Shortlink campaign source
  --medium VALUE       Shortlink campaign medium

Authentication:
  LEENK_STATIC_TOKEN takes precedence over the private config written by login.
  Pass a token to login over stdin; never put it in a command-line argument.

Examples:
  leenk upload ./document.pdf
  leenk upload file:///Users/me/Documents/report.pdf reports/report.pdf
  printf '%s' "$LEENK_STATIC_TOKEN" | leenk login`;
}

function configPath(): string {
  const override = process.env.LEENK_CONFIG_HOME;
  if (override) return join(override, "config.json");
  if (process.platform === "win32") {
    const appData = process.env.APPDATA;
    if (!appData) throw new Error("APPDATA is required on Windows");
    return join(appData, "leenk", "config.json");
  }
  const xdg = process.env.XDG_CONFIG_HOME;
  if (xdg) return join(xdg, "leenk", "config.json");
  const home = process.env.HOME;
  if (!home) throw new Error("HOME is required");
  return join(home, ".config", "leenk", "config.json");
}

function validateToken(token: string): string {
  if (!/^[0-9a-fA-F]{64}$/.test(token)) {
    throw new Error(
      "upload token must contain exactly 64 hexadecimal characters",
    );
  }
  return token;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseStoredConfig(text: string): StoredConfig {
  const value: unknown = JSON.parse(text);
  if (
    !isRecord(value) ||
    typeof value.origin !== "string" ||
    typeof value.token !== "string"
  ) {
    throw new Error("credential config has an invalid format");
  }
  return { origin: value.origin, token: validateToken(value.token) };
}

function parseApiError(text: string): ApiErrorBody | null {
  const value: unknown = JSON.parse(text);
  if (
    !isRecord(value) ||
    !isRecord(value.error) ||
    typeof value.error.code !== "string" ||
    typeof value.error.message !== "string"
  ) {
    return null;
  }
  return { error: { code: value.error.code, message: value.error.message } };
}

function parseUploadResult(text: string): UploadResult {
  const value: unknown = JSON.parse(text);
  if (
    !isRecord(value) ||
    typeof value.etag !== "string" ||
    (typeof value.expiresAt !== "string" && value.expiresAt !== null) ||
    typeof value.path !== "string" ||
    typeof value.size !== "number" ||
    typeof value.url !== "string"
  ) {
    throw new Error("server returned an invalid upload confirmation");
  }
  const result: UploadResult = {
    etag: value.etag,
    expiresAt: value.expiresAt,
    path: value.path,
    size: value.size,
    url: value.url,
  };
  if (value.shortlink !== undefined) {
    if (
      !isRecord(value.shortlink) ||
      typeof value.shortlink.shortUrl !== "string"
    ) {
      throw new Error("server returned an invalid shortlink confirmation");
    }
    result.shortlink = { shortUrl: value.shortlink.shortUrl };
  }
  if (typeof value.shortlinkError === "string") {
    result.shortlinkError = value.shortlinkError;
  }
  return result;
}

function readConfig(): StoredConfig | null {
  const path = configPath();
  if (!existsSync(path)) return null;
  return parseStoredConfig(readFileSync(path, "utf8"));
}

function credential(): StoredConfig {
  const environmentToken = process.env.LEENK_STATIC_TOKEN;
  const environmentOrigin = process.env.LEENK_STATIC_ORIGIN;
  if (environmentToken) {
    return {
      origin: environmentOrigin || DEFAULT_ORIGIN,
      token: validateToken(environmentToken),
    };
  }
  const config = readConfig();
  if (!config) {
    throw new Error("not authenticated; pipe the upload token to: leenk login");
  }
  return {
    origin: environmentOrigin || config.origin,
    token: config.token,
  };
}

function writeConfig(token: string): void {
  const path = configPath();
  mkdirSync(dirname(path), { mode: 0o700, recursive: true });
  writeFileSync(
    path,
    `${JSON.stringify({ origin: DEFAULT_ORIGIN, token })}\n`,
    { mode: 0o600 },
  );
  if (process.platform !== "win32") chmodSync(path, 0o600);
}

async function apiError(response: Response): Promise<Error> {
  const text = await response.text();
  try {
    const body = parseApiError(text);
    if (body) return new Error(`${body.error.code}: ${body.error.message}`);
    return new Error(`HTTP ${response.status}: ${text || response.statusText}`);
  } catch {
    return new Error(`HTTP ${response.status}: ${text || response.statusText}`);
  }
}

async function upload(args: string[]): Promise<void> {
  const options = parseUploadArguments(args);
  const filePath = normalizeFileInput(options.filePath);
  if (!existsSync(filePath)) throw new Error(`file not found: ${filePath}`);
  const file = statSync(filePath);
  if (!file.isFile()) throw new Error(`not a regular file: ${filePath}`);
  if (file.size === 0) throw new Error("file is empty");
  if (file.size > MAX_FILE_SIZE)
    throw new Error("file exceeds the 100 MiB limit");

  const remotePath = options.remotePath || defaultRemotePath(filePath);
  const pathError = validateRemotePath(remotePath);
  if (pathError) throw new Error(pathError);

  const auth = credential();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${auth.token}`,
    "Content-Length": String(file.size),
    "Content-Type": contentTypeForPath(filePath),
    "X-Static-Shortlink": String(options.shortlink),
  };
  if (options.expiration) headers["X-Static-Expires-In"] = options.expiration;
  if (options.campaign) headers["X-Shortlink-Campaign"] = options.campaign;
  if (options.source) headers["X-Shortlink-Source"] = options.source;
  if (options.medium) headers["X-Shortlink-Medium"] = options.medium;

  const url = buildObjectUrl(auth.origin, remotePath);
  console.error(`Uploading ${filePath} to ${url}...`);
  const response = await fetch(url, {
    body: readFileSync(filePath),
    headers,
    method: "POST",
    signal: AbortSignal.timeout(300_000),
  });
  if (!response.ok) throw await apiError(response);
  const result = parseUploadResult(await response.text());
  console.log(formatUploadResult(result));
}

async function inspect(remotePath: string): Promise<void> {
  const pathError = validateRemotePath(remotePath);
  if (pathError) throw new Error(pathError);
  const origin = process.env.LEENK_STATIC_ORIGIN || DEFAULT_ORIGIN;
  const response = await fetch(buildObjectUrl(origin, remotePath), {
    method: "HEAD",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw await apiError(response);
  console.log(`Path: ${remotePath}`);
  console.log(`Status: ${response.status}`);
  console.log(
    `Size: ${response.headers.get("content-length") || "unknown"} bytes`,
  );
  console.log(
    `Content-Type: ${response.headers.get("content-type") || "unknown"}`,
  );
  console.log(`ETag: ${response.headers.get("etag") || "unknown"}`);
  console.log(
    `Last-Modified: ${response.headers.get("last-modified") || "unknown"}`,
  );
  console.log(
    `Expires: ${response.headers.get("x-static-expires-at") || "never"}`,
  );
  console.log(`Public URL: ${buildObjectUrl(origin, remotePath)}`);
}

async function deleteObject(args: string[]): Promise<void> {
  let force = false;
  let remotePath = "";
  for (const argument of args) {
    if (argument === "--force") force = true;
    else if (argument.startsWith("-"))
      throw new Error(`unknown delete option: ${argument}`);
    else if (remotePath) throw new Error("delete accepts one remote path");
    else remotePath = argument;
  }
  if (!remotePath) throw new Error("usage: leenk delete [--force] REMOTE_PATH");
  const pathError = validateRemotePath(remotePath);
  if (pathError) throw new Error(pathError);
  if (!force) {
    throw new Error(
      "deletion requires --force after confirming the exact remote path",
    );
  }
  const auth = credential();
  const url = buildObjectUrl(auth.origin, remotePath);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${auth.token}` },
    method: "DELETE",
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw await apiError(response);
  console.log(`Deleted: ${url}`);
}

function login(): void {
  const token = validateToken(readFileSync(0, "utf8").trim());
  writeConfig(token);
  console.log(`Authentication stored in ${configPath()}`);
}

function logout(): void {
  const path = configPath();
  if (existsSync(path)) rmSync(path);
  console.log("Authentication removed");
}

function status(): void {
  if (process.env.LEENK_STATIC_TOKEN) {
    validateToken(process.env.LEENK_STATIC_TOKEN);
    console.log("Authenticated with LEENK_STATIC_TOKEN");
    return;
  }
  const config = readConfig();
  if (!config) throw new Error("not authenticated");
  console.log(`Authenticated with ${configPath()}`);
  console.log(`Origin: ${config.origin}`);
}

async function main(): Promise<number> {
  const args = process.argv.slice(2);
  const command = args.length > 0 ? args[0] : "";
  const rest = args.slice(1);
  if (command === "upload") await upload(rest);
  else if (command === "inspect" || command === "head") {
    if (rest.length !== 1) throw new Error("usage: leenk inspect REMOTE_PATH");
    await inspect(rest[0]!);
  } else if (command === "delete") await deleteObject(rest);
  else if (command === "login") {
    if (rest.length !== 0) throw new Error("login takes no arguments");
    login();
  } else if (command === "logout") {
    if (rest.length !== 0) throw new Error("logout takes no arguments");
    logout();
  } else if (command === "status") status();
  else if (command === "--version" || command === "version")
    console.log(`leenk ${VERSION}`);
  else if (command === "--help" || command === "-h" || command === "help")
    console.log(usage());
  else if (!command) {
    console.error(usage());
    return 2;
  } else throw new Error(`unknown command: ${command}`);
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((error: unknown) => {
    console.error(
      `Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  });
