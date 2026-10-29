import * as fs from "node:fs/promises";
import path from "node:path";
import { err, ok, type Result } from "neverthrow";
import { unzipSync, zipSync } from "fflate";
import {
  PROJECT_MANIFEST, projectManifestSchema, type GameId, type HostError,
  type ProjectFile, type ProjectManifest, type ProjectSnapshot,
} from "@pangea/desktop-contracts";
import { Result as BoundaryResult } from "neverthrow";
import { atomicWrite, failure, hash, io, parseJson, projectPath, revisionOf, scanProject, statOrMissing } from "./files.ts";
import { recoverInterruptedSave, saveTransaction } from "./projectTransaction.ts";
import { ProjectHistory } from "./projectHistory.ts";
import type { CachedFile } from "./files.ts";
import { ProjectVersions } from "./projectVersions.ts";
import { ProjectReviews } from "./projectReview.ts";
import { AssetStore } from "./assetStore.ts";
import { copyAuthoringSources } from "./authoringStorage.ts";
import { authoringSourceDirectory } from "./authoringPaths.ts";
import { SpriteAssets } from "./spriteAssets.ts";

export class ProjectStore {
  private root: string | null = null;
  private saving = false;
  private opening = false;
  private readonly scanCache = new Map<string, CachedFile>();
  public readonly versions = new ProjectVersions();
  public readonly reviews = new ProjectReviews(this);
  public readonly assets = new AssetStore(this);
  public readonly sprites = new SpriteAssets(this);
  public readonly history: ProjectHistory;
  constructor(private readonly recoveryRoot: string) {
    this.history = new ProjectHistory(path.join(recoveryRoot, ".recent-projects.json"));
  }

  public folder(): string | null { return this.root; }
  public busy(): boolean { return this.saving || this.opening; }
  public invalidate(relative?: string) { if (relative && this.root) this.scanCache.delete(path.join(this.root, relative)); else this.scanCache.clear(); }

  public async open(folder: string): Promise<Result<ProjectSnapshot, HostError>> {
    if (this.busy()) return err(failure("Wait for the current project operation to finish", "busy"));
    this.opening = true;
    const opened = await this.performOpen(folder);
    this.opening = false;
    return opened;
  }

  private async performOpen(folder: string): Promise<Result<ProjectSnapshot, HostError>> {
    const resolved = await io(() => fs.realpath(folder), "Cannot open project folder");
    if (resolved.isErr()) return err(resolved.error);
    const recovered = await recoverInterruptedSave(resolved.value);
    if (recovered.isErr()) return err(recovered.error);
    const previous = this.root;
    this.root = resolved.value;
    this.scanCache.clear();
    const snapshot = await this.inspectProject(false, false);
    if (snapshot.isErr()) this.root = previous;
    else {
      this.versions.clear();
      this.reviews.clear();
      await this.versions.capture(snapshot.value.folder, snapshot.value.files);
      await this.history.remember(snapshot.value.folder, snapshot.value.manifest.name);
    }
    return snapshot;
  }

  public async reopen(folder: string): Promise<Result<ProjectSnapshot, HostError>> {
    const recent = await this.history.list();
    if (recent.isErr()) return err(recent.error);
    if (!recent.value.some((entry) => entry.folder === folder)) return err(failure("Choose this folder with Open Project first", "forbidden"));
    return this.open(folder);
  }

  public async copy(folder: string, revision: string): Promise<Result<ProjectSnapshot, HostError>> {
    if (this.busy()) return err(failure("Wait for the current project operation to finish", "busy"));
    this.saving = true;
    const result = await this.copyTo(folder, revision);
    this.saving = false;
    if (result.isErr()) return err(result.error);
    return this.open(folder);
  }

  private async copyTo(folder: string, revision: string): Promise<Result<void, HostError>> {
    const snapshot = await this.inspect();
    if (snapshot.isErr()) return err(snapshot.error);
    if (revision !== snapshot.value.revision) return err(failure("Project changed on disk. Reload before Save As.", "conflict"));
    const resolved = await io(() => fs.realpath(folder), "Cannot open destination");
    if (resolved.isErr()) return err(resolved.error);
    const source = snapshot.value.folder;
    if (resolved.value === source || resolved.value.startsWith(`${source}${path.sep}`))
      return err(failure("Choose a folder outside the current project", "invalid"));
    const listing = await io(() => fs.readdir(resolved.value), "Cannot inspect destination");
    if (listing.isErr()) return err(listing.error);
    if (listing.value.length) return err(failure("Save As requires an empty destination folder", "exists"));
    const files = await this.read(snapshot.value.files.map((file) => file.path));
    if (files.isErr()) return err(files.error);
    const hashes = new Map(snapshot.value.files.map((file) => [file.path, file.hash]));
    if (files.value.some((file) => hash(file.bytes) !== hashes.get(file.path)))
      return err(failure("Project changed while copying. Retry Save As.", "conflict"));
    const current = await this.inspect();
    if (current.isErr()) return err(current.error);
    if (current.value.revision !== revision) return err(failure("Project changed while copying. Retry Save As.", "conflict"));
    const sources = await copyAuthoringSources(source, resolved.value);
    if (sources.isErr()) {
      await io(() => fs.rm(path.join(resolved.value, authoringSourceDirectory), { recursive: true, force: true }), "Cannot clean copied sources");
      return err(sources.error);
    }
    const saved = await saveTransaction(resolved.value, files.value, []);
    if (saved.isErr()) await io(() => fs.rm(path.join(resolved.value, authoringSourceDirectory), { recursive: true, force: true }), "Cannot clean copied sources");
    return saved;
  }

  public async create(folder: string, name: string, game: GameId): Promise<Result<ProjectSnapshot, HostError>> {
    if (this.busy()) return err(failure("Wait for the current project operation to finish", "busy"));
    const manifest: ProjectManifest = { kind: "pangea-editor-project", version: 1, name, game, levels: [] };
    const existing = await statOrMissing(path.join(folder, PROJECT_MANIFEST));
    if (existing.isErr()) return err(existing.error);
    if (existing.value) return err(failure("This folder already contains a project. Use Open Project.", "exists"));
    const written = await io(() => fs.writeFile(path.join(folder, PROJECT_MANIFEST), JSON.stringify(manifest, null, 2), { flag: "wx" }), "Cannot create project");
    if (written.isErr()) return err(written.error);
    return this.open(folder);
  }

  public async inspect(force = false): Promise<Result<ProjectSnapshot, HostError>> {
    return this.inspectProject(force, true);
  }

  private async inspectProject(force: boolean, captureVersions: boolean): Promise<Result<ProjectSnapshot, HostError>> {
    const root = this.root;
    if (!root) return err(failure("Open a project first", "no-project"));
    const location = await projectPath(root, PROJECT_MANIFEST);
    if (location.isErr()) return err(location.error);
    const text = await io(() => fs.readFile(location.value, "utf8"), "Cannot read pangea.project.json");
    if (text.isErr()) return err(text.error);
    const json = parseJson(text.value);
    if (json.isErr()) return err(json.error);
    const manifest = projectManifestSchema.safeParse(json.value);
    if (!manifest.success) return err(failure("Invalid project manifest", "invalid"));
    if (force) this.scanCache.clear();
    const entries = await scanProject(root, "", this.scanCache);
    if (entries.isErr()) return err(entries.error);
    const recovery = await statOrMissing(path.join(this.recoveryRoot, `${hash(root)}.zip`));
    if (this.root !== root) return err(failure("Project changed while reading its files", "conflict"));
    const snapshot = { folder: root, manifest: manifest.data, files: entries.value,
      revision: revisionOf(entries.value), recoveryAvailable: recovery.isOk() && recovery.value !== null };
    if (captureVersions) await this.versions.capture(snapshot.folder, snapshot.files);
    if (this.root !== root) return err(failure("Project changed while reading its files", "conflict"));
    return ok(snapshot);
  }

  public async read(paths: string[]): Promise<Result<ProjectFile[], HostError>> {
    const root = this.root;
    if (!root) return err(failure("Open a project first", "no-project"));
    const files: ProjectFile[] = [];
    let total = 0;
    for (const relative of paths) {
      const location = await projectPath(root, relative);
      if (location.isErr()) return err(location.error);
      const info = await io(() => fs.stat(location.value), `Cannot inspect ${relative}`);
      if (info.isErr()) return err(info.error);
      total += info.value.size;
      if (info.value.size > 128 * 1024 * 1024 || total > 512 * 1024 * 1024)
        return err(failure("Selected project files exceed the memory budget", "limit"));
      const bytes = await io(() => fs.readFile(location.value), `Cannot read ${relative}`);
      if (bytes.isErr()) return err(bytes.error);
      files.push({ path: relative, bytes: Uint8Array.from(bytes.value) });
    }
    if (this.root !== root) return err(failure("Project changed while reading its files", "conflict"));
    return ok(files);
  }

  public async save(revision: string, manifest: ProjectManifest, files: ProjectFile[], removed: string[]) {
    if (!this.root) return err(failure("Open a project first", "no-project"));
    if (this.busy()) return err(failure("A project operation is already running", "busy"));
    this.saving = true;
    const result = await this.performSave(revision, manifest, files, removed);
    this.saving = false;
    return result;
  }

  private async performSave(revision: string, manifest: ProjectManifest, files: ProjectFile[], removed: string[]): Promise<Result<ProjectSnapshot, HostError>> {
    const snapshot = await this.inspect(true);
    if (snapshot.isErr()) return snapshot;
    if (snapshot.value.revision !== revision) return err(failure("Project files changed on disk. Review and reload before saving.", "conflict"));
    if (snapshot.value.manifest.game !== manifest.game) return err(failure("A project cannot change games", "invalid"));
    if (!this.root) return err(failure("Project was closed", "no-project"));
    const outputs = [...files.filter((file) => file.path !== PROJECT_MANIFEST), {
      path: PROJECT_MANIFEST, bytes: new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`),
    }];
    const projected = new Map(snapshot.value.files.map((file) => [file.path, file.size]));
    for (const name of removed) projected.delete(name);
    for (const file of outputs) projected.set(file.path, file.bytes.length);
    if (projected.size > 4096) return err(failure("Saved project would exceed 4096 files", "limit"));
    if ([...projected.values()].some((size) => size > 128 * 1024 * 1024)
      || [...projected.values()].reduce((total, size) => total + size, 0) > 512 * 1024 * 1024)
      return err(failure("Saved project would exceed the project size limits", "limit"));
    const saved = await saveTransaction(this.root, outputs, removed);
    if (saved.isErr()) return err(saved.error);
    await this.discardRecovery();
    return this.inspect();
  }

  private recoveryPath(): string { return path.join(this.recoveryRoot, `${hash(this.root ?? "")}.zip`); }

  public async backup(manifest: ProjectManifest, files: ProjectFile[]): Promise<Result<void, HostError>> {
    if (!this.root) return err(failure("Open a project first", "no-project"));
    const entries = Object.fromEntries(files.map((file) => [file.path, file.bytes]));
    entries[PROJECT_MANIFEST] = new TextEncoder().encode(JSON.stringify(manifest));
    const bytes = BoundaryResult.fromThrowable(() => zipSync(entries), () => failure("Cannot encode recovery snapshot"))();
    if (bytes.isErr()) return err(bytes.error);
    return atomicWrite(this.recoveryPath(), bytes.value);
  }

  public async recover(): Promise<Result<ProjectFile[], HostError>> {
    if (!this.root) return err(failure("Open a project first", "no-project"));
    const bytes = await io(() => fs.readFile(this.recoveryPath()), "No recovery snapshot available");
    if (bytes.isErr()) return err(bytes.error);
    return BoundaryResult.fromThrowable(() => Object.entries(unzipSync(bytes.value)).map(([relative, data]) => ({ path: relative, bytes: data })),
      () => failure("Cannot decode recovery snapshot"))();
  }

  public discardRecovery() { return io(() => fs.rm(this.recoveryPath(), { force: true }), "Cannot remove recovery snapshot"); }
}
