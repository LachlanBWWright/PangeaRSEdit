import { describe, expect, it } from "vitest";
import { zipSync } from "fflate";
import { OttoGlobals } from "@/data/globals/globals";
import { applyTerrainBehavior, compileScriptWorkspace, createScriptWorkspaceContext, ensureScriptWorkspace, loadScriptSample, replaceScriptWorkspace, updateScriptSourceContent } from "./scriptWorkspaceState";
import { deleteCustomObjectDefinition, duplicateCustomObjectDefinition, getCustomObjectUsageCounts } from "./scriptObjectLifecycle";
import { getScriptImportConflicts, mergeScriptWorkspace } from "./scriptWorkspaceImport";
import { applyScriptWorkspaceFileEdits } from "./scriptWorkspaceFileActions";
import { restoreScriptEditorHistory, sameScriptEditorHistory } from "./scriptEditorHistory";
import { updateNativeItemBindingsAfterEdit } from "./scriptNativeItemEdits";
import { readBoundedScriptZip } from "./scriptZipImport";
import { scriptRecoverySnapshotSchema } from "./scriptWorkspaceRecovery";
import { getScriptBuildStatus } from "./scriptBuildStatus";
import { getScriptRuntimeDiagnosticLocation } from "./scriptRuntimeDiagnosticLocation";
import { parseScriptParameterValue, validateScriptParameter } from "./scriptParameters";
import type { ScriptParameterDefinition } from "./scriptWorkspaceStateTypes";

const context = createScriptWorkspaceContext(OttoGlobals, 0);
function empty() { return ensureScriptWorkspace({}, context); }

describe("safe item authoring", () => {
  it("duplicates an item with an independent behavior file and blocks deletion of used definitions", () => {
    const state = loadScriptSample(context, "hover-beacon");
    const original = state.customObjects[0];
    expect(original).toBeDefined(); if (!original) return;
    expect(getCustomObjectUsageCounts(state)[original.id]).toBe(1);
    expect(deleteCustomObjectDefinition(state, original.id).isErr()).toBe(true);
    const copy = duplicateCustomObjectDefinition(state, original.id);
    expect(copy.isOk()).toBe(true); if (copy.isErr()) return;
    const definition = copy.value.customObjects.at(-1);
    expect(definition?.sourceFilePath).not.toBe(original.sourceFilePath);
    if (!definition) return;
    const changed = updateScriptSourceContent(copy.value, definition.sourceFilePath, "-- independent");
    expect(changed.sourceFiles[original.sourceFilePath]?.content).toBe(state.sourceFiles[original.sourceFilePath]?.content);
    expect(deleteCustomObjectDefinition(changed, definition.id).isOk()).toBe(true);
  });

  it("reports import conflicts and makes keeping or replacing entries explicit", () => {
    const state = empty();
    const incoming = updateScriptSourceContent(state, "Data/Scripts/src/user.lua", "-- imported");
    expect(getScriptImportConflicts(state, incoming)).toContainEqual({ kind: "Source file", key: "Data/Scripts/src/user.lua" });
    const keep = mergeScriptWorkspace(state, incoming, false);
    const replace = mergeScriptWorkspace(state, incoming, true);
    expect(keep.isOk() && keep.value.sourceFiles["Data/Scripts/src/user.lua"]?.content).toBe(state.sourceFiles["Data/Scripts/src/user.lua"]?.content);
    expect(replace.isOk() && replace.value.sourceFiles["Data/Scripts/src/user.lua"]?.content).toBe("-- imported");
    expect(mergeScriptWorkspace(state, { ...incoming, context: { ...context, gameId: "other" } }, true).isErr()).toBe(true);
  });

  it("rejects a stale multi-file edit atomically", () => {
    const state = empty();
    const source = state.sourceFiles["Data/Scripts/src/user.lua"];
    expect(source).toBeDefined(); if (!source) return;
    const result = applyScriptWorkspaceFileEdits(state, [
      { filePath: source.path, expectedContent: source.content, content: "-- changed" },
      { filePath: "missing.lua", expectedContent: "", content: "new" },
    ]);
    expect(result.isErr()).toBe(true);
    expect(state.sourceFiles[source.path]?.content).toBe(source.content);
    expect(applyScriptWorkspaceFileEdits(state, [{ filePath: source.path, expectedContent: "stale", content: "new" }]).isErr()).toBe(true);
  });

  it("preserves native binding matching conditions through mixed movement, duplication and undo", () => {
    const before = [{ x: 10, z: 20, type: 4, flags: 0, p0: 1, p1: 0, p2: 0, p3: 0 }];
    const item = before[0]; expect(item).toBeDefined(); if (!item) return;
    const state = applyTerrainBehavior(empty(), "sample.item-trigger-logger", "Plant", { itemType: item.type, position: { x: item.x, y: 0, z: item.z }, flags: 0, params: [1, 0, 0, 0] });
    const after = [{ ...item, x: 30 }, { ...item, x: 50 }];
    const moved = updateNativeItemBindingsAfterEdit(state, before, after, [{ oldIndex: 0, newIndex: 0 }, { oldIndex: 0, newIndex: 1 }]);
    expect(moved.isOk()).toBe(true); if (moved.isErr()) return;
    const bindings = moved.value.levels[context.levelKey]?.terrainBindings ?? [];
    expect(bindings.map((binding) => binding.signature.position.x)).toEqual([30, 50]);
    expect(sameScriptEditorHistory(replaceScriptWorkspace({}, state), replaceScriptWorkspace({}, moved.value))).toBe(false);
    expect(new Set(bindings.map((binding) => binding.sourceFilePath)).size).toBe(2);
    for (const binding of bindings) expect(moved.value.sourceFiles[binding.sourceFilePath]?.content).toContain(`ctx.position.x == ${binding.signature.position.x}`);
    const changed = updateScriptSourceContent(moved.value, "Data/Scripts/src/user.lua", "-- keep this draft");
    const restoredStore = restoreScriptEditorHistory(replaceScriptWorkspace({}, changed), replaceScriptWorkspace({}, state));
    expect(restoredStore.isOk()).toBe(true); if (restoredStore.isErr()) return;
    const restored = ensureScriptWorkspace(restoredStore.value, context);
    expect(restored.levels[context.levelKey]?.terrainBindings.map((binding) => binding.signature.position.x)).toEqual([10]);
    expect(restored.sourceFiles["Data/Scripts/src/user.lua"]?.content).toBe("-- keep this draft");
    const originalBinding = state.levels[context.levelKey]?.terrainBindings[0];
    if (originalBinding) expect(restored.sourceFiles[originalBinding.sourceFilePath]?.content).toContain("ctx.position.x == 10");
    expect(sameScriptEditorHistory(replaceScriptWorkspace({}, moved.value), replaceScriptWorkspace({}, changed))).toBe(true);
  });

  it("refuses native moves when their manually rewritten condition cannot be safely updated", () => {
    const before = [{ x: 10, z: 20, type: 4, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 }];
    const state = applyTerrainBehavior(empty(), "sample.item-trigger-logger", "Plant", { itemType: 4, position: { x: 10, y: 0, z: 20 }, flags: 0, params: [0, 0, 0, 0] });
    const binding = state.levels[context.levelKey]?.terrainBindings[0];
    if (!binding) return;
    const edited = updateScriptSourceContent(state, binding.sourceFilePath, "-- manually rewritten target");
    expect(updateNativeItemBindingsAfterEdit(edited, before, [{ ...before[0], x: 30, z: 20, type: 4, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 }], [{ oldIndex: 0, newIndex: 0 }]).isErr()).toBe(true);
  });

  it("rejects unsafe and excessive ZIP entries before accepting a package", () => {
    expect(readBoundedScriptZip(zipSync({ "../escape.lua": new Uint8Array([1]) })).isErr()).toBe(true);
    expect(readBoundedScriptZip(zipSync(Object.fromEntries(Array.from({ length: 513 }, (_, index) => [`${index}.lua`, new Uint8Array()])))).isErr()).toBe(true);
    const bytes = zipSync({ "Data/Scripts/src/user.lua": new TextEncoder().encode("-- safe") });
    expect(readBoundedScriptZip(bytes).isOk()).toBe(true);
  });

  it("validates recovery snapshots with typed asset bytes and rejects malformed drafts", () => {
    const state = empty();
    expect(scriptRecoverySnapshotSchema.safeParse({ version: 1, savedAt: 1, workspaces: { game: state } }).success).toBe(true);
    expect(scriptRecoverySnapshotSchema.safeParse({ version: 1, savedAt: 1, workspaces: { game: { ...state, sourceFiles: { broken: { content: 3 } } } } }).success).toBe(false);
  });

  it("distinguishes an unbuilt project from changed or currently built code and maps runtime locations", () => {
    const state = empty();
    expect(getScriptBuildStatus(state).phase).toBe("unvalidated");
    const compiled = compileScriptWorkspace(state); expect(compiled.isOk()).toBe(true); if (compiled.isErr()) return;
    expect(getScriptBuildStatus(compiled.value).phase).toBe("validated");
    expect(getScriptBuildStatus(updateScriptSourceContent(compiled.value, "Data/Scripts/src/user.lua", "-- changed")).phase).toBe("stale");
    expect(getScriptRuntimeDiagnosticLocation(compiled.value, 'Data/Scripts/dist/modules/user.lua:12: failed')).toEqual({ filePath: "Data/Scripts/src/user.lua", line: 12, column: 1 });
  });
});

describe("semantic parameter values", () => {
  const number: ScriptParameterDefinition = { id: "speed", label: "Speed", type: "number", description: "Travel speed", defaultValue: "5", minimum: 0, maximum: 10 };
  it("rejects blank and out-of-domain numbers without coercing a cleared field to zero", () => {
    expect(parseScriptParameterValue(number, "").isErr()).toBe(true);
    expect(parseScriptParameterValue(number, "11").isErr()).toBe(true);
    expect(parseScriptParameterValue(number, "5").isOk()).toBe(true);
    expect(validateScriptParameter({ ...number, minimum: 20 }).isErr()).toBe(true);
  });
  it("validates booleans and named choices", () => {
    expect(parseScriptParameterValue({ ...number, type: "boolean" }, "maybe").isErr()).toBe(true);
    expect(parseScriptParameterValue({ ...number, type: "boolean" }, "false").isOk()).toBe(true);
    expect(parseScriptParameterValue({ ...number, type: "string", choices: ["fast", "slow"] }, "medium").isErr()).toBe(true);
  });
});
