import { err, ok, type Result } from "neverthrow";
import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";

export function definitionAssetPaths(definition: ScriptCustomObjectDefinition): readonly string[] {
  const visual = definition.visual;
  if (visual.kind === "customSkeleton") return [visual.modelPath, `${visual.skeletonPath}.rsrc`];
  return visual.kind === "customDisplayGroup" ? [visual.modelPath] : [];
}

export function collectDefinitionSources(state: ScriptWorkspaceState): Result<readonly string[], string> {
  return collectScriptSources(state, state.customObjects.map((definition) => definition.sourceFilePath));
}

export function collectScriptSources(state: ScriptWorkspaceState, roots: readonly string[]): Result<readonly string[], string> {
  const pending = [...roots];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const path = pending.pop();
    if (!path || visited.has(path)) continue;
    const source = state.sourceFiles[path];
    if (!source) return err(`Definition source is missing: ${path}`);
    visited.add(path);
    for (const match of source.content.matchAll(/\brequire\s*(?:\(\s*)?["']([^"']+)["']/g)) {
      const name = match[1];
      if (!name || name === "pangea") continue;
      const dependency = `Data/Scripts/src/${name.replaceAll(".", "/")}.lua`;
      if (!state.sourceFiles[dependency]) return err(`Missing helper '${name}' required by ${path}. Add it before exporting.`);
      pending.push(dependency);
    }
  }
  return ok([...visited].sort());
}

export function isDefinitionSourcePath(path: string): boolean {
  return /^Data\/Scripts\/src\/[a-zA-Z0-9_./-]+\.lua$/.test(path)
    && !path.includes("..") && !path.includes("//") && path !== "Data/Scripts/src/main.lua";
}

export function isDefinitionAssetPath(path: string): boolean {
  return /^Data\/Scripts\/assets\/[a-zA-Z0-9_./-]+$/.test(path)
    && !path.includes("..") && !path.includes("//");
}
