import { err, ok } from "neverthrow";
import { z } from "zod";
import { projectSnapshotSchema, type ProjectSnapshot } from "@pangea/desktop-contracts";
import { buildScriptPackageFilesAsync, type ScriptWorkspaceState } from "@/editor/subviews/scripts/scriptWorkspaceState";
import { desktopRequest } from "./client";

export async function saveProjectScripts(project: ProjectSnapshot, workspace: ScriptWorkspaceState, recovery: boolean) {
  const prepared = await buildScriptPackageFilesAsync(workspace);
  if (prepared.isErr()) return err(prepared.error);
  const files = prepared.value.map((file) => ({ path: file.path, bytes: Uint8Array.from(file.bytes) }));
  if (recovery) {
    const result = await desktopRequest({ operation: "project.backup", manifest: project.manifest, files }, z.void());
    return result.isErr() ? err(result.error.message) : ok(null);
  }
  const removed = project.files.filter((file) => file.path.startsWith("Data/Scripts/") && !files.some((output) => output.path === file.path)).map((file) => file.path);
  const result = await desktopRequest({ operation: "project.save", revision: project.revision, manifest: project.manifest, files, removed }, projectSnapshotSchema);
  return result.isErr() ? err(result.error.message) : ok(result.value);
}
