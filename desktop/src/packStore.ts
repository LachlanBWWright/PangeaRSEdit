import * as fs from "node:fs/promises";
import path from "node:path";
import { err, ok, type Result } from "neverthrow";
import { installedPackSchema, type HostError, type InstalledPack, type PackLevelInput, type ProjectFile } from "@pangea/desktop-contracts";
import { z } from "zod";
import type { ProjectStore } from "./projectStore.ts";
import type { GameStore } from "./gameStore.ts";
import { atomicWrite, failure, hash, io, parseJson, projectPath, statOrMissing } from "./files.ts";
import { buildPackArchive, readPackArchive } from "./packArchive.ts";
import { exportPortableSprites } from "./spritePortable.ts";
import { SPRITE_REGISTRY } from "./spriteAssets.ts";
import { saveTransaction } from "./projectTransaction.ts";
import { exportPortableAssets } from "./assetPortable.ts";
import { ASSET_REGISTRY, jsonFile, readAssetRegistry } from "./assetRegistry.ts";

export class PackStore {
  private readonly installed = new Map<string, InstalledPack>();
  private busy = false;
  constructor(private readonly root: string) {}
  list() { return this.exclusive(() => this.loadRegistry()); }
  open(location: string) { return this.exclusive(() => this.openArchive(location)); }
  remove(id: string) { return this.exclusive(() => this.removeCached(id)); }
  export(project: ProjectStore, revision: string, levels: PackLevelInput[], destination: string, includeEditableProject = true, includeAuthoringSources = false, blenderExecutable?: string) {
    return this.exclusive(() => this.exportArchive(project, revision, levels, destination, includeEditableProject, includeAuthoringSources, blenderExecutable));
  }
  play(id: string, levelId: string, games: GameStore) { return this.exclusive(() => this.playLevel(id, levelId, games)); }
  importProject(id: string, destination: string, project: ProjectStore) {
    return this.exclusive(() => this.importEditable(id, destination, project));
  }

  private async exclusive<T>(operation: () => Promise<Result<T, HostError>>): Promise<Result<T, HostError>> {
    if (this.busy) return err(failure("Wait for the current pack operation to finish", "busy"));
    this.busy = true;
    const result = await operation();
    this.busy = false;
    return result;
  }

  private async loadRegistry(): Promise<Result<InstalledPack[], HostError>> {
    const location = path.join(this.root, "installed-packs.json");
    const info = await statOrMissing(location);
    if (info.isErr()) return err(info.error);
    if (!info.value) { this.installed.clear(); return ok([]); }
    if (info.value.size > 64 * 1024 * 1024) return err(failure("Pack registry exceeds its metadata limit", "limit"));
    const text = await io(() => fs.readFile(location, "utf8"), "Cannot read cached packs");
    if (text.isErr()) return err(text.error);
    const json = parseJson(text.value);
    if (json.isErr()) return err(json.error);
    const parsed = z.array(installedPackSchema).max(32).safeParse(json.value);
    if (!parsed.success) return err(failure("Invalid pack registry", "invalid"));
    this.installed.clear();
    for (const pack of parsed.data) this.installed.set(pack.id, pack);
    return ok(parsed.data);
  }

  private saveRegistry() { return atomicWrite(path.join(this.root, "installed-packs.json"), new TextEncoder().encode(JSON.stringify([...this.installed.values()]))); }

  private async removeCached(id: string) {
    const loaded = await this.loadRegistry();
    if (loaded.isErr()) return err(loaded.error);
    const removed = await io(() => fs.rm(path.join(this.root, id), { recursive: true, force: true }), "Cannot remove cached pack");
    if (removed.isErr()) return err(removed.error);
    this.installed.delete(id);
    const saved = await this.saveRegistry();
    return saved.isErr() ? err(saved.error) : ok([...this.installed.values()]);
  }

  private async exportArchive(project: ProjectStore, revision: string, levels: PackLevelInput[], destination: string, includeEditableProject: boolean, includeAuthoringSources: boolean, blenderExecutable?: string) {
    if (project.busy()) return err(failure("Wait for the project save to finish", "busy"));
    const snapshot = await project.inspect(true);
    if (snapshot.isErr()) return err(snapshot.error);
    if (snapshot.value.revision !== revision) return err(failure("Project changed. Reload before exporting.", "conflict"));
    const parent = await io(() => fs.realpath(path.dirname(destination)), "Cannot inspect pack destination");
    if (parent.isErr()) return err(parent.error);
    const relative = path.relative(snapshot.value.folder, path.join(parent.value, path.basename(destination)));
    if (relative === "" || relative !== ".." && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative))
      return err(failure("Export the playable pack outside the project folder to keep generated archives out of project sources", "invalid"));
    const sources = await project.read(snapshot.value.files.map((file) => file.path));
    if (sources.isErr()) return err(sources.error);
    const previous = new Map(snapshot.value.files.map((file) => [file.path, file.hash]));
    if (sources.value.some((file) => hash(file.bytes) !== previous.get(file.path))) return err(failure("Project changed during export", "conflict"));
    let editable = sources.value;
    if (includeEditableProject) {
      const registry = await readAssetRegistry(snapshot.value.folder);
      if (registry.isErr()) return err(registry.error);
      const portable = await exportPortableAssets(snapshot.value.folder, registry.value.map((asset) => asset.id), includeAuthoringSources, blenderExecutable);
      if (portable.isErr()) return err(portable.error);
      const sprites = await project.sprites.list();
      if (sprites.isErr()) return err(sprites.error);
      const portableSprites = await exportPortableSprites(snapshot.value.folder, sprites.value, includeAuthoringSources);
      if (portableSprites.isErr()) return err(portableSprites.error);
      const files = new Map(editable.filter((file) => file.path !== ASSET_REGISTRY && file.path !== SPRITE_REGISTRY && !file.path.startsWith(".pangea/asset-history/")).map((file) => [file.path, file]));
      for (const file of portable.value.files) files.set(file.path, file);
      for (const file of portableSprites.value.files) files.set(file.path, file);
      files.set(ASSET_REGISTRY, jsonFile(ASSET_REGISTRY, portable.value.assets));
      files.set(SPRITE_REGISTRY, jsonFile(SPRITE_REGISTRY, portableSprites.value.assets));
      editable = [...files.values()];
    }
    const archive = buildPackArchive(snapshot.value, editable, levels, includeEditableProject);
    if (archive.isErr()) return err(archive.error);
    return atomicWrite(destination, archive.value);
  }

  private async openArchive(location: string): Promise<Result<InstalledPack, HostError>> {
    const loaded = await this.loadRegistry();
    if (loaded.isErr()) return err(loaded.error);
    const info = await io(() => fs.stat(location), "Cannot inspect playable pack");
    if (info.isErr()) return err(info.error);
    if (info.value.size > 512 * 1024 * 1024) return err(failure("Pack archive exceeds 512 MiB", "limit"));
    const bytes = await io(() => fs.readFile(location), "Cannot read playable pack");
    if (bytes.isErr()) return err(bytes.error);
    const parsed = readPackArchive(bytes.value);
    if (parsed.isErr()) return err(parsed.error);
    const id = hash(bytes.value);
    if (this.installed.size >= 32 && !this.installed.has(id)) return err(failure("Remove a cached pack before opening another (32-pack limit)", "limit"));
    const directory = path.join(this.root, id);
    const created = await io(() => fs.mkdir(directory, { recursive: true }), "Cannot prepare pack folder");
    if (created.isErr()) return err(created.error);
    for (const [relative, data] of Object.entries(parsed.value.entries)) {
      if (relative.endsWith("/")) continue;
      const target = await projectPath(directory, relative);
      if (target.isErr()) return err(target.error);
      const written = await atomicWrite(target.value, data);
      if (written.isErr()) return err(written.error);
    }
    const record: InstalledPack = { id, manifest: parsed.value.manifest };
    this.installed.set(id, record);
    const saved = await this.saveRegistry();
    if (saved.isErr()) { this.installed.delete(id); return err(saved.error); }
    return ok(record);
  }

  private async playLevel(id: string, levelId: string, games: GameStore) {
    const loaded = await this.loadRegistry();
    if (loaded.isErr()) return err(loaded.error);
    const pack = this.installed.get(id);
    const level = pack?.manifest.levels.find((level) => level.id === levelId);
    if (!pack || !level) return err(failure("Open the pack and select a valid level first", "missing"));
    const selected = pack.manifest.files.filter((file) => file.path.startsWith(`${level.root}/Data/`));
    if (selected.length > 4096) return err(failure("Level exceeds the runtime file limit", "limit"));
    const files = await this.read(id, selected.map((file) => file.path));
    if (files.isErr()) return err(files.error);
    return games.launch(pack.manifest.game, files.value.map((file) => ({ ...file, path: file.path.slice(level.root.length + 1) })), level.args);
  }

  private async importEditable(id: string, destination: string, project: ProjectStore) {
    const loaded = await this.loadRegistry();
    if (loaded.isErr()) return err(loaded.error);
    const pack = this.installed.get(id);
    if (!pack) return err(failure("Open the pack first", "missing"));
    if (pack.manifest.editableProject === false) return err(failure("This pack contains runtime files only. Ask its author for an editable export.", "missing"));
    const existing = await io(() => fs.readdir(destination), "Cannot inspect import destination");
    if (existing.isErr()) return err(existing.error);
    if (existing.value.length) return err(failure("Choose an empty folder for the imported project", "exists"));
    const files = await this.read(id, pack.manifest.files.filter((file) => file.path.startsWith("Project/")).map((file) => file.path));
    if (files.isErr()) return err(files.error);
    const saved = await saveTransaction(destination, files.value.map((file) => ({ ...file, path: file.path.slice(8) })), []);
    return saved.isErr() ? err(saved.error) : project.open(destination);
  }

  private async read(id: string, paths: string[]): Promise<Result<ProjectFile[], HostError>> {
    const record = this.installed.get(id);
    if (!record) return err(failure("Open the pack first", "missing"));
    const files: ProjectFile[] = [];
    for (const relative of paths) {
      const metadata = record.manifest.files.find((file) => file.path === relative);
      const target = await projectPath(path.join(this.root, id), relative);
      if (target.isErr()) return err(target.error);
      const info = await io(() => fs.stat(target.value), "Cannot inspect pack file");
      if (info.isErr()) return err(info.error);
      if (!metadata || info.value.size !== metadata.size) return err(failure("Pack was modified after import", "checksum"));
      const bytes = await io(() => fs.readFile(target.value), "Cannot read pack file");
      if (bytes.isErr()) return err(bytes.error);
      if (hash(bytes.value) !== metadata.sha256) return err(failure("Pack was modified after import", "checksum"));
      files.push({ path: relative, bytes: Uint8Array.from(bytes.value) });
    }
    return ok(files);
  }
}
