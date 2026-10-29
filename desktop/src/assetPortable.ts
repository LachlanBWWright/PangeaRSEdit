import * as fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { err, ok, type Result } from "neverthrow";
import { relativePathSchema, type HostError, type ProjectAsset, type ProjectFile } from "@pangea/desktop-contracts";
import type { PortableAssets } from "../../packages/desktop-contracts/src/assetPortable.ts";
import { portableAssetsSchema } from "../../packages/desktop-contracts/src/assetPortable.ts";
import { ASSET_REGISTRY, jsonFile, readAssetRegistry } from "./assetRegistry.ts";
import { failure, hash, io, projectPath, statOrMissing } from "./files.ts";
import type { ProjectStore } from "./projectStore.ts";
import { packBlendSource } from "./blenderDependencies.ts";

async function packedBlendBytes(source: string, executable: string | undefined): Promise<Result<Uint8Array<ArrayBuffer>, HostError>> {
  if (!executable) return err(failure("Configure Blender before exporting .blend authoring sources. Blender packs linked libraries and textures into the portable source.", "configuration"));
  const temporary = await io(() => fs.mkdtemp(path.join(os.tmpdir(), "pangea-portable-blend-")), "Cannot create portable Blender workspace");
  if (temporary.isErr()) return err(temporary.error);
  const target = path.join(temporary.value, "source.blend");
  const packed = await packBlendSource(source, target, executable, new AbortController().signal);
  const result = packed.isErr() ? err(packed.error) : await readPortableFile(temporary.value, "source.blend");
  await io(() => fs.rm(temporary.value, { recursive: true, force: true }), "Cannot clean portable Blender workspace");
  return result;
}

async function readPortableFile(root: string, relative: string): Promise<Result<Uint8Array<ArrayBuffer>, HostError>> {
  const target = await projectPath(root, relative);
  if (target.isErr()) return err(target.error);
  const info = await statOrMissing(target.value);
  if (info.isErr()) return err(info.error);
  if (!info.value?.isFile()) return err(failure(`Missing asset dependency: ${relative}. Locate the source before exporting authoring files.`, "missing"));
  if (info.value.size > 128 * 1024 * 1024) return err(failure(`Portable asset file exceeds 128 MiB: ${relative}. Share large authoring sources separately.`, "limit"));
  return io(() => fs.readFile(target.value), `Cannot read asset dependency: ${relative}`).map((bytes) => Uint8Array.from(bytes));
}

export async function exportPortableAssets(root: string, ids: string[], includeAuthoringSources: boolean, blenderExecutable?: string): Promise<Result<PortableAssets, HostError>> {
  const registry = await readAssetRegistry(root);
  if (registry.isErr()) return err(registry.error);
  const assets: ProjectAsset[] = [];
  const files: ProjectFile[] = [];
  const warnings: string[] = [];
  let total = 0;
  for (const id of [...new Set(ids)]) {
    const asset = registry.value.find((entry) => entry.id === id);
    if (!asset) return err(failure(`Project asset is missing: ${id}`, "missing"));
    for (const relative of asset.outputs.files) {
      const read = await readPortableFile(root, relative);
      if (read.isErr()) return err(read.error);
      files.push({ path: relative, bytes: read.value });
      total += read.value.byteLength;
    }
    if (total > 512 * 1024 * 1024) return err(failure("Portable assets exceed 512 MiB. Share large authoring sources separately.", "limit"));
    const destination = `AuthoringSources/${asset.id}/${asset.revision}`;
    const source = { ...asset.source, mode: "managed", path: `${destination}/${asset.source.originalName}`,
      dependencies: asset.source.format === "blend" ? [] : asset.source.dependencies };
    const parsedSource = portableAssetsSchema.shape.assets.element.shape.source.safeParse(source);
    if (!parsedSource.success) return err(failure("Invalid portable source metadata", "invalid"));
    assets.push({ ...asset, source: parsedSource.data, previousRevision: null });
    if (!includeAuthoringSources) { warnings.push(`${asset.name}: authoring sources were omitted. Locate a source to reimport.`); continue; }
    const entry = asset.source.mode === "external" ? ok(asset.source.path) : await projectPath(root, asset.source.path);
    if (entry.isErr()) return err(entry.error);
    if (asset.source.format === "blend") {
      const packed = await packedBlendBytes(entry.value, blenderExecutable);
      if (packed.isErr()) return err(packed.error);
      files.push({ path: source.path, bytes: packed.value });
      assets[assets.length - 1] = { ...asset, source: { ...parsedSource.data,
        fingerprint: hash(`${asset.source.originalName}:${hash(packed.value)}`) }, previousRevision: null };
      total += packed.value.byteLength;
      if (total > 512 * 1024 * 1024) return err(failure("Portable assets exceed 512 MiB. Share large authoring sources separately.", "limit"));
      continue;
    }
    const directory = path.dirname(entry.value);
    for (const relative of [...new Set([path.basename(entry.value), ...asset.source.dependencies])]) {
      const read = await readPortableFile(directory, relative);
      if (read.isErr()) return err(read.error);
      files.push({ path: `${destination}/${relative}`, bytes: read.value });
      total += read.value.byteLength;
    }
    if (total > 512 * 1024 * 1024) return err(failure("Portable assets exceed 512 MiB. Share large authoring sources separately.", "limit"));
  }
  return ok({ version: 1, assets, files, warnings });
}

export async function importPortableAssets(project: ProjectStore, incoming: PortableAssets, replace = false, expectedRevision?: string) {
  const parsed = portableAssetsSchema.safeParse(incoming);
  if (!parsed.success) return err(failure("Invalid portable asset attachment", "invalid"));
  if (new Set(incoming.assets.map((asset) => asset.id)).size !== incoming.assets.length)
    return err(failure("Duplicate portable asset identities", "invalid"));
  const snapshot = await project.inspect(true);
  if (snapshot.isErr()) return err(snapshot.error);
  if (expectedRevision !== undefined && snapshot.value.revision !== expectedRevision)
    return err(failure("Project changed while preparing editable asset import", "conflict"));
  const existing = await readAssetRegistry(snapshot.value.folder);
  if (existing.isErr()) return err(existing.error);
  if (incoming.assets.some((asset) => asset.game !== snapshot.value.manifest.game)) return err(failure("Portable assets target a different game", "invalid"));
  const names = new Set(incoming.files.map((file) => file.path));
  if (names.size !== incoming.files.length) return err(failure("Duplicate portable asset paths", "invalid"));
  for (const asset of incoming.assets) {
    if (asset.source.mode !== "managed" || !relativePathSchema.safeParse(asset.source.path).success
      || !asset.source.path.startsWith(`AuthoringSources/${asset.id}/`)
      || asset.source.dependencies.some((dependency) => !relativePathSchema.safeParse(dependency).success))
      return err(failure("Portable sources must be managed below their asset identity", "invalid"));
    if (asset.outputs.files.some((file) => !file.startsWith(`Assets/Models/${asset.id}/${asset.revision}/`))
      || !asset.outputs.files.includes(asset.outputs.model) || !asset.outputs.files.includes(asset.outputs.preview)
      || asset.outputs.skeleton !== null && !asset.outputs.files.includes(asset.outputs.skeleton))
      return err(failure("Portable outputs must remain below their asset identity and revision", "invalid"));
    if (!replace && existing.value.some((entry) => entry.id === asset.id && entry.revision !== asset.revision))
      return err(failure(`Asset ${asset.name} already exists with a different revision. Import into a fresh project or resolve it before importing.`, "conflict"));
    if (asset.outputs.files.some((file) => !names.has(file))) return err(failure(`Portable model outputs are missing for ${asset.name}`, "missing"));
    if (names.has(asset.source.path) && asset.source.dependencies.some((dependency) =>
      !names.has(`${path.posix.dirname(asset.source.path)}/${dependency}`)))
      return err(failure(`Portable authoring dependencies are missing for ${asset.name}`, "missing"));
    const current = existing.value.find((entry) => entry.id === asset.id);
    if (current && !replace) {
      if (JSON.stringify([current.outputs, current.animations, current.recipe]) !== JSON.stringify([asset.outputs, asset.animations, asset.recipe]))
        return err(failure(`Asset ${asset.name} has conflicting metadata for the same revision. Import into a fresh project.`, "conflict"));
      for (const relative of asset.outputs.files) {
        const previous = await readPortableFile(snapshot.value.folder, relative);
        if (previous.isErr()) return err(previous.error);
        const incomingFile = incoming.files.find((file) => file.path === relative);
        if (!incomingFile || hash(previous.value) !== hash(incomingFile.bytes))
          return err(failure(`Asset ${asset.name} has different output bytes for the same revision. Import into a fresh project.`, "conflict"));
      }
    }
  }
  if (incoming.files.some((file) => !incoming.assets.some((asset) => asset.outputs.files.includes(file.path)
    || file.path.startsWith(`AuthoringSources/${asset.id}/`)))) return err(failure("Undeclared portable asset file", "invalid"));
  const restored = incoming.assets.map((asset) => {
    const current = existing.value.find((entry) => entry.id === asset.id);
    // Source omission must not disconnect an existing editable source.
    return current && !names.has(asset.source.path) ? { ...asset, source: current.source } : asset;
  });
  const merged = [...existing.value.filter((asset) => !incoming.assets.some((entry) => entry.id === asset.id)), ...restored];
  if (merged.length > 512) return err(failure("Portable import would exceed 512 registered assets", "limit"));
  if (project.folder() !== snapshot.value.folder) return err(failure("Project changed while restoring editable assets", "conflict"));
  return (await project.save(snapshot.value.revision, snapshot.value.manifest, [...incoming.files, jsonFile(ASSET_REGISTRY, merged)], [])).map(() => merged);
}
