import { describe, expect, it } from "vitest";
import { createWorkshopPackage } from "./workshopPackage";
import { engineFile, engineFileText, parseManifest, parseScene, prepareEngineArchive, replaceEngineJSON, replaceEngineScene, replaceEngineText, validateEnginePackage } from "./enginePackage";
import { addEngineScene, engineWorkspaceReducer, initialEngineWorkspace } from "./engineWorkspaceState";
import { engineDeclarations, engineScriptWorkspace, engineTypeFiles } from "./engineLanguage";

describe("Lua engine package workflow", () => {
  it("discards edits back to the downloaded package and clears undo history", () => {
    const initial = initialEngineWorkspace();
    const edited = engineWorkspaceReducer(initial, { type: "edit", path: "main.lua", content: "return {}" });
    const saved = engineWorkspaceReducer(edited, { type: "saved" });
    const changed = engineWorkspaceReducer(saved, { type: "edit", path: "main.lua", content: "return { onFrame = function() end }" });
    const discarded = engineWorkspaceReducer(changed, { type: "discard" });
    expect(discarded.packageData).toBe(saved.packageData);
    expect(discarded.dirty).toBe(false);
    expect(discarded.past).toEqual([]);
    expect(discarded.future).toEqual([]);
    expect(engineWorkspaceReducer(discarded, { type: "undo" }).packageData).toBe(saved.packageData);
  });
  it("rejects scenes that exceed native JSON and chunk limits", () => {
    expect(parseScene({ path: "scene.json", bytes: new Uint8Array(4 * 1024 * 1024 + 1) }).isErr()).toBe(true);
    const terrain = { samplesX: 2, samplesZ: 2, sizeX: 1000, sizeZ: 1000, chunkSize: 1, cellsPerChunk: 1, heights: [0, 0, 0, 0] };
    expect(replaceEngineScene(createWorkshopPackage(), "scenes/arena.json", { version: 1, terrain }).isErr()).toBe(true);
  });
  it("selects an existing file after undo removes a newly created scene", () => {
    const state = initialEngineWorkspace();
    const added = addEngineScene(state.packageData, "newscene", "New scene");
    if (added.isErr()) return;
    const edited = engineWorkspaceReducer(state, { type: "replace", packageData: added.value, selected: "scenes/newscene.lua" });
    expect(engineWorkspaceReducer(edited, { type: "undo" }).selected).toBe("package.json");
  });
  it("keeps generated archives within the same limits used when reopening them", () => {
    const sample = createWorkshopPackage();
    const files = [...sample.files];
    while (files.length < 512) files.push({ path: `extra-${files.length}.lua`, bytes: new Uint8Array() });
    expect(validateEnginePackage({ files }).isOk()).toBe(true);
    expect(prepareEngineArchive({ files }).isErr()).toBe(true);
    const prepared = prepareEngineArchive(sample);
    expect(prepared.isOk()).toBe(true);
    if (prepared.isErr()) return;
    expect(validateEnginePackage(prepared.value).isOk()).toBe(true);
    expect(prepareEngineArchive(prepared.value).isOk()).toBe(true);
  });
  it("validates the actual shipped Workshop package and adds a runnable scene", () => {
    const sample = createWorkshopPackage();
    expect(validateEnginePackage(sample).isOk()).toBe(true);
    const next = addEngineScene(sample, "courtyard", "Courtyard");
    expect(next.isOk()).toBe(true);
    if (next.isErr()) return;
    expect(validateEnginePackage(next.value).isOk()).toBe(true);
    const manifest = parseManifest(next.value);
    expect(manifest.isOk() && manifest.value.scenes.at(-1)?.controller).toBe("scenes.courtyard");
    expect(engineFile(next.value, "scenes/courtyard.lua")).toBeDefined();
    expect(addEngineScene(next.value, "courtyard", "Duplicate").isErr()).toBe(true);
    expect(addEngineScene(sample, "../escape", "Escape").isErr()).toBe(true);
  });
  it("rejects missing controllers, traversal, malformed JSON and inconsistent heightfields", () => {
    const sample = createWorkshopPackage();
    expect(validateEnginePackage({ files: sample.files.filter((file) => file.path !== "scenes/arena.lua") }).isErr()).toBe(true);
    expect(validateEnginePackage({ files: [...sample.files, { path: "../outside.lua", bytes: new Uint8Array() }] }).isErr()).toBe(true);
    expect(validateEnginePackage(replaceEngineText(sample, "package.json", "{")).isErr()).toBe(true);
    const malformed = '{"version":1,"terrain":{"samplesX":3,"samplesZ":3,"sizeX":1000,"sizeZ":1000,"chunkSize":500,"cellsPerChunk":16,"heights":[0,0,0,0]}}';
    expect(validateEnginePackage(replaceEngineText(sample, "scenes/arena.json", malformed)).isErr()).toBe(true);
    const manifest = parseManifest(sample);
    if (manifest.isOk()) expect(validateEnginePackage(replaceEngineJSON(sample, "package.json", { ...manifest.value, id: ".." })).isErr()).toBe(true);
    if (manifest.isOk()) expect(validateEnginePackage(replaceEngineJSON(sample, "package.json", { ...manifest.value, name: "🌍".repeat(40) })).isErr()).toBe(true);
    expect(replaceEngineScene(sample, "scenes/arena.json", { version: 1, terrain: { sizeX: Number.NaN } }).isErr()).toBe(true);
  });
  it("exports engine and shared Lua API types with the source workspace", () => {
    const sample = createWorkshopPackage();
    const types = engineTypeFiles(sample);
    expect(types.some((file) => file.path === "types/engine.lua")).toBe(true);
    expect(types.some((file) => file.path === ".luarc.json")).toBe(true);
    expect(engineDeclarations()).toContain("transition fun(sceneId: string)");
    expect(engineScriptWorkspace(sample).sourceFiles["Data/Scripts/src/scenes/arena.lua"]).toBeDefined();
  });
  it("marks changes and exported packages consistently", () => {
    const state = initialEngineWorkspace();
    const edited = engineWorkspaceReducer(state, { type: "edit", path: "main.lua", content: "return {}" });
    expect(edited.dirty).toBe(true);
    expect(engineWorkspaceReducer(edited, { type: "saved" }).dirty).toBe(false);
    expect(state.dirty).toBe(false);
  });
  it("tracks the saved history point across undo, redo and no-op source changes", () => {
    const original = initialEngineWorkspace();
    const unchanged = engineFile(original.packageData, "main.lua");
    if (!unchanged) return;
    expect(engineWorkspaceReducer(original, { type: "edit", path: "missing.lua", content: "return {}" })).toBe(original);
    const edited = engineWorkspaceReducer(original, { type: "edit", path: "main.lua", content: "return {}" });
    expect(engineWorkspaceReducer(edited, { type: "undo" }).dirty).toBe(false);
    const saved = engineWorkspaceReducer(edited, { type: "saved" });
    const beforeSave = engineWorkspaceReducer(saved, { type: "undo" });
    expect(beforeSave.dirty).toBe(true);
    expect(engineWorkspaceReducer(beforeSave, { type: "redo" }).dirty).toBe(false);
    expect(engineWorkspaceReducer(saved, { type: "edit", path: "main.lua", content: "return {}" })).toBe(saved);
    const originalText = engineFileText(unchanged);
    if (originalText.isOk()) expect(engineWorkspaceReducer(edited, { type: "edit", path: "main.lua", content: originalText.value }).dirty).toBe(false);
  });
});
