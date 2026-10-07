import { selectAtom } from "jotai/utils";
import { err, ok, type Result } from "neverthrow";
import type { ScriptWorkspaceState, ScriptLevelState } from "./scriptWorkspaceStateTypes";
import { scriptWorkspaceStoreAtom } from "./scriptWorkspaceState";
import { nativeBindingPredicate, retargetNativeBindingSource } from "./scriptNativeBindingGuard";

type WorkspaceStore = Readonly<Record<string, ScriptWorkspaceState>>;

function sameLevelItems(left: ScriptLevelState | undefined, right: ScriptLevelState | undefined): boolean {
  return left?.globalHooks === right?.globalHooks && left?.splineBindings === right?.splineBindings && left?.terrainBindings === right?.terrainBindings && left?.mapItemBindings === right?.mapItemBindings && left?.customPlacements === right?.customPlacements && left?.terrainReplacements === right?.terrainReplacements && left?.mapReplacements === right?.mapReplacements && left?.splineReplacements === right?.splineReplacements;
}

export function sameScriptEditorHistory(left: WorkspaceStore, right: WorkspaceStore): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    const a = left[key];
    const b = right[key];
    if (a?.customObjects !== b?.customObjects || a?.params !== b?.params || a?.assets !== b?.assets || a?.behaviorCatalog !== b?.behaviorCatalog) return false;
    const levels = new Set([...Object.keys(a?.levels ?? {}), ...Object.keys(b?.levels ?? {})]);
    for (const level of levels) if (!sameLevelItems(a?.levels[level], b?.levels[level])) return false;
  }
  return true;
}

export const scriptEditorHistoryStoreAtom = selectAtom(scriptWorkspaceStoreAtom, (store) => store, sameScriptEditorHistory);

export function restoreScriptEditorHistory(current: WorkspaceStore, snapshot: WorkspaceStore): Result<WorkspaceStore, string> {
  const restored: Record<string, ScriptWorkspaceState> = { ...current };
  for (const [key, previous] of Object.entries(snapshot)) {
    const active = current[key];
    if (!active) { restored[key] = previous; continue; }
    const levels: Record<string, ScriptLevelState> = { ...active.levels };
    const sourceFiles = { ...previous.sourceFiles, ...active.sourceFiles };
    for (const levelKey of new Set([...Object.keys(active.levels), ...Object.keys(previous.levels)])) {
      const now = active.levels[levelKey];
      const before = previous.levels[levelKey];
      if (!now) { if (before) levels[levelKey] = before; continue; }
      for (const binding of [...before?.terrainBindings ?? [], ...before?.mapItemBindings ?? []]) {
        const live = [...now.terrainBindings, ...now.mapItemBindings].find((entry) => entry.id === binding.id);
        const source = sourceFiles[binding.sourceFilePath];
        if (!source) { const old = previous.sourceFiles[binding.sourceFilePath]; if (old) sourceFiles[binding.sourceFilePath] = old; continue; }
        if (!live || live.kind !== binding.kind) continue;
        if (nativeBindingPredicate(live) === nativeBindingPredicate(binding)) continue;
        const content = retargetNativeBindingSource(source.content, live, binding);
        if (content.isErr()) return err(content.error);
        const saved = retargetNativeBindingSource(source.savedContent, live, binding);
        if (saved.isErr()) return err(saved.error);
        sourceFiles[binding.sourceFilePath] = { ...source, content: content.value, savedContent: saved.value };
      }
      levels[levelKey] = { ...now, globalHooks: before?.globalHooks ?? [], splineBindings: before?.splineBindings ?? [], terrainBindings: before?.terrainBindings ?? [], mapItemBindings: before?.mapItemBindings ?? [], customPlacements: before?.customPlacements ?? [], terrainReplacements: before?.terrainReplacements ?? [], mapReplacements: before?.mapReplacements ?? [], splineReplacements: before?.splineReplacements ?? [] };
    }
    restored[key] = { ...active, customObjects: previous.customObjects, params: previous.params, assets: previous.assets, behaviorCatalog: previous.behaviorCatalog, levels, sourceFiles, moduleOrder: [...new Set([...active.moduleOrder, ...previous.moduleOrder])], compiledFiles: {} };
  }
  return ok(restored);
}
