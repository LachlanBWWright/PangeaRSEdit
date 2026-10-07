import { err, ok, type Result } from "neverthrow";
import type { ScriptLevelState, ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";

export interface ScriptImportConflict { readonly kind: string; readonly key: string; }
function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.byteLength === b.byteLength && a.every((byte, index) => byte === b[index]);
}
function mergeByKey<T>(current: readonly T[], incoming: readonly T[], key: (entry: T) => string, overwrite: boolean): readonly T[] {
  const merged = new Map(current.map((entry) => [key(entry), entry]));
  for (const entry of incoming) if (overwrite || !merged.has(key(entry))) merged.set(key(entry), entry);
  return [...merged.values()];
}
function mergeRecords<T>(current: Readonly<Record<string, T>>, incoming: Readonly<Record<string, T>>, overwrite: boolean): Readonly<Record<string, T>> {
  return overwrite ? { ...current, ...incoming } : { ...incoming, ...current };
}
function mergeLevel(current: ScriptLevelState, incoming: ScriptLevelState, overwrite: boolean): ScriptLevelState {
  return {
    globalHooks: mergeByKey(current.globalHooks, incoming.globalHooks, (entry) => entry.hookId, overwrite),
    terrainBindings: mergeByKey(current.terrainBindings, incoming.terrainBindings, (entry) => entry.id, overwrite),
    splineBindings: mergeByKey(current.splineBindings, incoming.splineBindings, (entry) => entry.id, overwrite),
    mapItemBindings: mergeByKey(current.mapItemBindings, incoming.mapItemBindings, (entry) => entry.id, overwrite),
    customPlacements: mergeByKey(current.customPlacements, incoming.customPlacements, (entry) => entry.id, overwrite),
    terrainReplacements: mergeByKey(current.terrainReplacements, incoming.terrainReplacements, (entry) => String(entry.itemIndex), overwrite),
    mapReplacements: mergeByKey(current.mapReplacements, incoming.mapReplacements, (entry) => String(entry.itemIndex), overwrite),
    splineReplacements: mergeByKey(current.splineReplacements, incoming.splineReplacements, (entry) => `${entry.splineNum}:${entry.itemIndex}`, overwrite),
  };
}
export function getScriptImportConflicts(current: ScriptWorkspaceState, incoming: ScriptWorkspaceState): readonly ScriptImportConflict[] {
  const conflicts: ScriptImportConflict[] = [];
  for (const behavior of incoming.behaviorCatalog) {
    const existing = current.behaviorCatalog.find((entry) => entry.id === behavior.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(behavior)) conflicts.push({ kind: "Behavior", key: behavior.id });
  }
  for (const [path, source] of Object.entries(incoming.sourceFiles)) {
    const existing = current.sourceFiles[path];
    if (!source.readOnly && existing && existing.content !== source.content) conflicts.push({ kind: "Source file", key: path });
  }
  for (const [path, asset] of Object.entries(incoming.assets)) {
    const existing = current.assets[path];
    if (existing && !sameBytes(existing.bytes, asset.bytes)) conflicts.push({ kind: "Asset", key: path });
  }
  for (const item of incoming.customObjects) {
    const existing = current.customObjects.find((entry) => entry.id === item.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(item)) conflicts.push({ kind: "Item definition", key: item.id });
  }
  for (const param of incoming.params) {
    const existing = current.params.find((entry) => entry.id === param.id);
    if (existing && JSON.stringify(existing) !== JSON.stringify(param)) conflicts.push({ kind: "Parameter", key: param.id });
  }
  for (const [key, level] of Object.entries(incoming.levels)) {
    const existing = current.levels[key];
    if (!existing) continue;
    const incomingGroups: readonly (readonly { readonly id: string }[])[] = [level.globalHooks, level.terrainBindings, level.splineBindings, level.mapItemBindings, level.customPlacements];
    const existingEntries = [...existing.globalHooks, ...existing.terrainBindings, ...existing.splineBindings, ...existing.mapItemBindings, ...existing.customPlacements];
    for (const entry of incomingGroups.flat()) {
      const old = existingEntries.find((candidate) => candidate.id === entry.id);
      if (old && JSON.stringify(old) !== JSON.stringify(entry)) conflicts.push({ kind: `Level ${key}`, key: entry.id });
    }
    for (const hook of level.globalHooks) {
      const old = existing.globalHooks.find((entry) => entry.hookId === hook.hookId);
      if (old && old.id !== hook.id) conflicts.push({ kind: `Level ${key} hook`, key: hook.hookId });
    }
    for (const [kind, before, after] of [
      ["Terrain replacements", existing.terrainReplacements, level.terrainReplacements],
      ["Map replacements", existing.mapReplacements, level.mapReplacements],
    ] satisfies readonly (readonly [string, readonly { itemIndex: number }[], readonly { itemIndex: number }[]])[]) {
      for (const entry of after) {
        const old = before.find((candidate) => candidate.itemIndex === entry.itemIndex);
        if (old && JSON.stringify(old) !== JSON.stringify(entry)) conflicts.push({ kind: `${kind} · level ${key}`, key: String(entry.itemIndex) });
      }
    }
    for (const entry of level.splineReplacements) {
      const old = existing.splineReplacements.find((candidate) => candidate.splineNum === entry.splineNum && candidate.itemIndex === entry.itemIndex);
      if (old && JSON.stringify(old) !== JSON.stringify(entry)) conflicts.push({ kind: `Spline replacements · level ${key}`, key: `${entry.splineNum}:${entry.itemIndex}` });
    }
  }
  return conflicts;
}
export function mergeScriptWorkspace(current: ScriptWorkspaceState, incoming: ScriptWorkspaceState, overwrite: boolean): Result<ScriptWorkspaceState, string> {
  if (current.context.gameId !== incoming.context.gameId) return err("This package targets a different game.");
  const levels: Record<string, ScriptLevelState> = { ...current.levels };
  for (const [key, level] of Object.entries(incoming.levels)) {
    const existing = levels[key];
    levels[key] = existing ? mergeLevel(existing, level, overwrite) : level;
  }
  return ok({
    ...current,
    behaviorCatalog: mergeByKey(current.behaviorCatalog, incoming.behaviorCatalog, (entry) => entry.id, overwrite),
    customObjects: mergeByKey(current.customObjects, incoming.customObjects, (entry) => entry.id, overwrite),
    params: mergeByKey(current.params, incoming.params, (entry) => entry.id, overwrite),
    moduleOrder: [...new Set([...current.moduleOrder, ...incoming.moduleOrder])],
    sourceFiles: mergeRecords(current.sourceFiles, incoming.sourceFiles, overwrite),
    assets: mergeRecords(current.assets, incoming.assets, overwrite), levels,
    compiledFiles: {}, diagnostics: [], statusLog: [...current.statusLog, "Imported project changes; validate before export."],
  });
}
