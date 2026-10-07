import { execFileSync } from "node:child_process";
import { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import { Bugdom2Globals } from "@/data/globals/globals";
import { buildScriptPackageZip, importScriptPackageZip, compileScriptWorkspace, createScriptWorkspaceContext, loadScriptSample, upsertScriptSourceFile } from "./scriptWorkspaceState";
import { getScriptParameterDiagnostics } from "./scriptParameters";

const luaBinary = process.env["PANGEA_SCRIPT_LUA_BIN"];

describe("item parameter inheritance", () => {
  it.skipIf(luaBinary === undefined).each([true, false])("executes instance values through update and pickup with spawn handler = %s", (hasSpawnHandler) => {
    if (!luaBinary) return;
    const context = createScriptWorkspaceContext(Bugdom2Globals, 1);
    const initial = loadScriptSample(context, "hover-beacon");
    const definition = initial.customObjects[0];
    const level = initial.levels[context.levelKey];
    const placement = level?.customPlacements[0];
    expect(definition).toBeDefined(); if (!definition || !level || !placement) return;
    const workspace = { ...initial,
      params: [
        { id: "speed", label: "Speed", description: "Travel speed", type: "number", defaultValue: "5" },
        { id: "message", label: "Message", description: "Text", type: "string", defaultValue: "Quote\"\n\\\u00001" },
      ] satisfies readonly import("./scriptWorkspaceStateTypes").ScriptParameterDefinition[],
      customObjects: [{ ...definition, parameters: { speed: 10 } }],
      levels: { ...initial.levels, [context.levelKey]: { ...level, customPlacements: [
        { ...placement, parameters: { speed: 20 } },
        { ...placement, id: "second", parameters: { speed: 30 } },
      ] } },
    };
    const source = [
      "local item = {}",
      ...(hasSpawnHandler ? ["function item.onSpawn(self, ctx)", "  observed[self.handle.id] = self.parameters.speed", "end"] : []),
      "function item.onUpdate(self, ctx)",
      "  updated[self.handle.id] = self.parameters.speed",
      "  assert(self.parameters.message == 'Quote\"' .. string.char(10) .. string.char(92) .. string.char(0) .. '1')",
      "end",
      "function item.onPickupCollected(self, ctx)",
      "  return { handled = true, scoreDelta = self.parameters.speed }",
      "end",
      `return { ${definition.exportName} = item }`,
    ].join("\n");
    const withSource = upsertScriptSourceFile(workspace, definition.sourceFilePath, source);
    const compiled = compileScriptWorkspace(withSource);
    expect(compiled.isOk()).toBe(true); if (compiled.isErr()) return;
    const entry = compiled.value.compiledFiles["Data/Scripts/dist/main.lua"];
    expect(entry).toBeDefined(); if (!entry) return;
    const modules = Object.values(compiled.value.sourceFiles).filter((file) => file.role !== "generated-entry").map((file) => {
      const name = file.path.replace(/^Data\/Scripts\/src\//, "").replace(/\.lua$/, "").replaceAll("/", ".");
      return `package.preload[${JSON.stringify(name)}] = function()\n${file.content}\nend`;
    });
    const harness = [
      "observed = {}; updated = {}; local nextId = 0; local entry",
      `local objectType = ${JSON.stringify(definition.id)}`,
      "pangea = { log = { info = function() end }, object = { type = function() return objectType end }, spawn = {} }",
      "pangea.spawn.scripted = function(id, position)",
      "  nextId = nextId + 1; local handle = { id = nextId, generation = 1 }",
      "  entry.onObjectFrame({ object = handle, objectType = id, event = 'spawn' })",
      "  return handle",
      "end",
      "package.preload['pangea'] = function() return pangea end",
      ...modules,
      `entry = (function()\n${entry.content}\nend)()`,
      "entry.onLevelStart({ levelNum = 1 })",
      ...(hasSpawnHandler ? ["assert(observed[1] == 20 and observed[2] == 30)"] : []),
      "entry.onObjectFrame({ object = { id = 1, generation = 1 }, objectType = objectType, event = 'update' })",
      "entry.onObjectFrame({ object = { id = 2, generation = 1 }, objectType = objectType, event = 'update' })",
      "assert(updated[1] == 20 and updated[2] == 30)",
      "assert(entry.onPickupCollected({ pickup = { id = 1, generation = 1 } }).scoreDelta == 20)",
      "assert(entry.onPickupCollected({ pickup = { id = 2, generation = 1 } }).scoreDelta == 30)",
      "entry.onObjectFrame({ object = { id = 1, generation = 1 }, objectType = objectType, event = 'destroy' })",
      "entry.onObjectFrame({ object = { id = 1, generation = 2 }, objectType = objectType, event = 'spawn' })",
      "assert(entry.onPickupCollected({ pickup = { id = 1, generation = 2 } }).scoreDelta == 10)",
      "print('Instance parameter execution passed')",
    ].join("\n");
    const execution = Result.fromThrowable(() => execFileSync(luaBinary, ["-"], { input: harness, encoding: "utf8" }), () => "Generated Lua parameter dispatch failed")();
    expect(execution.isOk()).toBe(true);
    if (execution.isOk()) expect(execution.value).toContain("Instance parameter execution passed");
  });

  it("preserves definition and instance parameters through a portable package", () => {
    const context = createScriptWorkspaceContext(Bugdom2Globals, 1);
    const state = loadScriptSample(context, "hover-beacon");
    const level = state.levels[context.levelKey];
    expect(level).toBeDefined(); if (!level) return;
    const withParameters = { ...state,
      params: [{ id: "speed", label: "Speed", description: "Travel speed", type: "number", defaultValue: "5" } satisfies import("./scriptWorkspaceStateTypes").ScriptParameterDefinition],
      customObjects: state.customObjects.map((definition) => ({ ...definition, parameters: { speed: 10 } })),
      levels: { ...state.levels, [context.levelKey]: { ...level, customPlacements: level.customPlacements.map((placement) => ({ ...placement, parameters: { speed: 20 } })) } },
    };
    const bytes = buildScriptPackageZip(withParameters);
    expect(bytes.isOk()).toBe(true); if (bytes.isErr()) return;
    const imported = importScriptPackageZip(bytes.value, context);
    expect(imported.isOk()).toBe(true); if (imported.isErr()) return;
    expect(imported.value.customObjects[0]?.parameters).toEqual({ speed: 10 });
    expect(imported.value.levels[context.levelKey]?.customPlacements[0]?.parameters).toEqual({ speed: 20 });
  });

  it("reports malformed imported overrides before export", () => {
    const workspace = loadScriptSample(createScriptWorkspaceContext(Bugdom2Globals, 1), "hover-beacon");
    expect(getScriptParameterDiagnostics({ ...workspace, customObjects: workspace.customObjects.map((item) => ({ ...item, parameters: { missing: 3 } })) })).toContainEqual(expect.objectContaining({ code: "parameter.value", severity: "error" }));
  });
});
