import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Result } from "neverthrow";
import { describe, expect, it } from "vitest";
import { OTTO_OBJECT_STARTERS, ottoStarterDefaults } from "./scriptOttoObjectStarters";

const luaExecutable = process.env.PANGEA_LUA_EXECUTABLE;
const prelude = `
local calls, values, state = {}, {}, {}
local position = { x = 0, y = 0, z = 0 }
local player = { position = { x = 1000, y = 0, z = 0 }, health = 0.5, fuel = 0.5, score = 10 }
local function command(name, value)
  calls[name] = (calls[name] or 0) + 1
  values[name] = value
  return { ok = true }
end
local pangea = { object = {}, player = {}, world = {}, level = {}, events = {}, log = {} }
function pangea.log.warn(message) error(message) end
function pangea.object.state() return state end
function pangea.object.position() return position end
function pangea.object.type(other) return other.type end
function pangea.object.setScriptControlledResult(handle, value) return command('control', value) end
function pangea.object.setHealthResult(handle, value) return command('health', value) end
function pangea.object.setDamageResult(handle, value) return command('damage', value) end
function pangea.object.setRotationResult(handle, value) return command('rotation', value) end
function pangea.object.setPositionResult(handle, value)
  position = value
  return command('position', value)
end
function pangea.object.moveKinematic(handle, delta, category)
  assert(category == 'solid')
  return command('move', delta)
end
function pangea.object.deleteResult() return command('delete') end
function pangea.player.get(index) assert(index == 0); return player end
function pangea.player.healResult(index, amount) return command('heal', amount) end
function pangea.player.setScoreResult(index, score) return command('score', score) end
function pangea.player.setState(index, key, amount) assert(key == 'fuel'); return command('fuel', amount) end
function pangea.world.sampleTerrain(x, z) return { height = 50 } end
function pangea.level.complete(index, success) assert(index == 0 and success); return command('complete') end
function pangea.events.emit(name, payload) assert(name == 'custom.trigger' and payload.playerNum == 0); return command('event') end
local function require(name) assert(name == 'pangea'); return pangea end
`;

const cases = [
  { id: "enemy", assertions: `
object.onSpawn(self, { levelTimeSeconds = 10 })
assert(values.health == 1 and values.damage == 0.1 and values.control == true)
object.onUpdate(self, { deltaSeconds = 0.1 })
assert(values.move.x == 15 and values.move.y == 50 and values.move.z == 0)
assert(calls.rotation == 1)
player.dead = true
object.onUpdate(self, { deltaSeconds = 0.1 })
assert(calls.move == 1, 'dead player should not be chased')
` },
  { id: "pickup", assertions: `
for _, reward in ipairs({'health', 'fuel', 'score'}) do
  state = {}
  self.parameters.reward = reward
  object.onTriggerEnter(self, {other = {type = 'other'}})
  assert(not state.collected)
  local before = calls.delete or 0
  object.onTriggerEnter(self, {other = {type = 'ottomatic.player'}})
  object.onTriggerEnter(self, {other = {type = 'ottomatic.player'}})
  assert(calls.delete == before + 1, 'pickup collected more than once')
end
assert(values.heal == 0.25 and values.fuel == 0.75 and values.score == 110)
` },
  { id: "trigger", assertions: `
object.onTriggerEnter(self, {other = {type = 'other'}})
assert(not calls.event)
object.onTriggerEnter(self, {other = {type = 'ottomatic.player'}})
object.onTriggerEnter(self, {other = {type = 'ottomatic.player'}})
assert(calls.event == 1)
state = {}; self.parameters.action = 'completeLevel'
object.onTriggerEnter(self, {other = {type = 'ottomatic.player'}})
assert(calls.complete == 1)
self.parameters.once = false
object.onTriggerEnter(self, {other = {type = 'ottomatic.player'}})
assert(calls.complete == 2)
` },
  { id: "platform", assertions: `
position = { x = 300, y = 400, z = 500 }
object.onSpawn(self, {levelTimeSeconds = 10})
object.onUpdate(self, {levelTimeSeconds = 11})
assert(values.control == true)
assert(values.position.x == 300 and values.position.z == 500 and values.position.y == 600)
self.parameters.axis = 'x'
object.onUpdate(self, {levelTimeSeconds = 11})
assert(values.position.x == 500 and values.position.y == 400 and values.position.z == 500)
self.parameters.axis = 'z'
object.onUpdate(self, {levelTimeSeconds = 11})
assert(values.position.x == 300 and values.position.y == 400 and values.position.z == 700)
object.onUpdate(self, {levelTimeSeconds = 13})
assert(values.position.x == 300 and values.position.y == 400 and values.position.z == 300)
object.onUpdate(self, {levelTimeSeconds = 14})
assert(math.abs(values.position.z - 500) < 0.001, 'platform movement must stay anchored to its spawn position')
` },
];

describe.skipIf(!luaExecutable)("Otto starter Lua execution", () => {
  it.each(cases)("executes the $id controller and its configurable actions", ({ id, assertions }) => {
    if (!luaExecutable) return;
    const starter = OTTO_OBJECT_STARTERS.find((entry) => entry.id === `otto.custom.${id}`);
    expect(starter).toBeDefined();
    if (!starter) return;
    const defaults = ottoStarterDefaults(starter.id)?.parameterDefinitions ?? [];
    const parameters = defaults.map((parameter) => `${parameter.id} = ${JSON.stringify(parameter.defaultValue)}`).join(", ");
    const source = [prelude, "local module = (function()", starter.template, "end)()", "local object = module.__PANGEA_CUSTOM_OBJECT_EXPORT__", `local self = { handle = { id = 1, generation = 1 }, parameters = { ${parameters} } }`, assertions, "print('starter verified')"].join("\n");
    const directory = Result.fromThrowable(() => mkdtempSync(join(tmpdir(), "pangea-starter-lua-")), String)();
    expect(directory.isOk()).toBe(true);
    if (directory.isErr()) return;
    const path = join(directory.value, "verify.lua");
    const write = Result.fromThrowable(() => writeFileSync(path, source), String)();
    expect(write.isOk()).toBe(true);
    const execution = write.andThen(() => Result.fromThrowable(() => execFileSync(luaExecutable, [path], { encoding: "utf8" }), String)());
    Result.fromThrowable(() => rmSync(directory.value, { recursive: true, force: true }), String)();
    expect(execution.isOk() ? execution.value : execution.error).toContain("starter verified");
  });
});
