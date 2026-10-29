import * as fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { err, ok, type Result } from "neverthrow";
import { projectAssetSchema, type HostError, type ProjectAsset, type ProjectFile } from "@pangea/desktop-contracts";
import { failure, io, parseJson, projectPath, statOrMissing } from "./files.ts";
import type { ConvertedAsset } from "./assetConversion.ts";

export const ASSET_REGISTRY = ".pangea/assets.json";
export const assetHistoryPath = (revision: string) => `.pangea/asset-history/${revision}.json`;
export const jsonFile = (target: string, value: unknown): ProjectFile => ({ path: target, bytes: new TextEncoder().encode(JSON.stringify(value, null, 2)) });

export async function readAssetRegistry(root: string): Promise<Result<ProjectAsset[], HostError>> {
  const file = await projectPath(root, ASSET_REGISTRY);
  if (file.isErr()) return err(file.error);
  const info = await statOrMissing(file.value);
  if (info.isErr()) return err(info.error);
  if (!info.value) return ok([]);
  const read = await io(() => fs.readFile(file.value, "utf8"), "Cannot read project assets");
  if (read.isErr()) return err(read.error);
  const json = parseJson(read.value);
  if (json.isErr()) return err(json.error);
  const parsed = z.array(projectAssetSchema).max(512).safeParse(json.value);
  if (!parsed.success || new Set(parsed.data.map((asset) => asset.id)).size !== parsed.data.length)
    return err(failure("Invalid project asset registry", "invalid"));
  for (const asset of parsed.data) {
    if (asset.source.mode === "managed" && !asset.source.path.startsWith(`AuthoringSources/${asset.id}/`))
      return err(failure("Managed asset source is outside its source directory", "invalid"));
    if (asset.source.mode === "external" && !path.isAbsolute(asset.source.path))
      return err(failure("External asset source must be absolute", "invalid"));
  }
  return ok(parsed.data);
}

export async function readAssetHistory(root: string, revision: string): Promise<Result<ProjectAsset, HostError>> {
  const target = await projectPath(root, assetHistoryPath(revision));
  if (target.isErr()) return err(target.error);
  const read = await io(() => fs.readFile(target.value, "utf8"), "Cannot read previous asset revision");
  if (read.isErr()) return err(read.error);
  const json = parseJson(read.value);
  if (json.isErr()) return err(json.error);
  const parsed = projectAssetSchema.safeParse(json.value);
  return parsed.success ? ok(parsed.data) : err(failure("Invalid previous asset revision", "invalid"));
}

export async function convertedProjectFiles(converted: ConvertedAsset, destination: string): Promise<Result<ProjectFile[], HostError>> {
  const files: ProjectFile[] = [];
  let size = 0;
  for (const target of converted.files) {
    const info = await io(() => fs.stat(target), "Cannot inspect converted asset");
    if (info.isErr()) return err(info.error);
    size += info.value.size;
    if (info.value.size > 128 * 1024 * 1024 || size > 512 * 1024 * 1024)
      return err(failure("Converted asset exceeds runtime file limits", "limit"));
    const read = await io(() => fs.readFile(target), "Cannot read converted asset");
    if (read.isErr()) return err(read.error);
    files.push({ path: `${destination}/${path.basename(target)}`, bytes: Uint8Array.from(read.value) });
  }
  return ok(files);
}
