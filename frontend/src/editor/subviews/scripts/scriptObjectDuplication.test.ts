import { describe, expect, it } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, loadScriptSample, upsertScriptSourceFile } from "./scriptWorkspaceState";
import { duplicateScriptObject, aliasSourceExport } from "./scriptObjectDuplication";
import { buildScriptDefinitionBundle, importScriptDefinitionBundle } from "./scriptDefinitionBundle";

describe("object duplication", () => {
  it("copies behavior independently while retaining shared helpers and leaving placements alone", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    let state = loadScriptSample(context, "hover-beacon");
    const original = state.customObjects[0];
    if (!original) return;
    const content = `local shared = require("helpers.shared")\n-- ${original.exportName} is also documentation\nreturn { ["${original.exportName}"] = shared }`;
    state = upsertScriptSourceFile(state, original.sourceFilePath, content);
    state = upsertScriptSourceFile(state, "Data/Scripts/src/helpers/shared.lua", "return {}");
    const result = duplicateScriptObject(state, original.id);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    const copy = result.value.state.customObjects.find((object) => object.id === result.value.id);
    expect(copy).toBeDefined();
    if (!copy) return;
    expect(copy.sourceFilePath).not.toBe(original.sourceFilePath);
    expect(copy.exportName).not.toBe(original.exportName);
    expect(result.value.state.sourceFiles[copy.sourceFilePath]?.content).toContain(content);
    expect(result.value.state.sourceFiles[original.sourceFilePath]?.content).toBe(content);
    expect(result.value.state.levels).toEqual(state.levels);
    const bundle = buildScriptDefinitionBundle(result.value.state, null, [copy.id]);
    expect(bundle.isOk()).toBe(true);
    if (bundle.isErr()) return;
    const imported = importScriptDefinitionBundle(bundle.value, context);
    expect(imported.isOk()).toBe(true);
    if (imported.isErr()) return;
    expect(Object.keys(imported.value.sources).sort()).toEqual([copy.sourceFilePath, "Data/Scripts/src/helpers/shared.lua"].sort());
  });

  it("reserves both existing source paths and export identities", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    let state = loadScriptSample(context, "hover-beacon");
    const original = state.customObjects[0];
    if (!original) return;
    const first = duplicateScriptObject(state, original.id);
    if (first.isErr()) return;
    const copy = first.value.state.customObjects.find((object) => object.id === first.value.id);
    if (!copy) return;
    state = upsertScriptSourceFile(state, copy.sourceFilePath, "return {}");
    const result = duplicateScriptObject(state, original.id);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.id).not.toBe(copy.id);
    expect(result.value.state.sourceFiles[copy.sourceFilePath]?.content).toBe("return {}");
  });

  it("rejects missing definitions and sources without changes", () => {
    const state = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
    expect(duplicateScriptObject(state, "missing").isErr()).toBe(true);
    expect(duplicateScriptObject({ ...state, sourceFiles: {} }, state.customObjects[0]?.id ?? "").isErr()).toBe(true);
  });

  it("keeps source bytes intact and safely encodes unusual export names", () => {
    const source = "return {} -- trailing comment";
    const aliased = aliasSourceExport(source, 'old"\\\n', "newé");
    expect(aliased).toContain(`${source}\nend)(...)`);
    expect(aliased).toContain('"\\110\\101\\119\\195\\169"');
  });
});
