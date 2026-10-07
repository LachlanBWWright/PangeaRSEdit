import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import type { TerrainItem } from "@/python/structSpecs/LevelTypes";
import { nativeBindingPredicate, retargetNativeBindingSource } from "./scriptNativeBindingGuard";
import type { ScriptMapItemBinding, ScriptSourceFile, ScriptTerrainBinding, ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";

export interface NativeBindingClipboardCopy {
  readonly sourceIndex: number;
  readonly sourceItem: TerrainItem;
  readonly targetIndex: number;
  readonly targetItem: TerrainItem;
}
type Binding = ScriptTerrainBinding | ScriptMapItemBinding;
const itemSchema = z.object({ x: z.number().finite(), z: z.number().finite(), type: z.number().int(), flags: z.number().int(), p0: z.number().int(), p1: z.number().int(), p2: z.number().int(), p3: z.number().int() });
const copiesSchema = z.array(z.object({ sourceIndex: z.number().int().nonnegative(), targetIndex: z.number().int().nonnegative(), sourceItem: itemSchema, targetItem: itemSchema }));

function matchesItem(binding: Binding, item: TerrainItem): boolean {
  const position = binding.signature.position;
  const z = binding.kind === "terrainItem" ? binding.signature.position.z : binding.signature.position.y;
  const params = [item.p0, item.p1, item.p2, item.p3];
  return binding.signature.itemType === item.type && position.x === item.x && z === item.z && binding.signature.params.length === params.length
    && binding.signature.params.every((value, index) => value === params[index]) && (binding.kind !== "terrainItem" || binding.signature.flags === item.flags);
}

function copyBinding(binding: Binding, item: TerrainItem, id: string, path: string): Binding {
  const params = [item.p0, item.p1, item.p2, item.p3];
  return binding.kind === "terrainItem"
    ? { ...binding, id, sourceFilePath: path, signature: { itemType: item.type, position: { x: item.x, y: binding.signature.position.y, z: item.z }, flags: item.flags, params } }
    : { ...binding, id, sourceFilePath: path, signature: { ...binding.signature, itemType: item.type, position: { x: item.x, y: item.z }, params } };
}

export function cloneNativeItemBindingsForPaste(source: ScriptWorkspaceState, destination: ScriptWorkspaceState, copies: readonly NativeBindingClipboardCopy[]): Result<ScriptWorkspaceState, string> {
  if (source.context.gameId !== destination.context.gameId) return err("Native Lua bindings can only be pasted into the same game.");
  if (!copiesSchema.safeParse(copies).success) return err("The copied native items contain invalid indices or values.");
  if (new Set(copies.map((copy) => copy.targetIndex)).size !== copies.length) return err("A native paste targets the same item index more than once.");
  const fromLevel = source.levels[source.context.levelKey];
  if (!fromLevel || copies.length === 0) return ok(destination);
  const toLevel = destination.levels[destination.context.levelKey] ?? { globalHooks: [], terrainBindings: [], mapItemBindings: [], splineBindings: [], customPlacements: [], terrainReplacements: [], mapReplacements: [], splineReplacements: [] };
  const terrainBindings: ScriptTerrainBinding[] = [...toLevel.terrainBindings];
  const mapItemBindings: ScriptMapItemBinding[] = [...toLevel.mapItemBindings];
  const sources: Record<string, ScriptSourceFile> = { ...destination.sourceFiles };
  const terrainReplacements = [...toLevel.terrainReplacements];
  const mapReplacements = [...toLevel.mapReplacements];
  const params = [...destination.params];
  const behaviors = [...destination.behaviorCatalog];
  const usedIds = new Set(Object.values(destination.levels).flatMap((level) => [...level.terrainBindings, ...level.mapItemBindings].map((binding) => binding.id)));
  const sourceBindings: readonly Binding[] = [...fromLevel.terrainBindings, ...fromLevel.mapItemBindings];
  for (const copy of copies) {
    const bindings = sourceBindings.filter((binding) => matchesItem(binding, copy.sourceItem));
    for (const binding of bindings) {
      const original = source.sourceFiles[binding.sourceFilePath];
      if (!original) return err(`The copied binding’s source is missing: ${binding.sourceFilePath}`);
      let suffix = 1;
      const stem = binding.id.replace(/[^a-zA-Z0-9_-]/g, "-");
      let id = `${stem}-paste-${copy.targetIndex}`;
      let path = `Data/Scripts/src/bindings/${id}.lua`;
      while (usedIds.has(id) || sources[path]) { id = `${stem}-paste-${copy.targetIndex}-${suffix++}`; path = `Data/Scripts/src/bindings/${id}.lua`; }
      const updated = copyBinding(binding, copy.targetItem, id, path);
      const content = retargetNativeBindingSource(original.content, binding, updated);
      if (content.isErr()) return err(content.error);
      const saved = retargetNativeBindingSource(original.savedContent, binding, updated);
      if (saved.isErr()) return err(saved.error);
      const existing = [...terrainBindings, ...mapItemBindings].find((candidate) => candidate.kind === updated.kind && nativeBindingPredicate(candidate) === nativeBindingPredicate(updated));
      if (existing) {
        if (existing.behaviorId === updated.behaviorId && sources[existing.sourceFilePath]?.content === content.value) continue;
        return err("The pasted item overlaps a different Lua binding. Choose another paste position before copying its behavior.");
      }
      usedIds.add(id);
      sources[path] = { ...original, path, ownerId: id, readOnly: false, content: content.value, savedContent: saved.value };
      for (const ref of binding.paramRefs) {
        if (params.some((parameter) => parameter.id === ref)) continue;
        const parameter = source.params.find((candidate) => candidate.id === ref);
        if (!parameter) return err(`The copied binding’s parameter is missing: ${ref}`);
        params.push(parameter);
      }
      const behavior = source.behaviorCatalog.find((candidate) => candidate.id === binding.behaviorId);
      if (behavior && !behaviors.some((candidate) => candidate.id === behavior.id)) behaviors.push(behavior);
      if (updated.kind === "terrainItem") terrainBindings.push(updated);
      else mapItemBindings.push(updated);
    }
    for (const replacement of fromLevel.terrainReplacements.filter((entry) => entry.itemIndex === copy.sourceIndex)) {
      if (!destination.customObjects.some((definition) => definition.id === replacement.customObjectId)) return err("The pasted native replacement requires a custom definition that is missing from this game.");
      if (!terrainReplacements.some((entry) => entry.itemIndex === copy.targetIndex)) terrainReplacements.push({ ...replacement, id: `terrain-${copy.targetIndex}`, itemIndex: copy.targetIndex, nativeType: copy.targetItem.type, x: copy.targetItem.x, z: copy.targetItem.z });
    }
    for (const replacement of fromLevel.mapReplacements.filter((entry) => entry.itemIndex === copy.sourceIndex)) {
      if (!destination.customObjects.some((definition) => definition.id === replacement.customObjectId)) return err("The pasted native replacement requires a custom definition that is missing from this game.");
      if (!mapReplacements.some((entry) => entry.itemIndex === copy.targetIndex)) mapReplacements.push({ ...replacement, id: `map-${copy.targetIndex}`, itemIndex: copy.targetIndex, nativeType: copy.targetItem.type, x: copy.targetItem.x, y: copy.targetItem.z });
    }
  }
  return ok({ ...destination, sourceFiles: sources, params, behaviorCatalog: behaviors, compiledFiles: {}, moduleOrder: [...new Set([...destination.moduleOrder, ...Object.keys(sources)])], levels: { ...destination.levels, [destination.context.levelKey]: { ...toLevel, terrainBindings, mapItemBindings, terrainReplacements, mapReplacements } } });
}
