import { describe, expect, it } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, ensureScriptWorkspace, loadScriptSample, replaceScriptWorkspace, upsertScriptSourceFile } from "./scriptWorkspaceState";
import { applyObjectImport, objectImportConflicts, undoObjectImport } from "./scriptObjectImport";
import type { ScriptDefinitionBundle } from "./scriptDefinitionBundle";
import { importedAsset, importedAssetId, importedAttachment, importedModelPath } from "./scriptObjectImport.fixtures";

function fixture() {
  const state = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
  const bundle: ScriptDefinitionBundle = {
    gameId: state.context.gameId,
    definitions: state.customObjects,
    sources: Object.fromEntries(state.customObjects.map((definition) => [definition.sourceFilePath, state.sourceFiles[definition.sourceFilePath]?.content ?? ""])),
    assets: {},
  };
  return { state, bundle };
}

describe("reviewed object imports", () => {
  it("restores editable identities, sources and animation mapping, including persisted undo", () => {
    const { state, bundle } = fixture();
    const original = bundle.definitions[0];
    if (!original) { expect.fail("Sample definition missing"); return; }
    const incoming: ScriptDefinitionBundle = { ...bundle, authoringAssets: importedAttachment,
      definitions: [{ ...original, assetId: importedAssetId, assetAnimations: { idle: "idle" }, visual: { kind: "customDisplayGroup", modelPath: importedModelPath, modelObject: 0, scale: 1, slot: 1 } }],
      assets: { [importedModelPath]: new Uint8Array([1]) } };
    const result = applyObjectImport(state, incoming, "replace");
    if (result.isErr()) { expect.fail(result.error); return; }
    expect(result.value.state.customObjects[0]?.assetId).toBe(importedAssetId);
    expect(result.value.state.customObjects[0]?.assetAnimations).toEqual({ idle: "idle" });
    expect(result.value.attachment).toEqual(importedAttachment);
    const mismatched = applyObjectImport(state, { ...incoming, assets: { [importedModelPath]: new Uint8Array([99]) } }, "replace");
    expect(mismatched.isErr() && mismatched.error).toContain("editable output does not match");
    const persisted = ensureScriptWorkspace(replaceScriptWorkspace({}, result.value.state), state.context);
    expect(persisted.authoringAssets).toEqual(importedAttachment);
    const undone = undoObjectImport(persisted, result.value.undo);
    expect(undone.isOk() && undone.value.authoringAssets).toEqual(state.authoringAssets);
    const copy = applyObjectImport(state, incoming, "copy");
    if (copy.isErr()) { expect.fail(copy.error); return; }
    const definition = copy.value.state.customObjects.find((entry) => entry.id === copy.value.selectedId);
    const copiedAsset = copy.value.attachment?.assets[0];
    expect(copiedAsset?.id).not.toBe(importedAssetId);
    expect(definition?.assetId).toBe(copiedAsset?.id);
    expect(definition?.assetAnimations).toEqual({ idle: "idle" });
    expect(copiedAsset?.source.path).toContain(`AuthoringSources/${copiedAsset?.id}/`);
    expect(copiedAsset?.outputs.model).toContain(`Assets/Models/${copiedAsset?.id}/`);
    expect(copy.value.attachment?.files.some((file) => file.path === copiedAsset?.source.path)).toBe(true);
    if (definition?.visual.kind !== "customDisplayGroup") { expect.fail("Missing copied model"); return; }
    expect(definition.visual.modelPath).toContain(`/project/${copiedAsset?.id}/`);
    expect(copy.value.state.assets[definition.visual.modelPath]?.bytes).toEqual(new Uint8Array([1]));
  });

  it("reviews editable project conflicts and protects Keep from replacing shared records", () => {
    const { state, bundle } = fixture();
    const original = bundle.definitions[0];
    if (!original) { expect.fail("Sample definition missing"); return; }
    const incoming = { ...bundle, authoringAssets: importedAttachment,
      definitions: [{ ...original, id: "new-robot", exportName: "new_robot", assetId: importedAssetId }] };
    const existing = { ...importedAsset, name: "Edited locally" };
    expect(objectImportConflicts(state, incoming, [existing]).some((conflict) => conflict.kind === "Editable asset")).toBe(true);
    const kept = applyObjectImport(state, incoming, "keep", [existing]);
    expect(kept.isErr() && kept.error).toContain("Editable asset Robot differs");
    expect(applyObjectImport(state, incoming, "copy", [existing]).isOk()).toBe(true);
  });
  it("previews object and changed shared source conflicts without applying changes", () => {
    const { state, bundle } = fixture();
    const path = bundle.definitions[0]?.sourceFilePath ?? "";
    const changed = { ...bundle, sources: { ...bundle.sources, [path]: "return {}" } };
    expect(objectImportConflicts(state, changed).map((conflict) => conflict.kind)).toEqual(["Object", "Source"]);
    expect(state.sourceFiles[path]?.content).not.toBe("return {}");
  });

  it("keeps matching objects and their behavior unchanged", () => {
    const { state, bundle } = fixture();
    const result = applyObjectImport(state, { ...bundle, sources: Object.fromEntries(Object.keys(bundle.sources).map((path) => [path, "return {}"])) }, "keep");
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.state.customObjects).toEqual(state.customObjects);
    expect(result.value.state.sourceFiles).toEqual(state.sourceFiles);
  });

  it("copies behavior verbatim inside independent identity and source", () => {
    const { state, bundle } = fixture();
    const original = bundle.definitions[0];
    if (!original) return;
    const result = applyObjectImport(state, bundle, "copy");
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    const copy = result.value.state.customObjects.find((object) => object.id === result.value.selectedId);
    expect(copy?.id).not.toBe(original.id);
    expect(copy?.exportName).not.toBe(original.exportName);
    expect(copy?.sourceFilePath).not.toBe(original.sourceFilePath);
    expect(result.value.state.sourceFiles[copy?.sourceFilePath ?? ""]?.content).toContain(bundle.sources[original.sourceFilePath]);
    expect(result.value.state.levels).toBe(state.levels);
  });

  it("rejects copying incompatible shared helpers instead of overwriting them", () => {
    const { state, bundle } = fixture();
    const original = bundle.definitions[0];
    if (!original) return;
    const helper = "Data/Scripts/src/helpers/shared.lua";
    const existing = upsertScriptSourceFile(state, helper, "return {old=true}");
    const incoming = { ...bundle, sources: { ...bundle.sources, [original.sourceFilePath]: 'local shared = require("helpers.shared")\nreturn {}', [helper]: "return {new=true}" } };
    const result = applyObjectImport(existing, incoming, "copy");
    expect(result.isErr() && result.error).toContain("Shared helper differs");
    expect(existing.sourceFiles[helper]?.content).toContain("old=true");
  });

  it("copies definition asset paths and detaches desktop authoring identities", () => {
    const { state, bundle } = fixture();
    const original = bundle.definitions[0];
    if (!original) return;
    const path = "Data/Scripts/assets/models/beacon.bg3d";
    const bytes = new Uint8Array([1, 2, 3]);
    const incoming: ScriptDefinitionBundle = { ...bundle, definitions: [{ ...original, assetId: "desktop-linked", visual: { kind: "customDisplayGroup", modelPath: path, modelObject: 0, scale: 1, slot: 1 } }], assets: { [path]: bytes } };
    const result = applyObjectImport(state, incoming, "copy");
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    const copy = result.value.state.customObjects.find((object) => object.id === result.value.selectedId);
    expect(copy?.assetId).toBeUndefined();
    if (copy?.visual.kind !== "customDisplayGroup") return;
    expect(copy.visual.modelPath).not.toBe(path);
    expect(result.value.state.assets[copy.visual.modelPath]?.bytes).toEqual(bytes);
    expect(result.value.state.assets[copy.visual.modelPath]?.bytes).not.toBe(bytes);
    expect(result.value.state.assets[path]?.bytes).toBe(bytes);
  });

  it("requires replacement or conflict resolution for incompatible new object dependencies", () => {
    const { state, bundle } = fixture();
    const original = bundle.definitions[0];
    if (!original) return;
    const incoming = { ...bundle, definitions: [{ ...original, id: "new-object", exportName: "new_object" }], sources: { [original.sourceFilePath]: "return {new_object={}}" } };
    expect(applyObjectImport(state, incoming, "keep").isErr()).toBe(true);
    const replaced = applyObjectImport(state, incoming, "replace");
    expect(replaced.isOk()).toBe(true);
    if (replaced.isErr()) return;
    expect(replaced.value.state.sourceFiles[original.sourceFilePath]?.content).toBe("return {new_object={}}");
    expect(replaced.value.state.levels).toBe(state.levels);
  });

  it("undo restores definitions and generated sources while preserving unrelated level edits", () => {
    const { state, bundle } = fixture();
    const result = applyObjectImport(state, bundle, "copy");
    if (result.isErr()) return;
    const levels = { ...result.value.state.levels };
    const undone = undoObjectImport({ ...result.value.state, levels }, result.value.undo);
    expect(undone.isOk()).toBe(true);
    if (undone.isErr()) return;
    expect(undone.value.customObjects).toBe(state.customObjects);
    expect(undone.value.sourceFiles).toBe(state.sourceFiles);
    expect(undone.value.levels).toBe(levels);
    const edited = upsertScriptSourceFile(result.value.state, result.value.state.activeFilePath, "edited");
    expect(undoObjectImport(edited, result.value.undo).isErr()).toBe(true);
    expect(undoObjectImport({ ...result.value.state, moduleOrder: [...result.value.state.moduleOrder].reverse() }, result.value.undo).isErr()).toBe(true);
  });

  it("undo survives actual workspace persistence and regenerated entry normalization", () => {
    const { state, bundle } = fixture();
    const imported = applyObjectImport(state, bundle, "copy");
    expect(imported.isOk()).toBe(true);
    if (imported.isErr()) return;
    const store = replaceScriptWorkspace({}, imported.value.state);
    const current = ensureScriptWorkspace(store, state.context);
    expect(current.sourceFiles).not.toBe(imported.value.state.sourceFiles);
    const undone = undoObjectImport(current, imported.value.undo);
    expect(undone.isOk()).toBe(true);
    if (undone.isErr()) return;
    const persistedUndo = ensureScriptWorkspace(replaceScriptWorkspace(store, undone.value), state.context);
    expect(persistedUndo.customObjects).toEqual(state.customObjects);
    expect(persistedUndo.moduleOrder).toEqual(state.moduleOrder);
    const changed = upsertScriptSourceFile(current, imported.value.state.customObjects.at(-1)?.sourceFilePath ?? "missing.lua", "edited behavior");
    expect(undoObjectImport(changed, imported.value.undo).isErr()).toBe(true);
  });
});
