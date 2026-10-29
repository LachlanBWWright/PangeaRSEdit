// @vitest-environment node
import "../../../../tests/setup/scriptLuaValidation";
import { describe, expect, it } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { buildScriptPackageZip, importScriptPackageZip, compileScriptWorkspace, createScriptWorkspaceContext, loadScriptSample, updateCustomObjectDefinition } from "./scriptWorkspaceState";
import { resolveObjectParameters, setCustomObjectParameterDefault, setCustomPlacementParameter, validateObjectParameters } from "./scriptObjectParameters";
import type { ScriptObjectParameter } from "./scriptObjectParameterTypes";
import { buildScriptTypeDeclarationFiles } from "./scriptTypeDeclarations";
import { materializeCustomObjectSourceTemplate } from "./scriptCustomObjectTemplate";
import { customObjectSelfType } from "./scriptObjectParameterDeclarations";

const parameters: ScriptObjectParameter[] = [
  { kind: "number", id: "health", label: "Health", min: 1, max: 100, defaultValue: 10 },
  { kind: "boolean", id: "active", label: "Active", defaultValue: true },
  { kind: "enum", id: "movement", label: "Movement", defaultValue: "patrol", options: [{ value: "patrol", label: "Patrol" }, { value: "idle", label: "Idle" }] },
];

function fixture() {
  const workspace = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
  const object = workspace.customObjects[0];
  if (!object) return workspace;
  return updateCustomObjectDefinition(workspace, { ...object, parameterDefinitions: parameters });
}

describe("custom object behavior parameters", () => {
  it("generates exact LuaLS field types and annotates callbacks with their definition", () => {
    const workspace = fixture();
    const definition = workspace.customObjects[0];
    if (!definition) return;
    const declarations = buildScriptTypeDeclarationFiles(workspace).map((file) => file.content).join("\n");
    expect(declarations).toContain("---@field health number");
    expect(declarations).toContain("---@field active boolean");
    expect(declarations).toContain('---@field movement "patrol"|"idle"');
    const source = materializeCustomObjectSourceTemplate("---@param self ObjectBehaviorSelf", definition.exportName);
    expect(source).toBe(`---@param self ${customObjectSelfType(definition)}`);
    expect(declarations).toContain(`---@class ${customObjectSelfType(definition)}: ObjectBehaviorSelf`);
  });
  it("applies typed overrides and resets to updated definition defaults", () => {
    const workspace = fixture();
    const placement = workspace.levels[workspace.context.levelKey]?.customPlacements[0];
    const definition = workspace.customObjects[0];
    expect(placement).toBeDefined();
    expect(definition).toBeDefined();
    if (!placement || !definition) return;
    const overridden = setCustomPlacementParameter(workspace, placement.id, "health", 30)._unsafeUnwrap();
    expect(resolveObjectParameters(definition, overridden.levels[workspace.context.levelKey]?.customPlacements[0])).toEqual({ health: 30, active: true, movement: "patrol" });
    const updated = setCustomObjectParameterDefault(overridden, definition.id, "health", 20)._unsafeUnwrap();
    const reset = setCustomPlacementParameter(updated, placement.id, "health", undefined)._unsafeUnwrap();
    const resetDefinition = reset.customObjects[0];
    expect(resetDefinition && resolveObjectParameters(resetDefinition, reset.levels[workspace.context.levelKey]?.customPlacements[0]).health).toBe(20);
  });

  it("rejects wrong types, out-of-range numbers and unknown choices without modifying state", () => {
    const workspace = fixture();
    const placement = workspace.levels[workspace.context.levelKey]?.customPlacements[0];
    if (!placement) return;
    for (const [id, value] of [["health", 0], ["health", "20"], ["active", 1], ["movement", "fly"], ["missing", 2]]) {
      const parsedId = String(id);
      const parsedValue = value ?? "";
      expect(setCustomPlacementParameter(workspace, placement.id, parsedId, parsedValue).isErr()).toBe(true);
    }
    expect(placement.parameterOverrides).toBeUndefined();
  });

  it("rejects invalid defaults and duplicate parameter identities", () => {
    expect(validateObjectParameters([...parameters, { kind: "boolean", id: "active", label: "Duplicate", defaultValue: false }]).isErr()).toBe(true);
    expect(validateObjectParameters([{ kind: "number", id: "speed", label: "Speed", min: 5, max: 2, defaultValue: 3 }]).isErr()).toBe(true);
  });

  it("preserves metadata in workspace serialization and emits overrides into executable Lua", async () => {
    const workspace = fixture();
    const placement = workspace.levels[workspace.context.levelKey]?.customPlacements[0];
    if (!placement) return;
    const changed = setCustomPlacementParameter(workspace, placement.id, "active", false)._unsafeUnwrap();
    const compiled = compileScriptWorkspace(changed)._unsafeUnwrap();
    const lua = compiled.sourceFiles["Data/Scripts/src/main.lua"]?.content ?? Object.values(compiled.compiledFiles).map((file) => file.content).join("\n");
    expect(lua).toContain('["active"] = false');
    expect(lua).toContain("parameters = parameters");
    expect(lua).toContain("__spawnPlacement(");
    expect(compiled.customObjects[0]?.id).toBe(workspace.customObjects[0]?.id);
    expect(compiled.levels[workspace.context.levelKey]?.customPlacements[0]?.parameterOverrides).toEqual({ active: false });
    const archive = (await buildScriptPackageZip(changed))._unsafeUnwrap();
    const imported = importScriptPackageZip(archive, changed.context)._unsafeUnwrap();
    expect(imported.customObjects[0]?.parameterDefinitions).toEqual(parameters);
    expect(imported.customObjects[0]?.id).toBe(workspace.customObjects[0]?.id);
    expect(imported.levels[workspace.context.levelKey]?.customPlacements[0]?.parameterOverrides).toEqual({ active: false });
  });
});
