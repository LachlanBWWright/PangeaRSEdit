import { describe, expect, it } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { applyGlobalBehavior, applyTerrainBehavior, compileScriptWorkspace, createScriptWorkspaceContext, loadScriptSample, retargetScriptWorkspace, type ScriptWorkspaceState } from "@/editor/subviews/scripts/scriptWorkspaceState";
import { getLevelState } from "@/editor/subviews/scripts/scriptWorkspaceHelpers";
import { updateNativeItemBindingsAfterEdit } from "@/editor/subviews/scripts/scriptNativeItemEdits";
import { BUNDLED_RUNTIME_PATH } from "@/editor/subviews/scripts/scriptWorkspaceStateTypes";

describe("script level isolation", () => {
  it("compiles only current-level assignments while retaining shared custom definitions", () => {
    const first = createScriptWorkspaceContext(OttoGlobals, 1);
    const second = createScriptWorkspaceContext(OttoGlobals, 2);
    const source = applyTerrainBehavior(loadScriptSample(first, "hover-beacon"), "sample.item-trigger-logger", "First level", {itemType: 12, position: {x: 10, y: 0, z: 20}, flags: 0, params: [0, 0, 0, 0]});
    const binding = getLevelState(source).terrainBindings[0];
    const definition = source.customObjects[0];
    expect(binding).toBeDefined();
    expect(definition).toBeDefined();
    if (!binding || !definition) return;
    const compiled = compileScriptWorkspace(retargetScriptWorkspace(source, second));
    expect(compiled.isOk()).toBe(true);
    if (compiled.isErr()) return;
    const entry = compiled.value.compiledFiles[BUNDLED_RUNTIME_PATH]?.content;
    expect(entry).not.toContain(`bindings.${binding.id}`);
    expect(entry).toContain(definition.id);
    expect(source.sourceFiles[binding.sourceFilePath]).toBeDefined();
  });
  it("does not execute orphaned assignments retained after deleting native items", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 1);
    const source = applyTerrainBehavior(loadScriptSample(context, "hover-beacon"), "sample.item-trigger-logger", "Removed item", {itemType: 12, position: {x: 10, y: 0, z: 20}, flags: 0, params: [0, 0, 0, 0]});
    const binding = getLevelState(source).terrainBindings[0];
    expect(binding).toBeDefined();
    if (!binding) return;
    const removed = updateNativeItemBindingsAfterEdit(source, [{type: 12, x: 10, z: 20, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0}], [], []);
    expect(removed.isOk()).toBe(true);
    if (removed.isErr()) return;
    expect(removed.value.sourceFiles[binding.sourceFilePath]).toBeDefined();
    const compiled = compileScriptWorkspace(removed.value);
    expect(compiled.isOk()).toBe(true);
    if (compiled.isErr()) return;
    expect(compiled.value.compiledFiles[BUNDLED_RUNTIME_PATH]?.content).not.toContain(`bindings.${binding.id}`);
  });
  it("retains the shared library but starts new levels with no hooks, bindings, placements or replacements", () => {
    const first = createScriptWorkspaceContext(OttoGlobals, 1);
    const second = createScriptWorkspaceContext(OttoGlobals, 2);
    const sample = applyGlobalBehavior(applyTerrainBehavior(loadScriptSample(first, "hover-beacon"), "sample.item-trigger-logger", "First level", {itemType: 12, position: {x: 10, y: 0, z: 20}, flags: 0, params: [0, 0, 0, 0]}), "onLevelStart", "sample.log-level-start");
    const sourceLevel = getLevelState(sample);
    expect(sourceLevel.globalHooks).toHaveLength(1);
    expect(sourceLevel.terrainBindings).toHaveLength(1);
    expect(sourceLevel.customPlacements).toHaveLength(1);
    const definition = sample.customObjects[0];
    expect(definition).toBeDefined();
    if (!definition) return;
    const state: ScriptWorkspaceState = {...sample, levels: {...sample.levels, [first.levelKey]: {...sourceLevel,
      terrainReplacements: [{id: "terrain-0", itemIndex: 0, nativeType: 12, x: 10, z: 20, customObjectId: definition.id, strict: false}],
      mapReplacements: [{id: "map-0", itemIndex: 0, nativeType: 12, x: 10, y: 20, customObjectId: definition.id, strict: false}],
      splineReplacements: [{id: "spline-0", splineNum: 0, itemIndex: 0, nativeType: 12, placement: 0.5, customObjectId: definition.id, strict: false}],
    }}};
    const next = retargetScriptWorkspace(state, second);
    expect(getLevelState(next)).toEqual({globalHooks: [], terrainBindings: [], mapItemBindings: [], splineBindings: [], customPlacements: [], terrainReplacements: [], mapReplacements: [], splineReplacements: []});
    expect(next.customObjects).toBe(state.customObjects);
    expect(next.sourceFiles).toBe(state.sourceFiles);
    expect(next.params).toBe(state.params);
    expect(next.levels[first.levelKey]).toBe(state.levels[first.levelKey]);
    expect(getLevelState(retargetScriptWorkspace(next, first))).toBe(state.levels[first.levelKey]);
  });
});
