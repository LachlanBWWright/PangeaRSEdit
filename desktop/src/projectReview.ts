import { randomUUID } from "node:crypto";
import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import { PROJECT_MANIFEST, conflictChoiceSchema, mergeText, projectManifestSchema, type ConflictFile, type ConflictReview, type HostError, type PreparedEdits, type ProjectFile, type ProjectSnapshot } from "@pangea/desktop-contracts";
import type { ProjectStore } from "./projectStore.ts";
import { failure, hash, parseJson } from "./files.ts";
import { isTextPath, textBytes } from "./projectVersions.ts";

interface ReviewState { id: string; folder: string; revision: string; rows: ConflictFile[]; editor: Map<string, ProjectFile>; disk: Map<string, ProjectFile> }
type Choice = z.infer<typeof conflictChoiceSchema>;

export class ProjectReviews {
  private current: ReviewState | null = null;
  constructor(private readonly project: ProjectStore) {}
  clear() { this.current = null; }

  async review(base: ProjectSnapshot, edits: PreparedEdits): Promise<Result<ConflictReview, HostError>> {
    if (base.folder !== this.project.folder()) return err(failure("Project changed. Build the review again.", "conflict"));
    if (new Set(edits.files.map((file) => file.path)).size !== edits.files.length || edits.removed.includes(PROJECT_MANIFEST)
      || edits.removed.some((path) => edits.files.some((file) => file.path === path))) return err(failure("Invalid editor file set", "invalid"));
    const disk = await this.project.inspect(true);
    if (disk.isErr()) return err(disk.error);
    const editor = new Map(edits.files.filter((file) => file.path !== PROJECT_MANIFEST).map((file) => [file.path, file]));
    editor.set(PROJECT_MANIFEST, { path: PROJECT_MANIFEST, bytes: new TextEncoder().encode(`${JSON.stringify(edits.manifest, null, 2)}\n`) });
    const removed = new Set(edits.removed);
    const before = new Map(base.files.map((file) => [file.path, file]));
    const incoming = new Map(disk.value.files.map((file) => [file.path, file]));
    const paths = new Set([...before.keys(), ...incoming.keys(), ...editor.keys(), ...removed]);
    const changed = [...paths].filter((path) => {
      const initial = before.get(path)?.hash ?? null;
      const local = removed.has(path) ? null : editor.has(path) ? hash(editor.get(path)?.bytes ?? new Uint8Array()) : initial;
      return initial !== local || initial !== (incoming.get(path)?.hash ?? null);
    });
    const read = await this.project.read(changed.filter((path) => incoming.has(path)));
    if (read.isErr()) return err(read.error);
    const diskFiles = new Map(read.value.map((file) => [file.path, file]));
    if (read.value.some((file) => hash(file.bytes) !== incoming.get(file.path)?.hash)) return err(failure("Files changed while building the review. Try again.", "conflict"));
    const rows: ConflictFile[] = [];
    let textBudget = 16 * 1024 * 1024;
    for (const path of changed) {
      const initial = before.get(path)?.hash ?? null;
      const localFile = editor.get(path);
      const localHash = removed.has(path) ? null : localFile ? hash(localFile.bytes) : initial;
      const diskFile = diskFiles.get(path);
      const diskHash = incoming.get(path)?.hash ?? null;
      const oldText = initial ? this.project.versions.get(initial) : undefined;
      if (!localFile && oldText !== undefined && !removed.has(path)) editor.set(path, { path, bytes: new TextEncoder().encode(oldText) });
      const localText = removed.has(path) ? null : localFile ? textBytes(localFile.bytes) : oldText ?? null;
      const diskText = textBytes(diskFile?.bytes);
      const binary = !isTextPath(path) || (localHash !== null && localText === null) || (diskHash !== null && diskText === null);
      let decision: ConflictFile["decision"] = localHash === initial ? "disk" : diskHash === initial || localHash === diskHash ? "editor" : "unresolved";
      let merged: string | null = null, reason = "";
      if (decision === "unresolved" && !binary && oldText !== undefined && localText !== null && diskText !== null) {
        const combined = mergeText(oldText, localText, diskText);
        if (combined.kind === "merged") { decision = "merged"; merged = combined.text; reason = "Independent line changes merged automatically."; }
        else reason = combined.reason;
      } else if (decision === "unresolved") reason = binary ? "Choose which binary version to keep." : "Choose a version; the baseline is unavailable or a file was deleted.";
      const available = textBudget > 0;
      textBudget -= (oldText?.length ?? 0) + (localText?.length ?? 0) + (diskText?.length ?? 0) + (merged?.length ?? 0);
      rows.push({ path, binary: binary || !available, base: available ? oldText ?? null : null, editor: available ? localText : null,
        disk: available ? diskText : null, merged: available ? merged : null, decision: !available && decision === "merged" ? "unresolved" : decision,
        reason, baseAvailable: initial === null || oldText !== undefined, editorSize: localHash === null ? null : localFile?.bytes.length ?? before.get(path)?.size ?? null,
        diskSize: diskFile?.bytes.length ?? null, editorAvailable: localHash === null || localFile !== undefined || oldText !== undefined });
    }
    const id = randomUUID();
    this.current = { id, folder: disk.value.folder, revision: disk.value.revision, rows, editor, disk: diskFiles };
    return ok({ id, revision: disk.value.revision, files: rows });
  }

  async apply(id: string, choices: Choice[]): Promise<Result<ProjectSnapshot, HostError>> {
    const review = this.current;
    if (!review || review.id !== id || review.folder !== this.project.folder()) return err(failure("Build a fresh conflict review", "conflict"));
    if (new Set(choices.map((choice) => choice.path)).size !== choices.length || choices.some((choice) => !review.rows.some((row) => row.path === choice.path)))
      return err(failure("Invalid conflict choices", "invalid"));
    const files: ProjectFile[] = [], removed: string[] = [];
    for (const row of review.rows) {
      const override = choices.find((choice) => choice.path === row.path);
      const decision = override?.choice ?? row.decision;
      if (decision === "unresolved") return err(failure(`Resolve ${row.path} before applying`, "conflict"));
      if (decision === "disk") continue;
      if (decision === "merged") {
        const text = override?.text ?? row.merged;
        if (row.binary || text === null || text === undefined) return err(failure("A merged text version is required", "invalid"));
        files.push({ path: row.path, bytes: new TextEncoder().encode(text) });
      } else {
        const file = review.editor.get(row.path);
        if (file) files.push(file);
        else if (row.editorSize === null) removed.push(row.path);
        else return err(failure("The editor version is unchanged; choose disk for this file", "invalid"));
      }
    }
    const manifestFile = files.find((file) => file.path === PROJECT_MANIFEST) ?? review.disk.get(PROJECT_MANIFEST);
    const current = await this.project.inspect(true);
    if (current.isErr()) return err(current.error);
    if (current.value.revision !== review.revision) return err(failure("Files changed again. Rebuild the conflict review.", "conflict"));
    let manifest = current.value.manifest;
    if (manifestFile) {
      const json = parseJson(new TextDecoder().decode(manifestFile.bytes));
      if (json.isErr()) return err(json.error);
      const parsed = projectManifestSchema.safeParse(json.value);
      if (!parsed.success) return err(failure("The merged project manifest is invalid", "invalid"));
      manifest = parsed.data;
    }
    if (removed.includes(PROJECT_MANIFEST)) return err(failure("The project manifest cannot be deleted", "invalid"));
    const result = await this.project.save(review.revision, manifest, files.filter((file) => file.path !== PROJECT_MANIFEST), removed);
    if (result.isOk()) this.current = null;
    return result;
  }
}
