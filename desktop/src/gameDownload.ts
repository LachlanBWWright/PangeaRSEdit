import * as fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { Result as BoundaryResult, err, ok, type Result } from "neverthrow";
import { unzipSync } from "fflate";
import type { HostError, ReleaseAsset } from "@pangea/desktop-contracts";
import { failure, io, projectPath } from "./files.ts";
import { releaseUrl } from "./gameCatalog.ts";
import { runProcess } from "./processes.ts";

export async function downloadGame(asset: ReleaseAsset, tag: string, destination: string,
  signal: AbortSignal, progress: (received: number) => void): Promise<Result<void, HostError>> {
  const response = await io(() => fetch(releaseUrl(tag, asset.filename), { signal }), "Game download failed or cancelled");
  if (response.isErr()) return err(response.error);
  if (!response.value.ok || !response.value.body) return err(failure("Game download is unavailable", "network"));
  const opened = await io(() => fs.open(destination, "wx"), "Cannot create download file");
  if (opened.isErr()) return err(opened.error);
  const digest = createHash("sha256");
  let received = 0;
  let result: Result<void, HostError> = ok(undefined);
  const reader = response.value.body.getReader();
  while (result.isOk()) {
    const chunk = await io(() => reader.read(), "Game download interrupted");
    if (chunk.isErr()) { result = err(chunk.error); break; }
    if (chunk.value.done) break;
    const data = chunk.value.value;
    received += data.length;
    if (received > asset.size) { result = err(failure("Download exceeds declared size", "integrity")); break; }
    digest.update(data);
    const written = await io(() => opened.value.writeFile(data), "Cannot save game download");
    if (written.isErr()) { result = err(written.error); break; }
    progress(received);
  }
  await io(() => reader.cancel(), "Cannot close download stream");
  await io(() => opened.value.close(), "Cannot close download file");
  if (result.isErr()) return result;
  return received === asset.size && digest.digest("hex") === asset.sha256
    ? ok(undefined) : err(failure("Downloaded game failed checksum verification", "integrity"));
}

export async function unpackGame(asset: ReleaseAsset, archive: string, root: string): Promise<Result<string, HostError>> {
  if (asset.format === "appimage") {
    const permission = await io(() => fs.chmod(archive, 0o755), "Cannot make AppImage executable");
    if (permission.isErr()) return err(permission.error);
    const unpacked = await runProcess(archive, ["--appimage-extract"], root);
    return unpacked.isErr() ? err(unpacked.error) : ok(path.join(root, "squashfs-root"));
  }
  if (process.platform === "darwin" && asset.kind === "runtime") {
    // ditto preserves the framework symlinks in the verified macOS app bundle.
    const extracted = await runProcess("/usr/bin/ditto", ["-x", "-k", archive, root], root);
    return extracted.isErr() ? err(extracted.error) : ok(root);
  }
  const bytes = await io(() => fs.readFile(archive), "Cannot read game archive");
  if (bytes.isErr()) return err(bytes.error);
  let size = 0;
  let rejected = false;
  const entries = BoundaryResult.fromThrowable(() => unzipSync(bytes.value, {
    filter: (entry) => {
      size += entry.originalSize;
      if (entry.originalSize > 512 * 1024 * 1024 || size > 4 * 1024 * 1024 * 1024) rejected = true;
      return !rejected;
    },
  }), () => failure("Cannot unpack game archive", "invalid"))();
  if (entries.isErr()) return err(entries.error);
  if (rejected) return err(failure("Game archive exceeds extraction limits", "limit"));
  for (const [name, data] of Object.entries(entries.value)) {
    if (name.endsWith("/")) continue;
    const target = await projectPath(root, name);
    if (target.isErr()) return err(target.error);
    const directory = await io(() => fs.mkdir(path.dirname(target.value), { recursive: true }), "Cannot create game directory");
    if (directory.isErr()) return err(directory.error);
    const written = await io(() => fs.writeFile(target.value, data, { mode: 0o755, flag: "wx" }), "Cannot unpack game file");
    if (written.isErr()) return err(written.error);
  }
  return ok(root);
}
