import { describe, expect, it } from "vitest";
import { MightyMikeGlobals, Nanosaur2Globals, OttoGlobals } from "@/data/globals/globals";
import { SCRIPTING_CONTRACT } from "./scriptContract";
import { buildScriptTypeDeclarationFiles } from "./scriptTypeDeclarations";
import { addScriptParam, createScriptWorkspaceContext, ensureScriptWorkspace } from "./scriptWorkspaceState";
import type { ScriptWorkspaceState } from "./scriptWorkspaceState";

describe("Lua item declarations", () => {
  it("declares every contract lifecycle handler as optional without inventing event names", () => {
    const state = ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 1));
    const content = buildScriptTypeDeclarationFiles(state).find(file => file.path.endsWith("pangea-runtime.lua"))?.content ?? "";
    for (const event of SCRIPTING_CONTRACT.objectEvents) {
      expect(content.split(`---@field ${event.handler}? fun(self: ObjectBehaviorSelf, ctx:`)).toHaveLength(2);
    }
    expect(content).toContain("---@field onSpawn? fun(self: ObjectBehaviorSelf, ctx: ObjectFrameContext)");
    expect(content).toContain("---@field onUpdate? fun(self: ObjectBehaviorSelf, ctx: ObjectFrameContext)");
    expect(content).not.toContain("---@field onFrame? fun(self:");
    expect(content).toContain("---@field onDamage? fun(self: ObjectBehaviorSelf, ctx: DamageContext): DamageResult|nil");
    expect(content).toContain("---@field onTrigger? fun(self: ObjectBehaviorSelf, ctx: TriggerContext): TriggerResult|nil");
  });

  it("types item parameter keys while retaining dictionary access for nonidentifier keys", () => {
    let state = ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 1));
    const params: ScriptWorkspaceState["params"] = [
      { id: "speed", label: "Speed", type: "number", description: "", defaultValue: "1" },
      { id: "enabled", label: "Enabled", type: "boolean", description: "", defaultValue: "true" },
      { id: "label", label: "Label", type: "string", description: "", defaultValue: "item" },
      { id: "item.speed", label: "Item speed", type: "number", description: "", defaultValue: "2" },
    ];
    for (const param of params) {
      const parsed = state.params.length;
      state = addScriptParam(state, param);
      expect(state.params).toHaveLength(parsed + 1);
    }
    const content = buildScriptTypeDeclarationFiles(state).find(file => file.path.endsWith("pangea-runtime.lua"))?.content ?? "";
    expect(content).toContain("---@field parameters ScriptItemParameters");
    expect(content).toContain("---@class ScriptItemParameters: table<string, string|number|boolean>");
    expect(content).toContain("---@field speed? number");
    expect(content).toContain("---@field enabled? boolean");
    expect(content).toContain("---@field label? string");
    expect(content).not.toContain("---@field item.speed");
  });

  it.each([Nanosaur2Globals, MightyMikeGlobals])("keeps native spawn aliases game scoped and numeric IDs numeric", globals => {
    const state = ensureScriptWorkspace({}, createScriptWorkspaceContext(globals, 1));
    const content = buildScriptTypeDeclarationFiles(state).find(file => file.path.endsWith("pangea-runtime.lua"))?.content ?? "";
    const game = SCRIPTING_CONTRACT.api.games.find(candidate => candidate.gameId === state.context.gameId);
    expect(game).toBeDefined();
    for (const spawn of game?.nativeSpawns ?? []) {
      const numeric = Number.isInteger(Number(spawn.id)) && String(Number(spawn.id)) === spawn.id;
      expect(content).toContain(`---| ${numeric ? spawn.id : JSON.stringify(spawn.id)} # ${spawn.label}:`);
      if (numeric) expect(content).not.toContain(`---| "${spawn.id}" #`);
    }
    expect(content).not.toContain('---| "ottomatic.teleporter" #');
  });
});
