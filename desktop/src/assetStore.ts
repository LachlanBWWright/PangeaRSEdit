import path from "node:path";
import * as fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { err, ok, type Result } from "neverthrow";
import { type AssetImportRecipe, type AssetImportResult, type HostError, type ProjectAsset, type ProjectFile } from "@pangea/desktop-contracts";
import { failure, io, projectPath, statOrMissing } from "./files.ts";
import type { ProjectStore } from "./projectStore.ts";
import { convertAsset, type ConvertedAsset } from "./assetConversion.ts";
import { fingerprintAssetSource, importAssetSource } from "./assetSources.ts";
import { ASSET_REGISTRY, assetHistoryPath, convertedProjectFiles, jsonFile, readAssetHistory, readAssetRegistry } from "./assetRegistry.ts";
import { importBlendSource } from "./assetBlendSources.ts";

interface PendingAsset { result: AssetImportResult; files: ProjectFile[]; root: string; staging: string }
export interface AssetProgress { id: string; stage: string; message: string }

export class AssetStore {
  private readonly pending = new Map<string, PendingAsset>();
  private active: { id: string; controller: AbortController } | null = null;
  private watching = false;
  private publishing = false;
  private readonly observedSources = new Map<string, string>();
  private progress: (event: AssetProgress) => void = () => {};
  constructor(private readonly project: ProjectStore) {}
  public onProgress(listener: (event: AssetProgress) => void) { this.progress = listener; }

  public async list(): Promise<Result<ProjectAsset[], HostError>> {
    const root = this.project.folder();
    if (!root) return err(failure("Open a project first", "no-project"));
    const result = await readAssetRegistry(root);
    return this.project.folder() === root ? result : err(failure("Project changed during asset operation", "conflict"));
  }
  public pendingImports(): AssetImportResult[] {
    return [...this.pending.values()].filter((entry) => entry.root === this.project.folder()).map((entry) => entry.result);
  }
  public cancel(id?: string): Result<void, HostError> {
    if (this.active && (!id || id === this.active.id)) this.active.controller.abort();
    return ok(undefined);
  }
  public async source(id: string): Promise<Result<string, HostError>> {
    const root = this.project.folder();
    const assets = await this.list();
    if (assets.isErr()) return err(assets.error);
    const asset = assets.value.find((entry) => entry.id === id);
    if (!asset || !root || this.project.folder() !== root) return err(failure("Unknown project asset", "missing"));
    const target = asset.source.mode === "external" ? ok(asset.source.path) : await projectPath(root, asset.source.path);
    if (target.isErr()) return err(target.error);
    const info = await statOrMissing(target.value);
    if (info.isErr()) return err(info.error);
    if (this.project.folder() !== root) return err(failure("Project changed during asset operation", "conflict"));
    return info.value?.isFile() && !info.value.isSymbolicLink() ? target
      : err(failure("Authoring source is missing. Locate it to resume editing and reimporting.", "missing"));
  }
  public async preview(id: string, revision?: string): Promise<Result<Uint8Array, HostError>> {
    const root = this.project.folder();
    const pending = this.pending.get(id);
    if (pending && pending.root === root && (!revision || pending.result.asset.revision === revision)) {
      const target = path.join(pending.staging, path.basename(pending.result.asset.outputs.preview));
      const result = await this.readPreview(target);
      return this.project.folder() === root ? result : err(failure("Project changed during asset operation", "conflict"));
    }
    const assets = await this.list();
    if (assets.isErr()) return err(assets.error);
    const asset = assets.value.find((entry) => entry.id === id && (!revision || entry.revision === revision));
    if (!asset || !root || this.project.folder() !== root) return err(failure("Unknown asset preview", "missing"));
    const target = await projectPath(root, asset.outputs.preview);
    if (target.isErr()) return err(target.error);
    const result = await this.readPreview(target.value);
    return this.project.folder() === root ? result : err(failure("Project changed during asset operation", "conflict"));
  }
  private async readPreview(target: string): Promise<Result<Uint8Array, HostError>> {
    const info = await io(() => fs.stat(target), "Cannot inspect asset preview");
    if (info.isErr()) return err(info.error);
    if (info.value.size > 128 * 1024 * 1024) return err(failure("Preview exceeds 128 MiB", "limit"));
    return io(() => fs.readFile(target), "Cannot read asset preview").map((bytes) => Uint8Array.from(bytes));
  }
  public async importSource(name: string, sourcePath: string, mode: "managed" | "external", blenderExecutable?: string,
    previous?: ProjectAsset, recipe?: AssetImportRecipe): Promise<Result<AssetImportResult, HostError>> {
    const root = this.project.folder();
    if (!root) return err(failure("Open a project first", "no-project"));
    if (this.active || this.publishing || this.project.busy()) return err(failure("Wait for the current asset import or save", "busy"));
    const id = previous?.id ?? randomUUID();
    if (this.pending.has(id)) return err(failure("Apply or discard this asset's pending import before importing another revision", "busy"));
    const controller = new AbortController();
    this.active = { id, controller };
    const result = await this.stage(root, id, name, sourcePath, mode, controller.signal, blenderExecutable, previous, recipe);
    this.active = null;
    this.progress({ id, stage: result.isErr() ? "failed" : "complete", message: result.isErr() ? result.error.message : result.value.needsReview ? "Review import before applying" : "Asset imported" });
    return result;
  }
  public async importBuffer(name: string, bytes: Uint8Array, sourceAssetId?: string): Promise<Result<AssetImportResult, HostError>> {
    const root = this.project.folder();
    if (!root) return err(failure("Open a project first", "no-project"));
    if (sourceAssetId) {
      const assets = await this.list();
      if (assets.isErr()) return err(assets.error);
      if (!assets.value.some((asset) => asset.id === sourceAssetId)) return err(failure("Source asset is no longer in this project", "missing"));
    }
    if (this.project.folder() !== root) return err(failure("Project changed during asset operation", "conflict"));
    const temporary = await projectPath(root, `AuthoringSources/Imports/${randomUUID()}/model.glb`);
    if (temporary.isErr()) return err(temporary.error);
    const directory = await io(() => fs.mkdir(path.dirname(temporary.value), { recursive: true }), "Cannot create model variant source");
    if (directory.isErr()) return err(directory.error);
    const written = await io(() => fs.writeFile(temporary.value, bytes, { flag: "wx" }), "Cannot save model variant source");
    if (written.isErr()) return err(written.error);
    if (this.project.folder() !== root) return err(failure("Project changed during asset operation", "conflict"));
    const imported = await this.importSource(name, temporary.value, "managed");
    await io(() => fs.rm(path.dirname(temporary.value), { recursive: true, force: true }), "Cannot remove model variant staging");
    if (imported.isErr() || !sourceAssetId) return imported;
    const asset = { ...imported.value.asset, parentAssetId: sourceAssetId };
    const pending = this.pending.get(asset.id);
    if (pending) { pending.result.asset = asset; return ok({ ...imported.value, asset }); }
    return (await this.publish(asset, [], root)).map((published) => ({ ...imported.value, asset: published }));
  }
  private async stage(root: string, id: string, name: string, sourcePath: string, mode: "managed" | "external", signal: AbortSignal,
    blenderExecutable?: string, previous?: ProjectAsset, recipe?: AssetImportRecipe): Promise<Result<AssetImportResult, HostError>> {
    this.progress({ id, stage: "source", message: "Collecting authoring source and dependencies" });
    const source = path.extname(sourcePath).toLowerCase() === ".blend"
      ? await importBlendSource(root, { assetId: id, sourcePath, mode, signal }, blenderExecutable, signal)
      : await importAssetSource(root, { assetId: id, sourcePath, mode, signal });
    if (source.isErr()) return err(source.error);
    if (signal.aborted) {
      await this.discardManagedSource(root, source.value);
      return err(failure("Asset import cancelled", "cancelled"));
    }
    const revision = randomUUID();
    const staging = path.join(root, "AuthoringSources", id, revision, "Generated");
    const snapshot = await this.project.inspect();
    if (snapshot.isErr()) {
      await this.discardManagedSource(root, source.value);
      return err(snapshot.error);
    }
    const selectedRecipe = recipe ?? previous?.recipe ?? { scale: 1, rotation: [0, 0, 0] };
    const converted = await convertAsset({ sourcePath: source.value.entryPath, game: snapshot.value.manifest.game,
      stagingDirectory: staging, blenderExecutable, allowLossy: true, signal, recipe: selectedRecipe,
      onProgress: (event) => this.progress({ id, ...event }) });
    if (converted.isErr()) {
      await io(() => fs.rm(staging, { recursive: true, force: true }), "Cannot remove failed import");
      await this.discardManagedSource(root, source.value);
      return err(converted.error);
    }
    if (this.project.folder() !== root || signal.aborted) {
      await io(() => fs.rm(staging, { recursive: true, force: true }), "Cannot remove cancelled import");
      await this.discardManagedSource(root, source.value);
      return err(failure("Asset import cancelled", "cancelled"));
    }
    const destination = `Assets/Models/${id}/${revision}`;
    const files = await convertedProjectFiles(converted.value, destination);
    if (files.isErr()) {
      await io(() => fs.rm(staging, { recursive: true, force: true }), "Cannot remove failed import");
      await this.discardManagedSource(root, source.value);
      return err(files.error);
    }
    const importedSource = source.value;
    const assetSource = { mode: importedSource.mode, path: importedSource.path, originalName: importedSource.originalName,
      format: importedSource.format, dependencies: importedSource.dependencies, fingerprint: importedSource.fingerprint };
    const asset = this.record(id, name, revision, snapshot.value.manifest.game, assetSource, selectedRecipe, converted.value, destination, previous);
    const reasons = [...asset.warnings];
    if (previous && previous.animations.some((clip) => !asset.animations.some((next) => next.name === clip.name))) reasons.push("One or more animations were removed or renamed. Review animation mappings.");
    if (previous && Boolean(previous.outputs.skeleton) !== Boolean(asset.outputs.skeleton))
      reasons.push("The asset changed between static and animated geometry. Review its object appearance and animation mappings.");
    const result = { asset, needsReview: reasons.length > 0, reasons };
    this.pending.set(id, { result, files: files.value, root, staging });
    if (result.needsReview) return ok(result);
    return (await this.accept(id, revision)).map((published) => ({ asset: published, needsReview: false, reasons: [] }));
  }
  private record(id: string, name: string, revision: string, game: string, source: ProjectAsset["source"], recipe: AssetImportRecipe,
    converted: ConvertedAsset, destination: string, previous?: ProjectAsset): ProjectAsset {
    const relative = (target: string) => `${destination}/${path.basename(target)}`;
    return { version: 1, id, name, revision, game, source, recipe,
      outputs: { model: relative(converted.modelPath), skeleton: converted.skeletonPath ? relative(converted.skeletonPath) : null,
        preview: relative(converted.previewPath), files: converted.files.map(relative) },
      animations: converted.animationClips.map((clip, index) => ({ index, name: clip, events: converted.animationEvents[index] ?? [] })), warnings: [...converted.warnings],
      materials: converted.materials,
      importedAt: new Date().toISOString(), previousRevision: previous?.revision ?? null, parentAssetId: previous?.parentAssetId };
  }
  public async accept(id: string, revision: string): Promise<Result<ProjectAsset, HostError>> {
    const pending = this.pending.get(id);
    const root = this.project.folder();
    if (!pending || pending.root !== root || pending.result.asset.revision !== revision) return err(failure("This import is no longer available", "missing"));
    const saved = await this.publish(pending.result.asset, pending.files, pending.root);
    if (saved.isErr()) return err(saved.error);
    this.pending.delete(id);
    await io(() => fs.rm(pending.staging, { recursive: true, force: true }), "Cannot remove conversion staging");
    return saved;
  }
  public async discard(id: string, revision: string): Promise<Result<void, HostError>> {
    const pending = this.pending.get(id);
    if (!pending || pending.root !== this.project.folder() || pending.result.asset.revision !== revision)
      return err(failure("This import is no longer available", "missing"));
    this.pending.delete(id);
    const generated = await io(() => fs.rm(pending.staging, { recursive: true, force: true }), "Cannot remove discarded conversion");
    if (generated.isErr()) return err(generated.error);
    return this.discardManagedSource(pending.root, pending.result.asset.source);
  }
  private async discardManagedSource(root: string, source: ProjectAsset["source"]): Promise<Result<void, HostError>> {
    if (source.mode !== "managed") return ok(undefined);
    const target = await projectPath(root, path.posix.dirname(source.path));
    return target.isErr() ? err(target.error) : io(() => fs.rm(target.value, { recursive: true, force: true }), "Cannot remove discarded authoring source");
  }
  private async publish(asset: ProjectAsset, files: ProjectFile[], expectedRoot: string): Promise<Result<ProjectAsset, HostError>> {
    if (this.publishing) return err(failure("Wait for the current asset update to finish", "busy"));
    this.publishing = true;
    const result = await this.publishRevision(asset, files, expectedRoot);
    this.publishing = false;
    return result;
  }
  private async publishRevision(asset: ProjectAsset, files: ProjectFile[], expectedRoot: string): Promise<Result<ProjectAsset, HostError>> {
    if (this.project.folder() !== expectedRoot) return err(failure("Project changed during asset operation", "conflict"));
    const current = await this.list();
    if (current.isErr()) return err(current.error);
    if (this.project.folder() !== expectedRoot) return err(failure("Project changed during asset operation", "conflict"));
    const snapshot = await this.project.inspect();
    if (snapshot.isErr()) return err(snapshot.error);
    if (this.project.folder() !== expectedRoot || snapshot.value.folder !== expectedRoot)
      return err(failure("Project changed during asset operation", "conflict"));
    const records = [...current.value.filter((entry) => entry.id !== asset.id), asset];
    const saved = await this.project.save(snapshot.value.revision, snapshot.value.manifest,
      [...files, jsonFile(ASSET_REGISTRY, records), jsonFile(assetHistoryPath(asset.revision), asset)], []);
    return saved.map(() => asset);
  }
  public async undo(id: string): Promise<Result<ProjectAsset, HostError>> {
    const root = this.project.folder();
    const assets = await this.list();
    if (assets.isErr()) return err(assets.error);
    const current = assets.value.find((entry) => entry.id === id);
    if (!current?.previousRevision || !root || this.project.folder() !== root) return err(failure("No previous asset revision", "missing"));
    const previous = await readAssetHistory(root, current.previousRevision);
    return previous.isErr() ? err(previous.error) : this.publish(previous.value, [], root);
  }
  public async duplicate(id: string, name: string, blenderExecutable?: string): Promise<Result<ProjectAsset, HostError>> {
    const root = this.project.folder();
    const assets = await this.list();
    if (assets.isErr()) return err(assets.error);
    const original = assets.value.find((asset) => asset.id === id);
    if (!original) return err(failure("Unknown project asset", "missing"));
    const source = await this.source(id);
    if (source.isErr()) return err(source.error);
    if (!root || this.project.folder() !== root) return err(failure("Project changed during asset operation", "conflict"));
    const imported = await this.importSource(name, source.value, "managed", blenderExecutable, undefined, original.recipe);
    if (imported.isErr()) return err(imported.error);
    return imported.value.needsReview ? this.accept(imported.value.asset.id, imported.value.asset.revision) : ok(imported.value.asset);
  }
  public async checkSources(blenderExecutable?: string): Promise<void> {
    if (this.watching || this.active || this.project.busy() || !this.project.folder()) return;
    this.watching = true;
    await this.refreshSources(blenderExecutable);
    this.watching = false;
  }
  private async refreshSources(blenderExecutable?: string): Promise<void> {
    const root = this.project.folder();
    const assets = await this.list();
    if (assets.isErr() || !root || this.project.folder() !== root) return;
    for (const asset of assets.value) {
      if (this.pending.has(asset.id) || root !== this.project.folder()) continue;
      const source = await this.source(asset.id);
      if (source.isErr()) continue;
      const names = [source.value, ...asset.source.dependencies.map((entry) => path.resolve(path.dirname(source.value), entry))];
      const stats = await io(() => Promise.all(names.map((name) => fs.stat(name))), "Asset source is missing. Locate it to resume reimporting.");
      const key = `${root}:${asset.id}:${asset.revision}`;
      const main = stats.isErr() ? await statOrMissing(source.value) : null;
      const signature = stats.isErr() ? `missing:${main?.isOk() ? main.value?.mtimeMs : "unknown"}`
        : stats.value.map((entry) => `${entry.size}:${entry.mtimeMs}:${entry.ctimeMs}`).join(";");
      if (this.observedSources.get(key) === signature) continue;
      this.observedSources.set(key, signature);
      if (stats.isErr()) {
        if (asset.source.mode === "external" && asset.source.format === "blend")
          await this.reimportWatched(asset, source.value, key, blenderExecutable);
        else this.progress({ id: asset.id, stage: "missing", message: stats.error.message });
        continue;
      }
      const fingerprint = await fingerprintAssetSource(root, asset.source);
      if (fingerprint.isErr()) { this.progress({ id: asset.id, stage: "failed", message: fingerprint.error.message }); continue; }
      if (fingerprint.value === asset.source.fingerprint) continue;
      await this.reimportWatched(asset, source.value, key, blenderExecutable);
    }
  }
  private async reimportWatched(asset: ProjectAsset, source: string, key: string, blenderExecutable?: string) {
    const imported = await this.importSource(asset.name, source, asset.source.mode, blenderExecutable, asset, asset.recipe);
    if (imported.isErr() && ["busy", "cancelled", "conflict", "configuration", "launch"].includes(imported.error.code))
      this.observedSources.delete(key);
  }
}
