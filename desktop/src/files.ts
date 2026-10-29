import * as fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { err, ok, Result, ResultAsync } from "neverthrow";
import { z } from "zod";
import { relativePathSchema, type HostError } from "@pangea/desktop-contracts";
import { isAuthoringSourcePath } from "./authoringPaths.ts";

export function failure(message: string, code = "filesystem"): HostError {
  return { code, message };
}
export function io<T>(operation: () => Promise<T>, message: string) {
  return ResultAsync.fromPromise(operation(), () => failure(message));
}
export function parseJson(text: string): Result<unknown, HostError> {
  return Result.fromThrowable((): unknown => JSON.parse(text), () => failure("Invalid JSON", "invalid"))();
}
export function hash(bytes: Uint8Array | string): string {
  return createHash("sha256").update(bytes).digest("hex");
}
export async function statOrMissing(target: string) {
  return ResultAsync.fromPromise(fs.lstat(target), (cause: unknown) => cause).orElse((cause) => {
    const error = z.object({ code: z.string() }).safeParse(cause);
    return error.success && error.data.code === "ENOENT"
      ? ok(null) : err(failure(`Cannot inspect ${path.basename(target)}`));
  });
}

export async function projectPath(root: string, relative: string): Promise<Result<string, HostError>> {
  const parsed = relativePathSchema.safeParse(relative);
  if (!parsed.success) return err(failure("Unsafe project path", "invalid"));
  let current = root;
  for (const segment of parsed.data.split("/")) {
    current = path.join(current, segment);
    const info = await statOrMissing(current);
    if (info.isErr()) return err(info.error);
    if (info.value?.isSymbolicLink()) return err(failure("Project symlinks are not followed", "invalid"));
  }
  return ok(current);
}

export async function atomicWrite(target: string, bytes: Uint8Array): Promise<Result<void, HostError>> {
  const directory = await io(() => fs.mkdir(path.dirname(target), { recursive: true }), "Cannot create directory");
  if (directory.isErr()) return err(directory.error);
  const temporary = `${target}.${randomUUID()}.tmp`;
  const opened = await io(() => fs.open(temporary, "wx"), "Cannot create temporary file");
  if (opened.isErr()) return err(opened.error);
  const written = await io(() => opened.value.writeFile(bytes), "Cannot write temporary file");
  const synced = written.isOk() ? await io(() => opened.value.sync(), "Cannot flush temporary file") : written;
  await io(() => opened.value.close(), "Cannot close temporary file");
  if (synced.isErr()) return err(synced.error);
  const renamed = await io(() => fs.rename(temporary, target), "Cannot replace file");
  if (renamed.isErr()) await io(() => fs.rm(temporary, { force: true }), "Cannot remove temporary file");
  return renamed;
}

export interface FileEntry { path: string; hash: string; size: number }
export interface CachedFile { size: number; mtime: number; ctime: number; inode: number; hash: string }
export async function scanProject(root: string, directory = "", cache?: Map<string, CachedFile>): Promise<Result<FileEntry[], HostError>> {
  const listing = await io(() => fs.readdir(path.join(root, directory), { withFileTypes: true }), "Cannot list project files");
  if (listing.isErr()) return err(listing.error);
  const entries: FileEntry[] = [];
  for (const entry of listing.value) {
    const relative = directory ? `${directory}/${entry.name}` : entry.name;
    if (isAuthoringSourcePath(relative)) continue;
    if (!relativePathSchema.safeParse(relative).success || entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      const nested = await scanProject(root, relative, cache);
      if (nested.isErr()) return nested;
      entries.push(...nested.value);
    } else if (entry.isFile()) {
      const info = await io(() => fs.stat(path.join(root, relative)), `Cannot inspect ${relative}`);
      if (info.isErr()) return err(info.error);
      if (info.value.size > 128 * 1024 * 1024) return err(failure(`Project file exceeds 128 MiB: ${relative}`, "limit"));
      const key = path.join(root, relative);
      const cached = cache?.get(key);
      const stat = info.value;
      if (cached && cached.size === stat.size && cached.mtime === stat.mtimeMs && cached.ctime === stat.ctimeMs && cached.inode === stat.ino) {
        entries.push({ path: relative, hash: cached.hash, size: stat.size });
      } else {
        const bytes = await io(() => fs.readFile(key), `Cannot read ${relative}`);
        if (bytes.isErr()) return err(bytes.error);
        const digest = hash(bytes.value);
        cache?.set(key, { size: stat.size, mtime: stat.mtimeMs, ctime: stat.ctimeMs, inode: stat.ino, hash: digest });
        entries.push({ path: relative, hash: digest, size: bytes.value.length });
      }
    }
    if (entries.length > 4096) return err(failure("Project exceeds 4096 files", "limit"));
    if (entries.reduce((size, file) => size + file.size, 0) > 512 * 1024 * 1024)
      return err(failure("Project exceeds 512 MiB", "limit"));
  }
  if (cache && directory === "") {
    const live = new Set(entries.map((entry) => path.join(root, entry.path)));
    for (const key of cache.keys()) if (!live.has(key)) cache.delete(key);
  }
  return ok(entries.sort((left, right) => left.path.localeCompare(right.path)));
}
export function revisionOf(entries: FileEntry[]): string {
  return hash(entries.map((entry) => `${entry.path}:${entry.hash}`).join("\n"));
}
