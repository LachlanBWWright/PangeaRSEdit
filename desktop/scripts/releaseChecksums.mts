import * as fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { err, Result, ResultAsync } from "neverthrow";
import { z } from "zod";

async function main() {
  const directory = path.resolve(import.meta.dirname, "../release");
  const metadata = await ResultAsync.fromPromise(fs.readFile(path.resolve(import.meta.dirname, "../package.json"), "utf8"), () => "Cannot read package metadata");
  if (metadata.isErr()) return metadata;
  const json = Result.fromThrowable((): unknown => JSON.parse(metadata.value), () => "Invalid package metadata")();
  if (json.isErr()) return json;
  const parsed = z.object({ version: z.string().regex(/^\d+\.\d+\.\d+$/) }).safeParse(json.value);
  if (!parsed.success) return err("Expected a stable editor version");
  const listed = await ResultAsync.fromPromise(fs.readdir(directory), () => "Cannot list release artifacts");
  if (listed.isErr()) return listed;
  const artifacts = [];
  for (const name of listed.value.filter((name) => /^Pangea-RS-Edit-.*\.(AppImage|deb|exe|dmg|zip)$/.test(name)).sort()) {
    const bytes = await ResultAsync.fromPromise(fs.readFile(path.join(directory, name)), () => `Cannot hash ${name}`);
    if (bytes.isErr()) return bytes;
    artifacts.push({ name, size: bytes.value.length, sha256: createHash("sha256").update(bytes.value).digest("hex") });
  }
  if (!artifacts.length) return err("No editor release artifacts were built");
  const manifest = { version: 1, editorVersion: parsed.data.version, platform: process.platform, arch: process.arch, artifacts };
  const written = await ResultAsync.fromPromise(fs.writeFile(path.join(directory, "editor-release.json"), `${JSON.stringify(manifest, null, 2)}\n`), () => "Cannot write release manifest");
  if (written.isErr()) return written;
  return ResultAsync.fromPromise(fs.writeFile(path.join(directory, "SHA256SUMS.txt"), artifacts.map((artifact) => `${artifact.sha256}  ${artifact.name}`).join("\n") + "\n"), () => "Cannot write checksums");
}

const result = await main();
if (result.isErr()) { console.error(result.error); process.exitCode = 1; }
