import { err, ok, type Result } from "neverthrow";
import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";
import { collectLiteralLuaRequires } from "./scriptLuaRequires";
import { collectDeclaredLuaDependencies } from "./scriptDeclaredDependencies";

export function definitionAssetPaths(definition: ScriptCustomObjectDefinition): readonly string[] {
  const visual = definition.visual;
  if (visual.kind === "customSkeleton") return [visual.modelPath, `${visual.skeletonPath}.rsrc`];
  return visual.kind === "customDisplayGroup" ? [visual.modelPath] : [];
}

export function collectDefinitionSources(state: ScriptWorkspaceState): Result<readonly string[], string> {
  return collectScriptSources(state, state.customObjects.map((definition) => definition.sourceFilePath));
}

export function collectScriptSources(state: ScriptWorkspaceState, roots: readonly string[]): Result<readonly string[], string> {
  return collectSourceDependencies(Object.fromEntries(Object.entries(state.sourceFiles).map(([path, source]) => [path, source.content])), roots);
}

export function collectSourceDependencies(sources: Readonly<Record<string, string>>, roots: readonly string[]): Result<readonly string[], string> {
  const pending = [...roots];
  const visited = new Set<string>();
  while (pending.length > 0) {
    const path = pending.pop();
    if (!path || visited.has(path)) continue;
    const source = sources[path];
    if (source === undefined) return err(`Definition source is missing: ${path}`);
    visited.add(path);
    const dependencies = collectLiteralLuaRequires(source);
    if (dependencies.isErr()) return err(`${path}: ${dependencies.error}`);
    const declared = collectDeclaredLuaDependencies(source);
    if (declared.isErr()) return err(`${path}: ${declared.error}`);
    for (const name of [...dependencies.value, ...declared.value]) {
      if (!name || name === "pangea") continue;
      const dependency = `Data/Scripts/src/${name.replaceAll(".", "/")}.lua`;
      if (!isDefinitionSourcePath(dependency)) return err(`Invalid helper module '${name}' required by ${path}. Use a module name without path traversal.`);
      if (sources[dependency] === undefined) return err(`Missing helper '${name}' required by ${path}. Add it before exporting.`);
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
