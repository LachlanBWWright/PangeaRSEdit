import { describe, expect, it } from "vitest";
import { Bugdom2Globals, BugdomGlobals } from "@/data/globals/globals";
import type { TerrainItem } from "@/python/structSpecs/LevelTypes";
import { applyGlobalBehavior, applyMapItemBehavior, applySplineBehavior, applyTerrainBehavior, createScriptWorkspaceContext, ensureScriptWorkspace, replaceScriptWorkspace } from "./scriptWorkspaceState";
import { buildMapPredicate, buildTerrainPredicate } from "./scriptWorkspaceStateRuntime";
import type { ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";
import { cloneNativeItemBindingsForPaste } from "./scriptNativeBindingClipboard";
import { updateNativeItemBindingsAfterEdit } from "./scriptNativeItemEdits";
import { restoreScriptEditorHistory, sameScriptEditorHistory } from "./scriptEditorHistory";
import { createCustomObjectFromStarter } from "./scriptObjectStarters";

const sourceItem: TerrainItem = { x: 100, z: 200, type: 3, flags: 4, p0: 1, p1: 2, p2: 3, p3: 4 };
const targetItem: TerrainItem = { ...sourceItem, x: 300, z: 400 };
const copies = [{ sourceIndex: 7, sourceItem, targetIndex: 9, targetItem }];

function empty(level = 1): ScriptWorkspaceState {
  return ensureScriptWorkspace({}, createScriptWorkspaceContext(Bugdom2Globals, level));
}

function terrain(): ScriptWorkspaceState {
  return applyTerrainBehavior(empty(), "sample.item-trigger-logger", "My trigger", {
    itemType: sourceItem.type, position: { x: sourceItem.x, y: 0, z: sourceItem.z }, flags: sourceItem.flags, params: [1, 2, 3, 4],
  });
}

function editSource(state: ScriptWorkspaceState, update: (content: string) => string): ScriptWorkspaceState {
  const binding = state.levels[state.context.levelKey]?.terrainBindings[0];
  if (!binding) return state;
  const file = state.sourceFiles[binding.sourceFilePath];
  if (!file) return state;
  return { ...state, sourceFiles: { ...state.sourceFiles, [file.path]: { ...file, content: update(file.content) } } };
}

describe("native Lua binding clipboard", () => {
  it("copies across levels with independent source and preserved unsaved callback edits", () => {
    const source = editSource(terrain(), (content) => `${content}\n-- unsaved custom callback work`);
    const destination = empty(2);
    const result = cloneNativeItemBindingsForPaste(source, destination, copies);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    const original = source.levels[source.context.levelKey]?.terrainBindings[0];
    const cloned = result.value.levels[destination.context.levelKey]?.terrainBindings[0];
    expect(original).toBeDefined();
    expect(cloned).toBeDefined();
    if (!original || !cloned) return;
    expect(cloned.id).not.toBe(original.id);
    expect(cloned.sourceFilePath).not.toBe(original.sourceFilePath);
    expect(cloned.signature.position).toEqual({ x: 300, y: 0, z: 400 });
    const file = result.value.sourceFiles[cloned.sourceFilePath];
    expect(file?.content).toContain(buildTerrainPredicate(cloned.signature));
    expect(file?.content).toContain("-- unsaved custom callback work");
    expect(file?.savedContent).not.toContain("-- unsaved custom callback work");
    expect(file?.savedContent).toContain(buildTerrainPredicate(cloned.signature));
    expect(source.levels[source.context.levelKey]?.terrainBindings).toHaveLength(1);
    expect(destination.levels[destination.context.levelKey]?.terrainBindings ?? []).toHaveLength(0);
    expect(result.value.compiledFiles).toEqual({});
  });

  it("duplicates within a level once, and skips an already copied identical binding", () => {
    const source = terrain();
    const result = cloneNativeItemBindingsForPaste(source, source, copies);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.levels[source.context.levelKey]?.terrainBindings).toHaveLength(2);
    const again = cloneNativeItemBindingsForPaste(source, result.value, copies);
    expect(again.isOk()).toBe(true);
    if (again.isOk()) expect(again.value.levels[source.context.levelKey]?.terrainBindings).toHaveLength(2);
  });

  it("copies map bindings using translated x/z as map x/y", () => {
    const source = applyMapItemBehavior(empty(), "sample.item-trigger-logger", "Map trigger", {
      itemType: sourceItem.type, position: { x: sourceItem.x, y: sourceItem.z }, params: [1, 2, 3, 4],
    });
    const result = cloneNativeItemBindingsForPaste(source, empty(2), copies);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    const cloned = result.value.levels[result.value.context.levelKey]?.mapItemBindings[0];
    expect(cloned).toBeDefined();
    if (!cloned) return;
    expect(cloned.signature.position).toEqual({ x: 300, y: 400 });
    expect(result.value.sourceFiles[cloned.sourceFilePath]?.content).toContain(buildMapPredicate(cloned.signature));
  });

  it.each([
    ["changed predicate", (content: string) => content.replace("ctx.itemType == 3", "ctx.itemType == 99")],
    ["disabled guard", (content: string) => content.replace("if not matchesTarget(ctx) then", "if false then")],
    ["removed early return", (content: string) => content.replace("return { handled = false }", "pangea.log.info('ignored')")],
    ["reassigned matcher", (content: string) => `${content}\nmatchesTarget = function(ctx) return true end`],
    ["comment decoy", (content: string) => `--[=[${content}]=]\n${content.replace("ctx.itemType == 3", "ctx.itemType == 99")}`],
    ["string decoy", (content: string) => `local decoy = [=[${content}]=]\n${content.replace("ctx.itemType == 3", "ctx.itemType == 99")}`],
  ])("refuses %s instead of applying unsafe predicate substitutions", (_label, edit) => {
    const source = editSource(terrain(), edit);
    const destination = empty(2);
    const result = cloneNativeItemBindingsForPaste(source, destination, copies);
    expect(result.isErr()).toBe(true);
    expect(destination.levels[destination.context.levelKey]?.terrainBindings ?? []).toHaveLength(0);
  });

  it("does not mistake comments or strings for actual matcher definitions", () => {
    const source = editSource(terrain(), (content) => `-- local function matchesTarget(ctx) return false end\nlocal text = 'local function matchesTarget(ctx) return false end'\n${content}`);
    expect(cloneNativeItemBindingsForPaste(source, empty(2), copies).isOk()).toBe(true);
  });

  it("rejects conflicting destination behavior instead of silently dropping copied code", () => {
    const source = terrain();
    const initial = cloneNativeItemBindingsForPaste(source, empty(2), copies);
    if (initial.isErr()) return;
    const destination = editSource(initial.value, (content) => `${content}\n-- different custom behavior`);
    expect(cloneNativeItemBindingsForPaste(source, destination, copies).isErr()).toBe(true);
  });

  it("matches flags and all four parameters so a nearby unrelated assignment is not copied", () => {
    const mismatched = [{ ...copies[0], sourceIndex: 7, targetIndex: 9, targetItem, sourceItem: { ...sourceItem, flags: 0 } }];
    const result = cloneNativeItemBindingsForPaste(terrain(), empty(2), mismatched);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.levels[result.value.context.levelKey]?.terrainBindings).toHaveLength(0);
  });

  it("rejects missing sources, invalid indices, repeated targets and cross-game paste", () => {
    const source = terrain();
    expect(cloneNativeItemBindingsForPaste({ ...source, sourceFiles: {} }, empty(2), copies).isErr()).toBe(true);
    expect(cloneNativeItemBindingsForPaste(source, empty(2), [{ ...copies[0], sourceIndex: -1, targetIndex: 9, sourceItem, targetItem }]).isErr()).toBe(true);
    expect(cloneNativeItemBindingsForPaste(source, empty(2), [...copies, ...copies]).isErr()).toBe(true);
    const foreign = ensureScriptWorkspace({}, createScriptWorkspaceContext(BugdomGlobals, 1));
    expect(cloneNativeItemBindingsForPaste(source, foreign, copies).isErr()).toBe(true);
  });

  it("moves only the active predicate while retaining identical text in comments and dirty callback edits", () => {
    const source = editSource(terrain(), (content) => `-- original generated text:\n-- ${content.split("\n").find((line) => line.includes("ctx.itemType")) ?? ""}\n${content}\n-- unsaved callback work`);
    const result = updateNativeItemBindingsAfterEdit(source, [sourceItem], [targetItem], [{ oldIndex: 0, newIndex: 0 }]);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    const binding = result.value.levels[result.value.context.levelKey]?.terrainBindings[0];
    if (!binding) return;
    const file = result.value.sourceFiles[binding.sourceFilePath];
    expect(file?.content).toContain("--   return ctx.itemType == 3 and ctx.position.x == 100");
    expect(file?.content).toContain(buildTerrainPredicate(binding.signature));
    expect(file?.content).toContain("-- unsaved callback work");
    expect(file?.savedContent).toContain(buildTerrainPredicate(binding.signature));
    expect(file?.savedContent).not.toContain("-- unsaved callback work");
  });

  it("rejects native move when an unchanged predicate appears only in a comment decoy", () => {
    const source = editSource(terrain(), (content) => `--[=[${content}]=]\n${content.replace("ctx.itemType == 3", "ctx.itemType == 99")}`);
    expect(updateNativeItemBindingsAfterEdit(source, [sourceItem], [targetItem], [{ oldIndex: 0, newIndex: 0 }]).isErr()).toBe(true);
  });

  it("undo retargets active predicates without changing matching text in live draft comments", () => {
    const original = terrain();
    const moved = updateNativeItemBindingsAfterEdit(original, [sourceItem], [targetItem], [{ oldIndex: 0, newIndex: 0 }]);
    expect(moved.isOk()).toBe(true);
    if (moved.isErr()) return;
    const current = editSource(moved.value, (content) => `--[=[${content}]=]\n${content}\n-- keep callback draft`);
    const result = restoreScriptEditorHistory(replaceScriptWorkspace({}, current), replaceScriptWorkspace({}, original));
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    const restored = ensureScriptWorkspace(result.value, original.context);
    const binding = restored.levels[restored.context.levelKey]?.terrainBindings[0];
    if (!binding) return;
    const file = restored.sourceFiles[binding.sourceFilePath];
    expect(file?.content).toContain("ctx.position.x == 300");
    expect(file?.content).toContain(buildTerrainPredicate(binding.signature));
    expect(file?.savedContent).toContain(buildTerrainPredicate(binding.signature));
    expect(file?.content).toContain("-- keep callback draft");
  });

  it("refuses unsafe undo atomically and retains manually edited draft", () => {
    const original = terrain();
    const moved = updateNativeItemBindingsAfterEdit(original, [sourceItem], [targetItem], [{ oldIndex: 0, newIndex: 0 }]);
    if (moved.isErr()) return;
    const current = editSource(moved.value, (content) => `--[=[${content}]=]\n${content.replace("ctx.itemType == 3", "ctx.itemType == 99")}`);
    const store = replaceScriptWorkspace({}, current);
    expect(restoreScriptEditorHistory(store, replaceScriptWorkspace({}, original)).isErr()).toBe(true);
    expect(ensureScriptWorkspace(store, original.context)).toEqual(current);
  });

  it("copies native replacement metadata by item index while retaining the same custom definition", () => {
    const created = createCustomObjectFromStarter(terrain(), "trigger", "Replacement");
    expect(created.isOk()).toBe(true);
    if (created.isErr()) return;
    const state = created.value;
    const definition = state.customObjects[0];
    const level = state.levels[state.context.levelKey];
    if (!definition || !level) return;
    const source: ScriptWorkspaceState = { ...state, levels: { ...state.levels, [state.context.levelKey]: { ...level, terrainReplacements: [{ id: "terrain-7", itemIndex: 7, nativeType: 3, x: 100, z: 200, customObjectId: definition.id, strict: true }] } } };
    const destination = { ...empty(2), customObjects: source.customObjects, sourceFiles: source.sourceFiles };
    const result = cloneNativeItemBindingsForPaste(source, destination, copies);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect(result.value.levels[result.value.context.levelKey]?.terrainReplacements).toEqual([{ id: "terrain-9", itemIndex: 9, nativeType: 3, x: 300, z: 400, customObjectId: definition.id, strict: true }]);
    expect(cloneNativeItemBindingsForPaste(source, empty(2), copies).isErr()).toBe(true);
  });

  it("undo includes hook, spline, registry and same-path uploaded asset changes while retaining code drafts", () => {
    const original = { ...terrain(), assets: { "Data/model.bg3d": { path: "Data/model.bg3d", sourceName: "original.bg3d", bytes: new Uint8Array([1]) } } };
    const hooked = applyGlobalBehavior(original, "onLevelStart", "sample.log-level-start");
    const splined = applySplineBehavior(hooked, "sample.item-trigger-logger", "Spline", { itemType: 3, splineNum: 0, placement: 0.5, params: [1, 2, 3, 4] });
    const current: ScriptWorkspaceState = { ...editSource(splined, (content) => `${content}\n-- current draft`), assets: { "Data/model.bg3d": { path: "Data/model.bg3d", sourceName: "replacement.bg3d", bytes: new Uint8Array([2]) } }, behaviorCatalog: splined.behaviorCatalog.filter((behavior) => behavior.id !== "sample.hover-beacon") };
    const originalStore = replaceScriptWorkspace({}, original);
    expect(sameScriptEditorHistory(originalStore, replaceScriptWorkspace({}, hooked))).toBe(false);
    expect(sameScriptEditorHistory(replaceScriptWorkspace({}, hooked), replaceScriptWorkspace({}, splined))).toBe(false);
    expect(sameScriptEditorHistory(originalStore, replaceScriptWorkspace({}, { ...original, assets: current.assets }))).toBe(false);
    expect(sameScriptEditorHistory(originalStore, replaceScriptWorkspace({}, { ...original, behaviorCatalog: current.behaviorCatalog }))).toBe(false);
    const result = restoreScriptEditorHistory(replaceScriptWorkspace({}, current), originalStore);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    const restored = ensureScriptWorkspace(result.value, original.context);
    expect(restored.assets).toBe(original.assets);
    expect(restored.behaviorCatalog).toBe(original.behaviorCatalog);
    expect(restored.levels[restored.context.levelKey]?.globalHooks).toHaveLength(0);
    expect(restored.levels[restored.context.levelKey]?.splineBindings).toHaveLength(0);
    const binding = restored.levels[restored.context.levelKey]?.terrainBindings[0];
    if (binding) expect(restored.sourceFiles[binding.sourceFilePath]?.content).toContain("-- current draft");
  });
});
