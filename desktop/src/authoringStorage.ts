import * as fs from "node:fs/promises";
import path from "node:path";
import { err, ok, type Result } from "neverthrow";
import type { HostError } from "@pangea/desktop-contracts";
import { authoringSourceDirectory } from "./authoringPaths.ts";
import { failure, io, projectPath, statOrMissing } from "./files.ts";

export interface AuthoringFile { path: string; size: number; modified: number }
const maxBytes = 4 * 1024 * 1024 * 1024;
const maxFileBytes = 1024 * 1024 * 1024;

async function collect(root: string, relative: string, entries: AuthoringFile[], depth: number): Promise<Result<void, HostError>> {
  if (depth > 24) return err(failure("Authoring source directories are too deeply nested", "limit"));
  const target = await projectPath(root, relative);
  if (target.isErr()) return err(target.error);
  const info = await statOrMissing(target.value);
  if (info.isErr()) return err(info.error);
  if (!info.value) return ok(undefined);
  if (info.value.isDirectory()) {
    const listing = await io(() => fs.readdir(target.value), "Cannot list authoring sources");
    if (listing.isErr()) return err(listing.error);
    for (const name of listing.value) {
      const nested = await collect(root, `${relative}/${name}`, entries, depth + 1);
      if (nested.isErr()) return err(nested.error);
    }
    return ok(undefined);
  }
  if (!info.value.isFile()) return err(failure("Authoring sources must be regular files", "invalid"));
  if (info.value.size > maxFileBytes) return err(failure("Authoring source exceeds 1 GiB", "limit"));
  entries.push({ path: relative, size: info.value.size, modified: info.value.mtimeMs });
  if (entries.length > 4096 || entries.reduce((total, file) => total + file.size, 0) > maxBytes)
    return err(failure("Authoring sources exceed 4096 files or 4 GiB", "limit"));
  return ok(undefined);
}

export async function listAuthoringSources(root: string): Promise<Result<AuthoringFile[], HostError>> {
  const entries: AuthoringFile[] = [];
  const collected = await collect(root, authoringSourceDirectory, entries, 0);
  return collected.isErr() ? err(collected.error) : ok(entries.sort((left, right) => left.path.localeCompare(right.path)));
}

export async function copyAuthoringSources(source: string, destination: string): Promise<Result<void, HostError>> {
  const listing = await listAuthoringSources(source);
  if (listing.isErr()) return err(listing.error);
  for (const file of listing.value) {
    const from = await projectPath(source, file.path);
    if (from.isErr()) return err(from.error);
    const to = await projectPath(destination, file.path);
    if (to.isErr()) return err(to.error);
    const directory = await io(() => fs.mkdir(path.dirname(to.value), { recursive: true }), "Cannot create source directory");
    if (directory.isErr()) return err(directory.error);
    const copied = await io(() => fs.copyFile(from.value, to.value, fs.constants.COPYFILE_EXCL), "Cannot copy authoring source");
    if (copied.isErr()) return err(copied.error);
    const current = await statOrMissing(from.value);
    if (current.isErr()) return err(current.error);
    if (!current.value?.isFile() || current.value.size !== file.size || current.value.mtimeMs !== file.modified)
      return err(failure("Authoring source changed during Save As; retry", "conflict"));
  }
  return ok(undefined);
}
