import * as fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { err, ok, type Result } from "neverthrow";
import type { HostError, PortableAssets, ProjectAsset, ProjectFile } from "@pangea/desktop-contracts";
import type { ProjectStore } from "./projectStore.ts";
import { importPortableAssets } from "./assetPortable.ts";
import { portableAssetsSchema } from "@pangea/desktop-contracts";
import { ASSET_REGISTRY, jsonFile, readAssetRegistry } from "./assetRegistry.ts";
import { failure, hash, io, projectPath, statOrMissing } from "./files.ts";

interface SavedFile { path: string; bytes: Uint8Array<ArrayBuffer> | null; importedHash: string }
interface Receipt { root: string; before: ProjectAsset[]; after: ProjectAsset[]; files: SavedFile[]; registryExisted: boolean }
const receipts = new WeakMap<ProjectStore, Map<string, Receipt>>();

async function readOptional(root: string, relative: string): Promise<Result<Uint8Array<ArrayBuffer> | null, HostError>> {
  const target = await projectPath(root, relative);
  if (target.isErr()) return err(target.error);
  const info = await statOrMissing(target.value);
  if (info.isErr()) return err(info.error);
  if (!info.value) return ok(null);
  if (!info.value.isFile()) return err(failure("Import destination must be a regular file", "invalid"));
  if (info.value.size > 128 * 1024 * 1024) return err(failure("Import destination exceeds 128 MiB", "limit"));
  return io(() => fs.readFile(target.value), `Cannot snapshot ${relative}`).map((bytes) => Uint8Array.from(bytes));
}

export async function importReversibleAssets(project: ProjectStore, incoming: PortableAssets) {
  const parsed = portableAssetsSchema.safeParse(incoming);
  if (!parsed.success) return err(failure("Invalid portable asset attachment", "invalid"));
  const snapshot = await project.inspect(true);
  if (snapshot.isErr()) return err(snapshot.error);
  const root = snapshot.value.folder;
  const registry = await readAssetRegistry(root);
  if (registry.isErr()) return err(registry.error);
  const files: SavedFile[] = [];
  let size = 0;
  for (const file of incoming.files) {
    const previous = await readOptional(root, file.path);
    if (previous.isErr()) return err(previous.error);
    size += (previous.value?.byteLength ?? 0) + file.bytes.byteLength;
    if (size > 512 * 1024 * 1024) return err(failure("Reversible import exceeds 512 MiB", "limit"));
    files.push({ path: file.path, bytes: previous.value, importedHash: hash(file.bytes) });
  }
  const current = await project.inspect(true);
  if (current.isErr()) return err(current.error);
  if (current.value.folder !== root || current.value.revision !== snapshot.value.revision)
    return err(failure("Project changed while preparing import", "conflict"));
  const imported = await importPortableAssets(project, incoming, true, snapshot.value.revision);
  if (imported.isErr()) return err(imported.error);
  const ids = new Set(incoming.assets.map((asset) => asset.id));
  const id = randomUUID();
  const projectReceipts = receipts.get(project) ?? new Map<string, Receipt>();
  projectReceipts.set(id, { root, before: registry.value.filter((asset) => ids.has(asset.id)),
    after: imported.value.filter((asset) => ids.has(asset.id)), files,
    registryExisted: snapshot.value.files.some((file) => file.path === ASSET_REGISTRY) });
  receipts.set(project, projectReceipts);
  return ok({ id, assets: imported.value });
}

export async function undoAssetImport(project: ProjectStore, id: string) {
  const receipt = receipts.get(project)?.get(id);
  if (!receipt || project.folder() !== receipt.root) return err(failure("This import no longer belongs to the open project", "conflict"));
  const snapshot = await project.inspect(true);
  if (snapshot.isErr()) return err(snapshot.error);
  const registry = await readAssetRegistry(receipt.root);
  if (registry.isErr()) return err(registry.error);
  for (const asset of receipt.after) {
    if (!isDeepStrictEqual(registry.value.find((entry) => entry.id === asset.id), asset))
      return err(failure("An imported asset was edited; undo would overwrite its changes", "conflict"));
  }
  const files: ProjectFile[] = [];
  const removed: string[] = [];
  for (const file of receipt.files) {
    const current = await readOptional(receipt.root, file.path);
    if (current.isErr()) return err(current.error);
    if (!current.value || hash(current.value) !== file.importedHash)
      return err(failure(`Imported file changed; undo would overwrite ${file.path}`, "conflict"));
    if (file.bytes === null) removed.push(file.path);
    else files.push({ path: file.path, bytes: file.bytes });
  }
  const ids = new Set(receipt.after.map((asset) => asset.id));
  const restored = [...registry.value.filter((asset) => !ids.has(asset.id)), ...receipt.before];
  if (!receipt.registryExisted && !restored.length) removed.push(ASSET_REGISTRY);
  else files.push(jsonFile(ASSET_REGISTRY, restored));
  if (project.folder() !== receipt.root) return err(failure("Project changed while undoing import", "conflict"));
  const saved = await project.save(snapshot.value.revision, snapshot.value.manifest, files, removed);
  if (saved.isErr()) return err(saved.error);
  receipts.get(project)?.delete(id);
  return ok(restored);
}
