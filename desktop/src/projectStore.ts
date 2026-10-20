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

export class ProjectStore {
  private root: string | null = null;
  private saving = false;
  constructor(private readonly recoveryRoot: string) {}

  public folder(): string | null { return this.root; }
  public busy(): boolean { return this.saving; }

  public async open(folder: string): Promise<Result<ProjectSnapshot, HostError>> {
    if (this.saving) return err(failure("Wait for the current save to finish", "busy"));
    const resolved = await io(() => fs.realpath(folder), "Cannot open project folder");
    if (resolved.isErr()) return err(resolved.error);
    const recovered = await recoverInterruptedSave(resolved.value);
    if (recovered.isErr()) return err(recovered.error);
    const previous = this.root;
    this.root = resolved.value;
    const snapshot = await this.inspect();
    if (snapshot.isErr()) this.root = previous;
    return snapshot;
  }

  public async create(folder: string, name: string, game: GameId): Promise<Result<ProjectSnapshot, HostError>> {
    const manifest: ProjectManifest = { kind: "pangea-editor-project", version: 1, name, game, levels: [] };
    const existing = await statOrMissing(path.join(folder, PROJECT_MANIFEST));
    if (existing.isErr()) return err(existing.error);
    if (existing.value) return err(failure("This folder already contains a project. Use Open Project.", "exists"));
    const written = await io(() => fs.writeFile(path.join(folder, PROJECT_MANIFEST), JSON.stringify(manifest, null, 2), { flag: "wx" }), "Cannot create project");
    if (written.isErr()) return err(written.error);
    return this.open(folder);
  }

  public async inspect(): Promise<Result<ProjectSnapshot, HostError>> {
    if (!this.root) return err(failure("Open a project first", "no-project"));
    const location = await projectPath(this.root, PROJECT_MANIFEST);
    if (location.isErr()) return err(location.error);
    const text = await io(() => fs.readFile(location.value, "utf8"), "Cannot read pangea.project.json");
    if (text.isErr()) return err(text.error);
    const json = parseJson(text.value);
    if (json.isErr()) return err(json.error);
    const manifest = projectManifestSchema.safeParse(json.value);
    if (!manifest.success) return err(failure("Invalid project manifest", "invalid"));
    const entries = await scanProject(this.root);
    if (entries.isErr()) return err(entries.error);
    const recovery = await statOrMissing(this.recoveryPath());
    return ok({ folder: this.root, manifest: manifest.data, files: entries.value,
      revision: revisionOf(entries.value), recoveryAvailable: recovery.isOk() && recovery.value !== null });
  }

  public async read(paths: string[]): Promise<Result<ProjectFile[], HostError>> {
    if (!this.root) return err(failure("Open a project first", "no-project"));
    const files: ProjectFile[] = [];
    let total = 0;
    for (const relative of paths) {
      const location = await projectPath(this.root, relative);
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
    return ok(files);
  }

  public async save(revision: string, manifest: ProjectManifest, files: ProjectFile[], removed: string[]) {
    if (!this.root) return err(failure("Open a project first", "no-project"));
    if (this.saving) return err(failure("A project save is already running", "busy"));
    this.saving = true;
    const result = await this.performSave(revision, manifest, files, removed);
    this.saving = false;
    return result;
  }

  private async performSave(revision: string, manifest: ProjectManifest, files: ProjectFile[], removed: string[]): Promise<Result<ProjectSnapshot, HostError>> {
    const snapshot = await this.inspect();
    if (snapshot.isErr()) return snapshot;
    if (snapshot.value.revision !== revision) return err(failure("Project files changed on disk. Review and reload before saving.", "conflict"));
    if (snapshot.value.manifest.game !== manifest.game) return err(failure("A project cannot change games", "invalid"));
    if (!this.root) return err(failure("Project was closed", "no-project"));
    const outputs = [...files.filter((file) => file.path !== PROJECT_MANIFEST), {
      path: PROJECT_MANIFEST, bytes: new TextEncoder().encode(`${JSON.stringify(manifest, null, 2)}\n`),
    }];
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
