import { describe, expect, it } from "vitest";
import { BugdomGlobals, OttoGlobals } from "@/data/globals/globals";
import {
  buildScriptDefinitionBundle,
  importScriptDefinitionBundle,
} from "./scriptDefinitionBundle";
import {
  createScriptWorkspaceContext,
  loadScriptSample,
  upsertScriptSourceFile,
  addScriptAsset,
} from "./scriptWorkspaceState";

describe("script definition bundles", () => {
  it("exports only selected objects, their recursive helpers and required runtime assets", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    let state = loadScriptSample(context, "hover-beacon");
    const original = state.customObjects[0];
    if (!original) return;
    const modelPath = "Data/Scripts/assets/models/chosen.bg3d";
    state = { ...state, customObjects: [{ ...original, visual: { kind: "customDisplayGroup", modelPath, modelObject: 0, scale: 1, slot: 100 } }, { ...original, id: "unselected", sourceFilePath: "Data/Scripts/src/objects/missing.lua" }] };
    state = upsertScriptSourceFile(state, original.sourceFilePath, '---@dependency helpers.dynamic\nlocal helper = require("helpers.shared")\nreturn {}');
    state = upsertScriptSourceFile(state, "Data/Scripts/src/helpers/shared.lua", 'return require("helpers.inner")');
    state = upsertScriptSourceFile(state, "Data/Scripts/src/helpers/inner.lua", 'return require("helpers.shared")');
    state = upsertScriptSourceFile(state, "Data/Scripts/src/helpers/dynamic.lua", "return {}");
    state = addScriptAsset(state, modelPath, new Uint8Array([1]), "chosen.bg3d");
    state = addScriptAsset(state, "Data/Scripts/assets/models/unrelated.bg3d", new Uint8Array([2]), "unrelated.bg3d");
    const bundle = buildScriptDefinitionBundle(state, null, [original.id]);
    expect(bundle.isOk()).toBe(true);
    if (bundle.isErr()) return;
    const imported = importScriptDefinitionBundle(bundle.value, context);
    expect(imported.isOk()).toBe(true);
    if (imported.isErr()) return;
    expect(imported.value.definitions.map((object) => object.id)).toEqual([original.id]);
    expect(Object.keys(imported.value.assets)).toEqual([modelPath]);
    expect(Object.keys(imported.value.sources)).toHaveLength(4);
  });

  it("rejects an empty or stale selection", () => {
    const state = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
    expect(buildScriptDefinitionBundle(state, null, []).isErr()).toBe(true);
    expect(buildScriptDefinitionBundle(state, null, ["gone"]).isErr()).toBe(true);
  });

  it("ignores require examples in comments and string contents while retaining real helpers", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    let workspace = loadScriptSample(context, "hover-beacon");
    const definition = workspace.customObjects[0];
    expect(definition).toBeDefined();
    if (!definition) return;
    workspace = upsertScriptSourceFile(workspace, definition.sourceFilePath, `
-- require("missing.comment")
--[=[ require("missing.longComment") ]=]
local example = "require('missing.string')"
local longExample = [==[ require("missing.longString") ]==]
local helper = require -- comment between tokens
  ("helpers.real")
return { ${definition.exportName} = helper }
`);
    workspace = upsertScriptSourceFile(workspace, "Data/Scripts/src/helpers/real.lua", "return require [[helpers.inner]]");
    workspace = upsertScriptSourceFile(workspace, "Data/Scripts/src/helpers/inner.lua", "return {}");
    const bundle = buildScriptDefinitionBundle(workspace);
    expect(bundle.isOk() ? null : bundle.error).toBeNull();
    if (bundle.isErr()) return;
    const imported = importScriptDefinitionBundle(bundle.value, context);
    expect(imported.isOk()).toBe(true);
    if (imported.isErr()) return;
    expect(Object.keys(imported.value.sources).sort()).toEqual([definition.sourceFilePath, "Data/Scripts/src/helpers/real.lua", "Data/Scripts/src/helpers/inner.lua"].sort());
  });

  it("round-trips game-scoped definitions without level placements", () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    const workspace = loadScriptSample(context, "hover-beacon");
    const bundleResult = buildScriptDefinitionBundle(workspace);

    expect(bundleResult.isOk()).toBe(true);
    if (bundleResult.isErr()) return;

    const importedResult = importScriptDefinitionBundle(
      bundleResult.value,
      context,
    );
    expect(importedResult.isOk()).toBe(true);
    if (importedResult.isErr()) return;

    expect(importedResult.value.gameId).toBe(context.gameId);
    expect(importedResult.value.definitions).toHaveLength(1);
    expect(Object.keys(importedResult.value.sources)).toHaveLength(1);
  });

  it("rejects definitions imported into a different game", () => {
    const sourceContext = createScriptWorkspaceContext(OttoGlobals, 0);
    const sourceWorkspace = loadScriptSample(sourceContext, "hover-beacon");
    const bundleResult = buildScriptDefinitionBundle(sourceWorkspace);
    const targetContext = createScriptWorkspaceContext(BugdomGlobals, 0);

    expect(bundleResult.isOk()).toBe(true);
    if (bundleResult.isErr()) return;
    const importedResult = importScriptDefinitionBundle(
      bundleResult.value,
      targetContext,
    );
    expect(importedResult.isErr()).toBe(true);
  });
});
