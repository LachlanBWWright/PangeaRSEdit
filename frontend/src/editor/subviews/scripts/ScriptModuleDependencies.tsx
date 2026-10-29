import { Button } from "@/components/ui/button";
import { collectDeclaredLuaDependencies, moduleNameForSourcePath, setDeclaredLuaDependencies } from "./scriptDeclaredDependencies";
import { updateScriptSourceContent, type ScriptWorkspaceState } from "./scriptWorkspaceState";
import type { UpdateScriptWorkspace } from "./useScriptWorkspace";

function changeDependency(state: ScriptWorkspaceState, path: string, name: string, checked: boolean): ScriptWorkspaceState {
  const source = state.sourceFiles[path];
  if (!source || source.readOnly) return state;
  const current = collectDeclaredLuaDependencies(source.content);
  if (current.isErr()) return state;
  const names = checked ? [...current.value, name] : current.value.filter((entry) => entry !== name);
  const content = setDeclaredLuaDependencies(source.content, names);
  return content.isOk() ? updateScriptSourceContent(state, path, content.value) : state;
}

export function ScriptModuleDependencies({ workspace, path, update }: {
  workspace: ScriptWorkspaceState; path: string; update: UpdateScriptWorkspace;
}) {
  const source = workspace.sourceFiles[path];
  if (!source || source.readOnly) return null;
  const declared = collectDeclaredLuaDependencies(source.content);
  if (declared.isErr()) return <p role="alert" className="workbench-notice">{declared.error} Correct the dependency annotation in the source.</p>;
  const modules = Object.keys(workspace.sourceFiles).filter((candidate) => candidate !== path && !workspace.sourceFiles[candidate]?.readOnly)
    .flatMap((candidate) => { const name = moduleNameForSourcePath(candidate); return name ? [name] : []; });
  const names = [...new Set([...modules, ...declared.value])].sort();
  return <details className="rounded-lg border border-slate-700 p-4">
    <summary className="cursor-pointer font-medium">Dynamic module dependencies ({declared.value.length})</summary>
    <p className="workbench-muted my-3">Select every module this file may load through a computed require name. Literal requires are collected automatically. Declarations stay in the Lua source when exporting or editing in an IDE.</p>
    {names.length === 0 && <p className="workbench-muted">Add a helper module to declare a dependency.</p>}
    <div className="grid gap-2">{names.map((name) => <label key={name} className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={declared.value.includes(name)} onChange={(event) => update((state) => changeDependency(state, path, name, event.target.checked))} />
      {name}{!modules.includes(name) && <span className="text-amber-300">Missing module</span>}
    </label>)}</div>
    {declared.value.length > 0 && <Button className="mt-3" size="sm" variant="secondary" onClick={() => update((state) => {
      const file = state.sourceFiles[path];
      if (!file) return state;
      const content = setDeclaredLuaDependencies(file.content, []);
      return content.isOk() ? updateScriptSourceContent(state, path, content.value) : state;
    })}>Clear declared dependencies</Button>}
  </details>;
}
