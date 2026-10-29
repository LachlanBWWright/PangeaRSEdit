import * as fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { err, type Result } from "neverthrow";
import type { HostError } from "@pangea/desktop-contracts";
import { failure, io } from "./files.ts";
import { importAssetSource, type AssetSourceRequest, type ImportedAssetSource } from "./assetSources.ts";
import { inspectBlendDependencies, packBlendSource } from "./blenderDependencies.ts";

export async function importBlendSource(root: string, request: AssetSourceRequest,
  executable: string | undefined, signal: AbortSignal): Promise<Result<ImportedAssetSource, HostError>> {
  if (!executable) return err(failure("Configure Blender to collect .blend textures and linked libraries, or export a GLB manually.", "configuration"));
  const entry = await importAssetSource(root, { ...request, mode: "external", dependencies: [] });
  if (entry.isErr()) return err(entry.error);
  const dependencies = await inspectBlendDependencies(request.sourcePath, executable, signal);
  if (dependencies.isErr()) return err(dependencies.error);
  const validated = await importAssetSource(root, { ...request, mode: "external", dependencies: dependencies.value });
  if (validated.isErr() || request.mode === "external") return validated;
  const directory = path.join(root, "AuthoringSources", "Imports", randomUUID());
  const created = await io(() => fs.mkdir(directory, { recursive: true }), "Cannot create Blender source staging");
  if (created.isErr()) return err(created.error);
  const target = path.join(directory, path.basename(request.sourcePath));
  const packed = await packBlendSource(request.sourcePath, target, executable, signal);
  const imported = packed.isErr() ? err(packed.error) : await importAssetSource(root, { ...request, sourcePath: target, dependencies: [] });
  await io(() => fs.rm(directory, { recursive: true, force: true }), "Cannot remove Blender source staging");
  return imported;
}
