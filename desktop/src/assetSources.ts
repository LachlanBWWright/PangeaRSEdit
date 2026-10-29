import * as fs from "node:fs/promises";
import { createReadStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { err, ok, Result, type Result as TypedResult } from "neverthrow";
import { z } from "zod";
import { relativePathSchema, type HostError } from "@pangea/desktop-contracts";
import { failure, hash, io, parseJson, projectPath, statOrMissing } from "./files.ts";
import { authoringSourceDirectory } from "./authoringPaths.ts";
import { listAuthoringSources } from "./authoringStorage.ts";

export { authoringSourceDirectory, isAuthoringSourcePath } from "./authoringPaths.ts";
const formatSchema = z.enum(["blend", "gltf", "glb", "bg3d", "3dmf"]);
const gltfSchema = z.object({
  buffers: z.array(z.object({ uri: z.string().optional() })).optional(),
  images: z.array(z.object({ uri: z.string().optional() })).optional(),
});
const sourceBudget = 4 * 1024 * 1024 * 1024;
const fileBudget = 1024 * 1024 * 1024;

export interface AssetSourceRequest {
  sourcePath: string;
  mode: "managed" | "external";
  assetId: string;
  dependencies?: string[];
  signal?: AbortSignal;
}
export interface ImportedAssetSource {
  mode: "managed" | "external";
  path: string;
  entryPath: string;
  originalName: string;
  format: z.infer<typeof formatSchema>;
  dependencies: string[];
  fingerprint: string;
  totalBytes: number;
}
interface SourceFile { relative: string; absolute: string; size: number; hash: string }

async function hashSource(file: string, signal?: AbortSignal): Promise<TypedResult<string, HostError>> {
  const digest = createHash("sha256");
  const read = await io(() => pipeline(createReadStream(file), digest, { signal }), "Cannot fingerprint authoring source");
  if (signal?.aborted) return err(failure("Asset import cancelled", "cancelled"));
  return read.isErr() ? err(read.error) : ok(digest.digest("hex"));
}

async function inspectSource(target: string): Promise<TypedResult<number, HostError>> {
  const absolute = path.resolve(target);
  let current = path.parse(absolute).root;
  for (const part of absolute.slice(current.length).split(path.sep)) {
    current = path.join(current, part);
    const info = await statOrMissing(current);
    if (info.isErr()) return err(info.error);
    if (!info.value || info.value.isSymbolicLink()) return err(failure("Source files must exist and cannot use symbolic links", "invalid"));
  }
  const info = await statOrMissing(absolute);
  if (info.isErr()) return err(info.error);
  if (!info.value?.isFile()) return err(failure("Select a source file", "invalid"));
  if (info.value.size > fileBudget) return err(failure("Authoring source exceeds 1 GiB", "limit"));
  return ok(info.value.size);
}

function localUri(uri: string): TypedResult<string | null, HostError> {
  if (uri.startsWith("data:")) return ok(null);
  const decoded = Result.fromThrowable(() => decodeURIComponent(uri), () => failure("Invalid glTF resource URI", "invalid"))();
  if (decoded.isErr()) return err(decoded.error);
  const parsed = relativePathSchema.safeParse(decoded.value);
  return parsed.success ? ok(parsed.data) : err(failure("glTF resources must be local files below the source directory", "invalid"));
}

async function gltfDependencies(source: string): Promise<TypedResult<string[], HostError>> {
  const info = await statOrMissing(source);
  if (info.isErr()) return err(info.error);
  if (!info.value || info.value.size > 16 * 1024 * 1024) return err(failure("glTF resource manifest exceeds 16 MiB; use GLB for embedded geometry", "limit"));
  const read = await io(() => fs.readFile(source, "utf8"), "Cannot read glTF source");
  if (read.isErr()) return err(read.error);
  const json = parseJson(read.value);
  if (json.isErr()) return err(json.error);
  const parsed = gltfSchema.safeParse(json.value);
  if (!parsed.success) return err(failure("Invalid glTF resource declarations", "invalid"));
  const dependencies: string[] = [];
  for (const resource of [...(parsed.data.buffers ?? []), ...(parsed.data.images ?? [])]) {
    if (!resource.uri) continue;
    const local = localUri(resource.uri);
    if (local.isErr()) return err(local.error);
    if (local.value) dependencies.push(local.value);
  }
  return ok(dependencies);
}

async function companionDependencies(source: string, format: string): Promise<TypedResult<string[], HostError>> {
  if (format === "gltf") return gltfDependencies(source);
  if (format !== "bg3d" && format !== "3dmf") return ok([]);
  const companion = `${path.basename(source, path.extname(source))}.skeleton.rsrc`;
  const info = await statOrMissing(path.join(path.dirname(source), companion));
  if (info.isErr()) return err(info.error);
  return ok(info.value ? [companion] : []);
}

async function sourceFiles(source: string, dependencies: string[], allowAbsolute = false, signal?: AbortSignal): Promise<TypedResult<SourceFile[], HostError>> {
  const names = [...new Set([path.basename(source), ...dependencies])].sort();
  if (names.length > 4096) return err(failure("Authoring source exceeds 4096 files", "limit"));
  const files: SourceFile[] = [];
  let total = 0;
  for (const relative of names) {
    if (signal?.aborted) return err(failure("Asset import cancelled", "cancelled"));
    if (!(allowAbsolute && path.isAbsolute(relative)) && !relativePathSchema.safeParse(relative).success)
      return err(failure("Unsafe authoring source dependency", "invalid"));
    const absolute = path.resolve(path.dirname(source), relative);
    const inspected = await inspectSource(absolute);
    if (inspected.isErr()) return err(inspected.error);
    total += inspected.value;
    if (total > sourceBudget) return err(failure("Authoring sources exceed 4 GiB", "limit"));
    const digest = await hashSource(absolute, signal);
    if (digest.isErr()) return err(digest.error);
    files.push({ relative, absolute, size: inspected.value, hash: digest.value });
  }
  return ok(files);
}

async function copySources(root: string, files: SourceFile[], signal?: AbortSignal): Promise<TypedResult<void, HostError>> {
  for (const file of files) {
    if (signal?.aborted) return err(failure("Asset import cancelled", "cancelled"));
    const target = await projectPath(root, file.relative);
    if (target.isErr()) return err(target.error);
    const directory = await io(() => fs.mkdir(path.dirname(target.value), { recursive: true }), "Cannot create source directory");
    if (directory.isErr()) return err(directory.error);
    const copied = await io(() => fs.copyFile(file.absolute, target.value, fs.constants.COPYFILE_EXCL), "Cannot copy authoring source");
    if (copied.isErr()) return err(copied.error);
    const digest = await hashSource(target.value, signal);
    if (digest.isErr()) return err(digest.error);
    if (digest.value !== file.hash) return err(failure("Source changed during import; retry", "conflict"));
  }
  return ok(undefined);
}

export async function importAssetSource(projectRoot: string, request: AssetSourceRequest): Promise<TypedResult<ImportedAssetSource, HostError>> {
  if (!z.uuid().safeParse(request.assetId).success) return err(failure("Invalid asset identity", "invalid"));
  const source = path.resolve(request.sourcePath);
  const format = formatSchema.safeParse(path.extname(source).slice(1).toLowerCase());
  if (!format.success) return err(failure("Unsupported authoring source format", "invalid"));
  const inspected = await inspectSource(source);
  if (inspected.isErr()) return err(inspected.error);
  const discovered = await companionDependencies(source, format.data);
  if (discovered.isErr()) return err(discovered.error);
  const dependencies = [...new Set([...discovered.value, ...(request.dependencies ?? [])])].sort();
  const files = await sourceFiles(source, dependencies, request.mode === "external" && format.data === "blend", request.signal);
  if (files.isErr()) return err(files.error);
  const originalName = path.basename(source);
  const fingerprint = hash(files.value.map((file) => `${file.relative}:${file.hash}`).join("\n"));
  const totalBytes = files.value.reduce((total, file) => total + file.size, 0);
  if (request.mode === "external") return ok({ mode: request.mode, path: source, entryPath: source, originalName, format: format.data, dependencies, fingerprint, totalBytes });
  const relative = `${authoringSourceDirectory}/${request.assetId}/${randomUUID()}`;
  if (files.value.some((file) => !relativePathSchema.safeParse(`${relative}/${file.relative}`).success))
    return err(failure("Authoring source path is too long for portable project storage", "invalid"));
  const existing = await listAuthoringSources(projectRoot);
  if (existing.isErr()) return err(existing.error);
  if (existing.value.length + files.value.length > 4096 || existing.value.reduce((total, file) => total + file.size, totalBytes) > sourceBudget)
    return err(failure("Project authoring sources exceed 4096 files or 4 GiB", "limit"));
  const destination = await projectPath(projectRoot, relative);
  if (destination.isErr()) return err(destination.error);
  const copied = await copySources(destination.value, files.value, request.signal);
  if (copied.isErr()) {
    await io(() => fs.rm(destination.value, { recursive: true, force: true }), "Cannot clean incomplete source import");
    return err(copied.error);
  }
  return ok({ mode: request.mode, path: `${relative}/${originalName}`, entryPath: path.join(destination.value, originalName), originalName, format: format.data, dependencies, fingerprint, totalBytes });
}

export async function fingerprintAssetSource(projectRoot: string, source: { mode: "managed" | "external"; path: string; dependencies: string[] }): Promise<TypedResult<string, HostError>> {
  const entry = source.mode === "external" ? ok(path.resolve(source.path)) : await projectPath(projectRoot, source.path);
  if (entry.isErr()) return err(entry.error);
  if (source.mode === "managed" && !source.path.startsWith(`${authoringSourceDirectory}/`))
    return err(failure("Managed sources must remain inside AuthoringSources", "invalid"));
  const files = await sourceFiles(entry.value, source.dependencies, source.mode === "external" && path.extname(entry.value).toLowerCase() === ".blend");
  if (files.isErr()) return err(files.error);
  return ok(hash(files.value.map((file) => `${file.relative}:${file.hash}`).join("\n")));
}
