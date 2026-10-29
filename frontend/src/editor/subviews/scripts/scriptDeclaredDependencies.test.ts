import { describe, expect, it } from "vitest";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { OttoGlobals } from "@/data/globals/globals";
import { collectDeclaredLuaDependencies, setDeclaredLuaDependencies } from "./scriptDeclaredDependencies";
import { collectSourceDependencies } from "./scriptDefinitionDependencies";
import { createScriptWorkspaceContext, ensureScriptWorkspace, upsertScriptSourceFile } from "./scriptWorkspaceState";
import { createObjectDefinition } from "./scriptObjectActions";
import { buildScriptDefinitionBundle, importScriptDefinitionBundle } from "./scriptDefinitionBundle";
import { buildScriptLibrary, readScriptLibrary } from "./scriptLibrary";
import { mergeScriptLibrary } from "./scriptLibraryMerge";

describe("declared Lua module dependencies", () => {
  it("reads actual annotations without discovering examples inside strings or long comments", () => {
    const source = `local example = [=[\n---@dependency fake.string\n]=]\n--[=[\n---@dependency fake.comment\n]=]\n---@dependency helpers.real\n---@dependency helpers.real\nreturn {}`;
    expect(collectDeclaredLuaDependencies(source)._unsafeUnwrap()).toEqual(["helpers.real"]);
    const updated = setDeclaredLuaDependencies(source, ["helpers.other"])._unsafeUnwrap();
    expect(updated).toContain("---@dependency fake.string");
    expect(updated).toContain("---@dependency fake.comment");
    expect(collectDeclaredLuaDependencies(updated)._unsafeUnwrap()).toEqual(["helpers.other"]);
  });

  it.each(["../escape", "helpers..escape", "helpers/escape", "", "helpers.real extra"])("rejects unsafe declaration %s", (name) => {
    expect(collectDeclaredLuaDependencies(`---@dependency ${name}\nreturn {}`).isErr()).toBe(true);
    expect(setDeclaredLuaDependencies("return {}", [name]).isErr()).toBe(true);
  });

  it("collects recursive computed dependencies and terminates cycles without duplicate sources", () => {
    const sources = {
      "Data/Scripts/src/root.lua": '---@dependency helpers.one\nreturn require("helpers." .. selected)',
      "Data/Scripts/src/helpers/one.lua": '---@dependency helpers.two\nreturn {}',
      "Data/Scripts/src/helpers/two.lua": '---@dependency helpers.one\nreturn {}',
    };
    expect(collectSourceDependencies(sources, ["Data/Scripts/src/root.lua"])._unsafeUnwrap()).toHaveLength(3);
    expect(collectSourceDependencies({ "Data/Scripts/src/root.lua": sources["Data/Scripts/src/root.lua"] }, ["Data/Scripts/src/root.lua"]).isErr()).toBe(true);
  });

  it("round-trips computed dependencies through object bundles, shared libraries and selective merge", async () => {
    const context = createScriptWorkspaceContext(OttoGlobals, 0);
    const initial = ensureScriptWorkspace({}, context);
    const created = createObjectDefinition(initial, "Dynamic helper", "blank")._unsafeUnwrap();
    const definition = created.state.customObjects.find((object) => object.id === created.id);
    expect(definition).toBeDefined();
    if (!definition) return;
    let state = upsertScriptSourceFile(created.state, definition.sourceFilePath, `---@dependency helpers.one\nlocal name = "helpers.one"\nreturn { ${definition.exportName} = require(name) }`);
    state = upsertScriptSourceFile(state, "Data/Scripts/src/helpers/one.lua", "---@dependency helpers.two\nreturn {}");
    state = upsertScriptSourceFile(state, "Data/Scripts/src/helpers/two.lua", "return {}");
    const bundle = buildScriptDefinitionBundle(state)._unsafeUnwrap();
    const imported = importScriptDefinitionBundle(bundle, context)._unsafeUnwrap();
    expect(imported.sources["Data/Scripts/src/helpers/two.lua"]).toBe("return {}");
    expect(imported.sources[definition.sourceFilePath]).toContain("---@dependency helpers.one");
    const library = (await readScriptLibrary(buildScriptLibrary(state)._unsafeUnwrap(), context.gameId))._unsafeUnwrap();
    const rootOnly = new Set([`source:${definition.sourceFilePath}`]);
    expect(mergeScriptLibrary(initial, library, rootOnly).isErr()).toBe(true);
    const allSources = new Set(Object.keys(library.sources).map((path) => `source:${path}`));
    expect(mergeScriptLibrary(initial, library, allSources).isOk()).toBe(true);
    const files = unzipSync(bundle);
    delete files["Data/Scripts/src/helpers/two.lua"];
    const manifest = strFromU8(files["manifest.json"] ?? new Uint8Array());
    files["manifest.json"] = strToU8(manifest.replace(',\n    "Data/Scripts/src/helpers/two.lua"', ""));
    expect(importScriptDefinitionBundle(zipSync(files), context).isErr()).toBe(true);
  });
});
