import type { ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";
import { setScriptSourceExecutionScope } from "./scriptWorkspaceStateRuntime";
import type { UpdateScriptWorkspace } from "./useScriptWorkspace";
import { getScopedModulePaths } from "./scriptLevelRouting";

export function ScriptSourceScope({ workspace, path, update }: {
  workspace: ScriptWorkspaceState; path: string; update: UpdateScriptWorkspace;
}) {
  const file = workspace.sourceFiles[path];
  if (!file || file.readOnly) return null;
  const object = workspace.customObjects.some((definition) => definition.sourceFilePath === path);
  const levels = Object.values(workspace.levels).filter((level) => [
    ...level.globalHooks, ...level.terrainBindings, ...level.splineBindings, ...level.mapItemBindings,
  ].some((assignment) => assignment.sourceFilePath === path));
  if (object || levels.length) return <p className="workbench-muted text-xs">
    {object ? "Object behavior: runs for its assigned custom objects." : `Level script: assigned in ${levels.length} level(s). Manage callbacks in Level events.`}
  </p>;
  return <label className="flex flex-wrap items-center gap-3 text-sm">
    Execution scope
    <select className="rounded border border-gray-700 bg-gray-800 p-2" value={file.executionScope ?? (getScopedModulePaths(workspace).has(path) ? "helper" : "game")}
      onChange={(event) => update((state) => setScriptSourceExecutionScope(state, path, event.target.value === "game" ? "game" : "helper"))}>
      <option value="helper">Helper module</option>
      <option value="game">Game-wide callbacks</option>
    </select>
    <span className="workbench-muted text-xs">Helpers run when required. Game-wide callbacks run in every level. Assign level callbacks in Level events.</span>
  </label>;
}
