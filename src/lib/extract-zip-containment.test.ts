import { spawnSync } from "node:child_process";
import {
  mkdtemp,
  mkdir,
  readFile,
  realpath,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type ExtractZip = (zipPath: string, opts: { dir: string }) => Promise<void>;

const isExtractZip = (value: unknown): value is ExtractZip =>
  typeof value === "function";

const loaded: unknown = createRequire(import.meta.url)("extract-zip");
if (!isExtractZip(loaded)) {
  throw new Error("extract-zip export is not a function");
}
const extract = loaded;

const writeEscapeZip = (zipPath: string) => {
  const script = `
import zipfile, sys
path = sys.argv[1]
with zipfile.ZipFile(path, "w") as zf:
    info = zipfile.ZipInfo("escape")
    info.create_system = 3
    info.external_attr = (0o120777 << 16)
    zf.writestr(info, b"../../outside.txt")
`;
  const result = spawnSync("python3", ["-c", script, zipPath], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || "failed to write escape zip");
  }
};

describe("extract-zip symlink containment", () => {
  it("rejects a symlink whose target is outside the destination", async () => {
    const root = await realpath(await mkdtemp(join(tmpdir(), "extract-zip-")));
    const dest = join(root, "dest");
    const zipPath = join(root, "escape.zip");
    await mkdir(dest);
    await writeFile(join(root, "outside.txt"), "secret\n");
    writeEscapeZip(zipPath);

    await expect(extract(zipPath, { dir: dest })).rejects.toThrow(
      /Out of bound path/,
    );
    await expect(readFile(join(root, "outside.txt"), "utf8")).resolves.toBe(
      "secret\n",
    );
  });
});
