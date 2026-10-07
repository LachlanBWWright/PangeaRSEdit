import { describe, expect, it } from "vitest";
import { Bugdom2Globals, CroMagGlobals, OttoGlobals } from "@/data/globals/globals";
import { createScriptWorkspaceContext, ensureScriptWorkspace } from "./scriptWorkspaceState";
import { createCustomObjectFromStarter } from "./scriptObjectStarters";
import { getOfflineScriptCompletions, getOfflineScriptHover, getOfflineScriptSignature } from "./scriptOfflineIntelligence";
import { findLuaCallSite } from "./scriptLuaCode";
import type { ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";

const state = ensureScriptWorkspace({}, createScriptWorkspaceContext(Bugdom2Globals, 1));
const sourcePath = "Data/Scripts/src/user.lua";

describe("offline Lua intelligence", () => {
  it("filters namespaces and replaces the complete partial-qualified token without duplicating it", () => {
    const source = "local x = pangea.object.setPos";
    const entries = getOfflineScriptCompletions(state, source, source.length, sourcePath);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((entry) => entry.label.startsWith("pangea.object.setPos"))).toBe(true);
    const entry = entries.find((candidate) => candidate.label === "pangea.object.setPosition");
    expect(entry).toBeDefined();
    if (!entry) return;
    expect(source.slice(0, entry.replaceStart) + entry.insertText + source.slice(entry.replaceEnd)).toBe("local x = pangea.object.setPosition(${1:handle}, ${2:position})");
    expect(getOfflineScriptCompletions(state, "unrelated.foo", 13, sourcePath)).toEqual([]);
  });

  it("offers native IDs only in the first native spawn argument, preserving an existing quote", () => {
    const quoted = 'pangea.spawn.native("bugdom2.';
    const entries = getOfflineScriptCompletions(state, quoted, quoted.length, sourcePath);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((entry) => entry.kind === "value" && entry.label.startsWith("bugdom2."))).toBe(true);
    const first = entries[0];
    if (!first) return;
    expect(quoted.slice(0, first.replaceStart) + first.insertText).toBe(`pangea.spawn.native("${first.label}"`);
    expect(getOfflineScriptCompletions(state, "pangea.spawn.native(1, ", 23, sourcePath).some((entry) => entry.kind === "value")).toBe(false);
    expect(getOfflineScriptCompletions(state, 'local value = "bugdom2.', 23, sourcePath)).toEqual([]);
  });

  it("uses the actual exported behavior variable and recognizes its typed item context", () => {
    const created = createCustomObjectFromStarter(state, "enemy", "Enemy");
    expect(created.isOk()).toBe(true);
    if (created.isErr()) return;
    const definition = created.value.customObjects[0];
    if (!definition) return;
    const file = created.value.sourceFiles[definition.sourceFilePath];
    if (!file) return;
    const source = `${file.content.replaceAll("item", "actor")}\nfunction actor.onSp`;
    const snippets = getOfflineScriptCompletions(created.value, source, source.length, definition.sourceFilePath);
    const spawn = snippets.find((entry) => entry.label === "actor.onSpawn");
    expect(spawn?.insertText).toBe("actor.onSpawn(self, ctx)\n  $0\nend");
    const context = `${file.content}\nfunction item.onUpdate(self, ctx)\n  if true then\n    ctx.del`;
    expect(getOfflineScriptCompletions(created.value, context, context.length, definition.sourceFilePath).map((entry) => entry.label)).toEqual(["ctx.deltaSeconds"]);
    const self = `${file.content}\nfunction item.onUpdate(self, ctx)\n self.h`;
    expect(getOfflineScriptCompletions(created.value, self, self.length, definition.sourceFilePath).map((entry) => entry.label)).toEqual(["self.handle"]);
    const parameterSource = `${file.content}\nfunction item.onUpdate(self, ctx)\n self.parameters.speed`;
    const parameterState: ScriptWorkspaceState = { ...created.value, params: [{ id: "speed", label: "Speed", type: "number", description: "Travel speed", defaultValue: "10" }] };
    const parameter = getOfflineScriptCompletions(parameterState, parameterSource, parameterSource.length, definition.sourceFilePath).find((entry) => entry.label === "self.parameters.speed");
    expect(parameter?.detail).toBe("number|nil");
    expect(parameter?.documentation).toContain("Configure or bind this parameter");
  });

  it("ignores commas and parentheses inside strings, comments and nested tables over multiple lines", () => {
    const source = 'pangea.spawn.native(\n "bugdom2.flower",\n { x = math.max(1, 2), y = 0, z = 0 }, -- comma, )\n { label = [=[a, )]=], values = { 1, 2 } },\n ';
    expect(findLuaCallSite(source, source.length)).toEqual({ name: "pangea.spawn.native", activeParameter: 3, argumentStart: source.lastIndexOf(",") + 1 });
    expect(getOfflineScriptSignature(state, source, source.length)?.api.name).toBe("pangea.spawn.native");
    const nested = "pangea.object.setPosition(handle, math.max(1, ";
    expect(getOfflineScriptSignature(state, nested, nested.length)).toBeNull();
  });

  it("hovers exact API tokens and rejects prefix collisions, strings and comments", () => {
    const source = "local x = pangea.object.setPosition(handle, position)";
    const hover = getOfflineScriptHover(state, source, source.indexOf("setPosition") + 3);
    expect(hover?.api.name).toBe("pangea.object.setPosition");
    expect(source.slice(hover?.start, hover?.end)).toBe("pangea.object.setPosition");
    expect(getOfflineScriptHover(state, "pangea.object.setPositionExtra", 15)).toBeNull();
    expect(getOfflineScriptHover(state, '"pangea.object.setPosition"', 15)).toBeNull();
    expect(getOfflineScriptHover(state, "-- pangea.object.setPosition", 15)).toBeNull();
  });

  it("ignores anonymous function body commas and suppresses comments even before a newline", () => {
    const source = "pangea.timer.after(1, function()\n if true then return 1, 2 end\nend, ";
    expect(findLuaCallSite(source, source.length)?.activeParameter).toBe(2);
    const commented = "-- pangea.object.setPos\n";
    expect(getOfflineScriptCompletions(state, commented, commented.length - 1, sourcePath)).toEqual([]);
    const string = "local s = [==[pangea.object.setPos]==]";
    expect(getOfflineScriptCompletions(state, string, string.indexOf("setPos") + 6, sourcePath)).toEqual([]);
  });

  it("filters completion, signature and hover by the selected game's supported APIs", () => {
    const source = "pangea.player.raceResults";
    const racing = ensureScriptWorkspace({}, createScriptWorkspaceContext(CroMagGlobals, 1));
    expect(getOfflineScriptCompletions(state, source, source.length, sourcePath)).toEqual([]);
    expect(getOfflineScriptCompletions(racing, source, source.length, sourcePath).map((entry) => entry.label)).toContain(source);
    expect(getOfflineScriptHover(state, source, 15)).toBeNull();
    expect(getOfflineScriptHover(racing, source, 15)?.api.name).toBe(source);
    expect(getOfflineScriptSignature(state, `${source}(`, source.length + 1)).toBeNull();
    expect(getOfflineScriptSignature(racing, `${source}(`, source.length + 1)?.api.name).toBe(source);
  });

  it("adds hooks only to the actual exported table and ignores undeclared module names", () => {
    const source = "local behaviorTable = {}\nreturn behaviorTable\nfunction behaviorTable.onFr";
    const entries = getOfflineScriptCompletions(state, source, source.length, sourcePath);
    expect(entries.find((entry) => entry.label === "onFrame")?.insertText).toBe("behaviorTable.onFrame(ctx)\n  $0\nend");
    expect(getOfflineScriptCompletions(state, "module.onFr", 11, sourcePath)).toEqual([]);
    const undeclared = "return module\nmodule.onFr";
    expect(getOfflineScriptCompletions(state, undeclared, undeclared.length, sourcePath)).toEqual([]);
    const decoy = '-- local module = {}\n-- return module\nlocal text = "return module"\nonFr';
    expect(getOfflineScriptCompletions(state, decoy, decoy.length, sourcePath)).toEqual([]);
    const member = "local module = {}\nreturn module.behavior\nonFr";
    expect(getOfflineScriptCompletions(state, member, member.length, sourcePath)).toEqual([]);
  });

  it("includes game-specific context fields in global hook bodies", () => {
    const otto = ensureScriptWorkspace({}, createScriptWorkspaceContext(OttoGlobals, 1));
    const source = "local behaviorTable = {}\nfunction behaviorTable.onFrame(ctx)\n ctx.playerM";
    const entries = getOfflineScriptCompletions(otto, source, source.length, sourcePath);
    expect(entries.map((entry) => entry.label)).toEqual(["ctx.playerMode"]);
    expect(entries[0]?.detail).toBe("string|nil");
  });
});
