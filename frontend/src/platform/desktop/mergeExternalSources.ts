import { err } from "neverthrow";
import { projectSnapshotSchema, type ProjectSnapshot } from "@pangea/desktop-contracts";
import { compileScriptWorkspace, removeScriptSourceFile, saveScriptSourceFile, upsertScriptSourceFile, type ScriptWorkspaceState } from "@/editor/subviews/scripts/scriptWorkspaceState";
import { readProjectFiles } from "./projectLoad";
import { desktopRequest } from "./client";

export async function mergeExternalSources(workspace: ScriptWorkspaceState, project: ProjectSnapshot, paths: string[]) {
  if (paths.some((path) => !/^Data\/Scripts\/src\/.+\.lua$/.test(path))) return err("Only Lua source files can be merged individually");
  const existing = paths.filter((path) => project.files.some((file) => file.path === path));
  const files = await readProjectFiles(project, existing);
  if (files.isErr()) return err(files.error.message);
  const inspected = await desktopRequest({ operation: "project.inspect" }, projectSnapshotSchema);
  if (inspected.isErr()) return err(inspected.error.message);
  if (inspected.value.revision !== project.revision) return err("Files changed again on disk. Review the latest changes before merging.");
  let next = workspace;
  for (const path of paths) {
    const file = files.value.find((entry) => entry.path === path);
    if (file) next = saveScriptSourceFile(upsertScriptSourceFile(next, path, new TextDecoder().decode(file.bytes)), path);
    else {
      next = removeScriptSourceFile(next, path);
      if (next.sourceFiles[path]) return err(`The required source ${path} cannot be deleted`);
      if (next.customObjects.some((object) => object.sourceFilePath === path) || next.behaviorCatalog.some((behavior) => behavior.sourceFilePath === path))
        return err(`The deleted source ${path} is still used by an object or behavior`);
    }
  }
  return compileScriptWorkspace(next);
}
