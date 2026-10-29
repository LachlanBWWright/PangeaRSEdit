import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import { OttoGlobals } from "@/data/globals/globals";
import { compileScriptWorkspace, createScriptWorkspaceContext, loadScriptSample, updateCustomObjectDefinition } from "./scriptWorkspaceState";
import { setCustomPlacementParameter } from "./scriptObjectParameters";

const luaExecutable = process.env.PANGEA_LUA_EXECUTABLE;

describe.skipIf(!luaExecutable)("generated Lua placement parameters", () => {
  it.each(["explicit", "empty", "absent"])("executes lifecycle callbacks with %s definition identity and isolated parameter snapshots", (identity) => {
    const initial = loadScriptSample(createScriptWorkspaceContext(OttoGlobals, 0), "hover-beacon");
    const definition = initial.customObjects[0];
    const placement = initial.levels[initial.context.levelKey]?.customPlacements[0];
    expect(definition).toBeDefined();
    expect(placement).toBeDefined();
    if (!definition || !placement || !luaExecutable) return;
    const workspace = updateCustomObjectDefinition(initial, { ...definition, parameterDefinitions: [{ kind: "number", id: "health", label: "Health", defaultValue: 10, min: 1, max: 100 }] });
    const overridden = setCustomPlacementParameter(workspace, placement.id, "health", 30)._unsafeUnwrap();
    const compiled = compileScriptWorkspace(overridden)._unsafeUnwrap();
    const generated = compiled.compiledFiles["Data/Scripts/dist/main.lua"]?.content;
    expect(generated).toBeDefined();
    if (!generated) return;
    const objectType = identity === "explicit" ? "'native.actor'" : JSON.stringify(definition.id);
    const definitionId = identity === "explicit" ? JSON.stringify(definition.id) : identity === "empty" ? "''" : "nil";
    const lua = [
      "local entry, nextId, nested = nil, 0, false",
      "local parametersById = {}",
      "local pangea = { spawn = {}, object = {} }",
      "local states = {}",
      "function pangea.object.state(handle) local key = handle.id .. ':' .. handle.generation; states[key] = states[key] or {}; return states[key] end",
      "function pangea.spawn.scripted(id, position)",
      "  nextId = nextId + 1",
      "  local handle = { id = nextId, generation = 1 }",
      `  entry.onObjectFrame({ object = handle, objectType = ${objectType}, definitionId = ${definitionId}, event = 'spawn' })`,
      "  return handle",
      "end",
      "local behavior = {}",
      "function behavior.onSpawn(self, ctx)",
      `  if self.handle.id == 1 then assert(pangea.object.state(self.handle).__pangeaPlacementId == ${JSON.stringify(placement.id)}, 'placement identity missing before user callback') end`,
      "  parametersById[self.handle.id] = self.parameters.health",
      "  self.parameters.health = 999",
      `  if not nested then nested = true; pangea.spawn.scripted(${JSON.stringify(definition.id)}, {x=0,y=0,z=0}) end`,
      "end",
      "function behavior.onUpdate(self) parametersById[self.handle.id] = self.parameters.health end",
      `local module = { [${JSON.stringify(definition.exportName)}] = behavior }`,
      "local function require(name) if name == 'pangea' then return pangea end; return module end",
      "entry = (function()",
      generated,
      "end)()",
      `entry.onLevelStart({ levelNum = ${Number(initial.context.levelKey)} })`,
      "assert(nextId == 2, 'expected placement plus nested spawn')",
      "assert(parametersById[1] == 30, 'placement override was not delivered to spawn')",
      "assert(parametersById[2] == 10, 'nested same-type spawn inherited placement override')",
      `assert(states['1:1'].__pangeaPlacementLevel == ${JSON.stringify(initial.context.levelKey)}, 'placement level missing')`,
      "assert(states['2:1'] == nil or states['2:1'].__pangeaPlacementId == nil, 'nested dynamic spawn inherited placement identity')",
      `local function dispatch(id, event) entry.onObjectFrame({object={id=id,generation=1}, objectType=${objectType}, definitionId=${definitionId}, event=event}) end`,
      "dispatch(1, 'update'); dispatch(2, 'update')",
      "assert(parametersById[1] == 30 and parametersById[2] == 10, 'callback snapshot mutation leaked')",
      "dispatch(1, 'deactivate'); dispatch(1, 'activate'); dispatch(1, 'update')",
      "assert(parametersById[1] == 30, 'deactivation lost placement configuration')",
      "dispatch(1, 'destroy'); dispatch(1, 'update')",
      "assert(parametersById[1] == 10, 'destroy did not release parameters')",
      "local failures = {}",
      "pangea.log = { error = function(message) failures[#failures + 1] = message end }",
      "local spawn = pangea.spawn.scripted",
      "pangea.spawn.scripted = function() return nil end",
      `entry.onLevelStart({ levelNum = ${Number(initial.context.levelKey)} })`,
      "assert(#failures == 1, 'failed placement must produce exactly one diagnostic')",
      `assert(string.find(failures[1], ${JSON.stringify(placement.id)}, 1, true), 'failure omitted placement identity')`,
      `assert(string.find(failures[1], ${JSON.stringify(definition.id)}, 1, true), 'failure omitted definition identity')`,
      `assert(string.find(failures[1], ${JSON.stringify(`level ${initial.context.levelKey}`)}, 1, true), 'failure omitted level')`,
      "pangea.spawn.scripted = spawn",
      `entry.onLevelStart({ levelNum = ${Number(initial.context.levelKey)} })`,
      "assert(nextId == 3 and parametersById[3] == 30, 'failed placement corrupted the next spawn')",
      "assert(#failures == 1, 'successful placement produced a failure diagnostic')",
      "print('placement parameters verified')",
    ].join("\n");
    const directory = Result.fromThrowable(() => mkdtempSync(join(tmpdir(), "pangea-parameter-lua-")), String)()._unsafeUnwrap();
    const path = join(directory, "verify.lua");
    const written = Result.fromThrowable(() => writeFileSync(path, lua), String)();
    expect(written.isOk()).toBe(true);
    const execution = Result.fromThrowable(() => execFileSync(luaExecutable, [path], { encoding: "utf8" }), String)();
    Result.fromThrowable(() => rmSync(directory, { recursive: true, force: true }), String)();
    expect(execution.isOk() ? execution.value : execution.error).toContain("placement parameters verified");
  });
});
