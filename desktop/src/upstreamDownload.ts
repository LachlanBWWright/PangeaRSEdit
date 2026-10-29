import * as fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { Result as BoundaryResult, err, ok, type Result } from "neverthrow";
import { unzipSync } from "fflate";
import { relativePathSchema, type HostError, type UpstreamDataRelease } from "@pangea/desktop-contracts";
import { failure, io, projectPath, statOrMissing } from "./files.ts";

export async function downloadUpstream(release: UpstreamDataRelease, destination: string, signal: AbortSignal,
  progress: (received: number) => void): Promise<Result<void, HostError>> {
  if (signal.aborted) return err(failure("Data download cancelled", "cancelled"));
  const response = await io(() => fetch(release.downloadUrl, { signal }), "Upstream download failed or cancelled");
  if (response.isErr()) return err(signal.aborted ? failure("Data download cancelled", "cancelled") : response.error);
  if (!response.value.ok || !response.value.body) return err(failure("Upstream download is unavailable", "network"));
  const opened = await io(() => fs.open(destination, "wx"), "Cannot create upstream download");
  if (opened.isErr()) return err(opened.error);
  const reader = response.value.body.getReader();
  const hash = createHash("sha256");
  let received = 0;
  let result: Result<void, HostError> = ok(undefined);
  while (result.isOk()) {
    if (signal.aborted) { result = err(failure("Data download cancelled", "cancelled")); break; }
    const chunk = await io(() => reader.read(), "Upstream download interrupted");
    if (chunk.isErr()) { result = err(signal.aborted ? failure("Data download cancelled", "cancelled") : chunk.error); break; }
    if (chunk.value.done) break;
    const data = chunk.value.value;
    received += data.length;
    if (received > release.size) { result = err(failure("Upstream download exceeds pinned size", "integrity")); break; }
    hash.update(data);
    const written = await io(() => opened.value.writeFile(data), "Cannot save upstream download");
    if (written.isErr()) { result = err(written.error); break; }
    progress(received);
  }
  await io(() => reader.cancel(), "Cannot close upstream stream");
  const closed = await io(() => opened.value.close(), "Cannot close upstream download");
  if (result.isErr()) return result;
  if (closed.isErr()) return err(closed.error);
  if (signal.aborted) return err(failure("Data download cancelled", "cancelled"));
  return received === release.size && hash.digest("hex") === release.sha256
    ? ok(undefined) : err(failure("Upstream download failed pinned SHA-256 verification", "integrity"));
}

function destinationName(name: string, prefix: string): string | null {
  if (name.startsWith(`${prefix}/`)) return `Data/${name.slice(prefix.length + 1)}`;
  const folder = prefix.slice(0, prefix.lastIndexOf("/"));
  const basename = name.slice(folder.length + 1);
  return name.startsWith(`${folder}/`) && /^(license|readme)(\.[a-z0-9]+)?$/i.test(basename) ? basename : null;
}

export async function unpackUpstream(release: UpstreamDataRelease, archive: string, root: string,
  signal: AbortSignal): Promise<Result<string, HostError>> {
  if (signal.aborted) return err(failure("Data extraction cancelled", "cancelled"));
  const bytes = await io(() => fs.readFile(archive), "Cannot read upstream archive");
  if (bytes.isErr()) return err(bytes.error);
  let size = 0;
  let count = 0;
  let rejected = false;
  const entries = BoundaryResult.fromThrowable(() => unzipSync(bytes.value, { filter: (entry) => {
    const name = destinationName(entry.name, release.dataPrefix);
    if (!name || entry.name.endsWith("/")) return false;
    size += entry.originalSize;
    count += 1;
    if (!relativePathSchema.safeParse(name).success || entry.originalSize > 512 * 1024 * 1024
      || size > 2 * 1024 * 1024 * 1024 || count > 20000) rejected = true;
    return !rejected;
  } }), () => failure("Invalid upstream ZIP archive", "invalid"))();
  if (entries.isErr()) return err(entries.error);
  if (rejected) return err(failure("Upstream archive contains unsafe paths or exceeds extraction limits", "invalid"));
  for (const [name, data] of Object.entries(entries.value)) {
    if (signal.aborted) return err(failure("Data extraction cancelled", "cancelled"));
    const relative = destinationName(name, release.dataPrefix);
    if (!relative) continue;
    const target = await projectPath(root, relative);
    if (target.isErr()) return err(target.error);
    const made = await io(() => fs.mkdir(path.dirname(target.value), { recursive: true }), "Cannot create stock data folder");
    if (made.isErr()) return err(made.error);
    const written = await io(() => fs.writeFile(target.value, data, { flag: "wx", mode: 0o644 }), "Cannot extract stock data");
    if (written.isErr()) return err(written.error);
  }
  const system = await statOrMissing(path.join(root, "Data", "System"));
  if (system.isErr()) return err(system.error);
  return system.value?.isDirectory() ? ok(path.join(root, "Data"))
    : err(failure("Upstream archive does not contain the expected stock Data/System folder", "invalid"));
}
