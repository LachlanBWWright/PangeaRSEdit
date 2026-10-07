import { err, ok, type Result } from "neverthrow";
import type { TerrainItem } from "@/python/structSpecs/LevelTypes";
import { nativeBindingPredicate, retargetNativeBindingSource } from "./scriptNativeBindingGuard";
import type { ScriptMapItemBinding, ScriptSourceFile, ScriptTerrainBinding, ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";

interface IndexMapping { readonly oldIndex: number; readonly newIndex: number; }
function matchesItem(binding: ScriptTerrainBinding | ScriptMapItemBinding, item: TerrainItem): boolean {
  const signature = binding.signature;
  const z = binding.kind === "terrainItem" ? binding.signature.position.z : binding.signature.position.y;
  return signature.itemType === item.type && signature.position.x === item.x && z === item.z && signature.params.length === 4 && signature.params.every((param, index) => param === [item.p0, item.p1, item.p2, item.p3][index]) && (binding.kind !== "terrainItem" || binding.signature.flags === item.flags);
}
function updatedBinding(binding: ScriptTerrainBinding | ScriptMapItemBinding, item: TerrainItem, id: string, path: string): ScriptTerrainBinding | ScriptMapItemBinding {
  const common = { ...binding, id, sourceFilePath: path };
  const params = [item.p0, item.p1, item.p2, item.p3];
  return binding.kind === "terrainItem" ? { ...common, kind: "terrainItem", signature: { itemType: item.type, position: { x: item.x, y: binding.signature.position.y, z: item.z }, flags: item.flags, params } }
    : { ...common, kind: "mapItem", signature: { ...binding.signature, itemType: item.type, position: { x: item.x, y: item.z }, params } };
}
function remapBindings(bindings: readonly (ScriptTerrainBinding | ScriptMapItemBinding)[], before: readonly TerrainItem[], after: readonly TerrainItem[], mapping: readonly IndexMapping[], sources: Record<string, ScriptSourceFile>): Result<readonly (ScriptTerrainBinding | ScriptMapItemBinding)[], string> {
  const output: (ScriptTerrainBinding | ScriptMapItemBinding)[] = [];
  for (const binding of bindings) {
    const oldIndex = before.findIndex((item) => matchesItem(binding, item));
    if (oldIndex < 0) { output.push(binding); continue; }
    const destinations = mapping.filter((entry) => entry.oldIndex === oldIndex);
    const source = sources[binding.sourceFilePath];
    if (!source && destinations.length > 0) return err(`The bound item's source is missing: ${binding.sourceFilePath}`);
    for (const [copy, destination] of destinations.entries()) {
      const item = after[destination.newIndex];
      if (!item) return err("An item edit contains an invalid destination index.");
      let id = binding.id;
      let path = binding.sourceFilePath;
      if (copy > 0) {
        let suffix = destination.newIndex;
        do { id = `${binding.id}-copy-${suffix++}`; path = `Data/Scripts/src/bindings/${id}.lua`; } while (sources[path]);
      }
      const updated = updatedBinding(binding, item, id, path);
      if (!source) return err(`The bound item's source is missing: ${binding.sourceFilePath}`);
      if (nativeBindingPredicate(binding) === nativeBindingPredicate(updated) && copy === 0) { output.push(updated); continue; }
      const content = retargetNativeBindingSource(source.content, binding, updated);
      if (content.isErr()) return err(content.error);
      const saved = retargetNativeBindingSource(source.savedContent, binding, updated);
      if (saved.isErr()) return err(saved.error);
      sources[path] = { ...source, path, ownerId: id, content: content.value, savedContent: saved.value };
      output.push(updated);
    }
  }
  return ok(output);
}

export function updateNativeItemBindingsAfterEdit(state: ScriptWorkspaceState, before: readonly TerrainItem[], after: readonly TerrainItem[], mapping: readonly IndexMapping[]): Result<ScriptWorkspaceState, string> {
  const level = state.levels[state.context.levelKey];
  if (!level) return ok(state);
  const sources: Record<string, ScriptSourceFile> = { ...state.sourceFiles };
  const result = remapBindings([...level.terrainBindings, ...level.mapItemBindings], before, after, mapping, sources);
  if (result.isErr()) return err(result.error);
  const terrainReplacements = level.terrainReplacements.flatMap((replacement) => mapping.filter((entry) => entry.oldIndex === replacement.itemIndex).flatMap((entry) => {
    const item = after[entry.newIndex];
    return item ? [{ ...replacement, id: `terrain-${entry.newIndex}`, itemIndex: entry.newIndex, nativeType: item.type, x: item.x, z: item.z }] : [];
  }));
  const mapReplacements = level.mapReplacements.flatMap((replacement) => mapping.filter((entry) => entry.oldIndex === replacement.itemIndex).flatMap((entry) => {
    const item = after[entry.newIndex];
    return item ? [{ ...replacement, id: `map-${entry.newIndex}`, itemIndex: entry.newIndex, nativeType: item.type, x: item.x, y: item.z }] : [];
  }));
  const terrainBindings: ScriptTerrainBinding[] = [];
  const mapItemBindings: ScriptMapItemBinding[] = [];
  for (const binding of result.value) {
    if (binding.kind === "terrainItem") terrainBindings.push(binding);
    else mapItemBindings.push(binding);
  }
  return ok({ ...state, sourceFiles: sources, compiledFiles: {}, moduleOrder: [...new Set([...state.moduleOrder, ...Object.keys(sources)])], levels: { ...state.levels, [state.context.levelKey]: { ...level,
    terrainBindings, mapItemBindings, terrainReplacements, mapReplacements,
  } } });
}
