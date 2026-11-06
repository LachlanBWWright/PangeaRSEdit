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
local pangea = { object = {}, player = {}, world = {}, level = {}, events = {}, log = {}, time = {}, spawn = {} }
local timers, nextTimer, children = {}, 0, {}
function pangea.log.info() end
function pangea.time.every(interval, callback)
  nextTimer = nextTimer + 1; timers[nextTimer] = callback; return nextTimer
end
function pangea.time.cancel(id) timers[id] = nil end
local function tick()
  for id, callback in pairs(timers) do callback() end
end
function pangea.object.exists(handle) return not handle.deleted end
function pangea.object.lifeState(handle) return handle.deleted and 'removed' or 'alive' end
function pangea.object.capabilities() return {opacity=true} end
function pangea.object.geometry() return {groundOffset={y=0}} end
function pangea.object.acquireControl(handle)
  handle.token=1; command('control',true); return {ok=true,token=1}
end
function pangea.object.hasControl(handle,token) return handle.token==token end
function pangea.object.releaseControl(handle,token)
  handle.token=nil; handle.opacity=1; return command('control',false)
end
function pangea.spawn.nativeResult(kind, location)
  assert(kind == 'ottomatic.brainAlien')
  values.spawnPositions = values.spawnPositions or {}
  values.spawnPositions[#values.spawnPositions + 1] = {x = location.x, z = location.z}
  local child = {id = #children + 2, generation = 1}
  children[#children + 1] = child
  return {ok = true, primary = child}
end
function pangea.log.warn(message) error(message) end
function pangea.object.state(handle)
  if handle.id == 1 then return state end
  handle.state = handle.state or {}; return handle.state
end
function pangea.object.position() return {x = position.x, y = position.y, z = position.z} end
function pangea.object.bounds() return {min={y=position.y}} end
function pangea.object.type(other) return other.type end
function pangea.object.setScriptControlledResult(handle, value) return command('control', value) end
function pangea.object.setHealthResult(handle, value) return command('health', value) end
function pangea.object.setDamageResult(handle, value) return command('damage', value) end
function pangea.object.setOpacityResult(handle, value) handle.opacity = value; return command('opacity', value) end
function pangea.object.setAnimationResult(handle, value) return command('animation', value) end
function pangea.object.setRotationResult(handle, value) return command('rotation', value) end
function pangea.object.setPositionResult(handle, value)
  position = value
  return command('position', value)
end
function pangea.object.moveKinematic(handle, delta, category)
  assert(category == 'solid')
  return command('move', delta)
end
function pangea.object.deleteResult(handle) handle.deleted = true; return command('delete') end
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
  { id: "spawner", assertions: `
self.parameters.quota = 0
self.parameters.maxAlive = 1
object.onSpawn(self, {levelNum = 0})
for i = 1, 20 do
  tick()
  assert(state.spawned == i, 'unlimited spawner must replenish beyond three aliens')
  assert(not state.completed)
  local location = values.spawnPositions[i]
  assert(location.x * location.x + location.z * location.z <= 450 * 450 + 1, 'spawn points must stay near the port')
  children[i].deleted = true
end
player.position.x = 10000
tick()
assert(state.spawned == 20, 'distant players must not trigger spawning')
player.position.x = 1000
tick()
assert(state.spawned == 21, 'returning must resume the same spawner')
object.onDestroy(self, {})
assert(next(timers) == nil and children[21].deleted)
` },
  { id: "spawner", assertions: `
object.onSpawn(self, {levelNum = 0})
assert(values.health == 2 and values.damage == 0, 'port must be damageable without contact damage')
tick()
assert(children[1].opacity == 0, 'arrival starts transparent')
object.onUpdate(self, {deltaSeconds = 0.6})
assert(children[1].opacity == 0.5 and values.control == true)
object.onUpdate(self, {deltaSeconds = 0.6})
assert(children[1].opacity == 1 and values.control == false, 'native AI resumes after arrival')
assert(#state.arrivals == 0)
object.onDestroy(self, {})
assert(children[1].deleted and next(timers) == nil)
` },
  { id: "spawner", assertions: `
self.parameters.quota = 3
object.onSpawn(self, {levelNum = 0})
object.onActivate(self, {levelNum = 0})
object.onStreamIn(self, {levelNum = 0})
assert(nextTimer == 1, 'activation must not duplicate timers')
self.parameters.maxAlive = 1
tick(); tick()
assert(state.spawned == 1, 'living quota must prevent another alien')
assert(children[1].state.origin == 'independent-brain-port')
children[1].deleted = true
tick()
assert(state.spawned == 2)
object.onCheckpointReset(self, {levelNum = 0})
assert(state.spawned == 2, 'preserve must retain progress')
children[2].deleted = true
tick()
assert(state.completed and state.spawned == 3 and next(timers) == nil, 'quota must stop timer')
object.onCheckpointReset(self, {levelNum = 0})
assert(next(timers) == nil, 'completed preserve must remain stopped')
self.parameters.checkpointPolicy = 'restart'
object.onCheckpointReset(self, {levelNum = 0})
assert(state.spawned == 0 and children[3].deleted and next(timers) ~= nil)
tick()
assert(state.spawned == 1)
object.onDestroy(self, {})
assert(children[4].deleted and next(timers) == nil, 'destroy must clean owned aliens and timer')
state = {}
object.onActivate(self, {levelNum = 0})
tick()
assert(state.spawned == 1, 'reactivation after cleared state must restart')
object.onDeactivate(self, {})
assert(children[5].deleted and next(timers) == nil)
state = {}; self.parameters.checkpointPolicy = 'preserve'; self.parameters.maxAlive = 3
object.onSpawn(self, {levelNum = 0})
tick()
local baselineChild = state.children[1]
local baselineTimer = state.timer
tick()
local postCheckpointChild = state.children[2]
assert(postCheckpointChild and not postCheckpointChild.deleted)
state = {spawned = 1, children = {baselineChild}, timer = baselineTimer}
object.onCheckpointReset(self, {levelNum = 0})
assert(postCheckpointChild.deleted and not baselineChild.deleted, 'preserve must remove aliens created after snapshot')
tick()
local replacementChild = state.children[2]
state = {spawned = 1, children = {baselineChild}, timer = state.timer}
self.parameters.checkpointPolicy = 'restart'
object.onCheckpointReset(self, {levelNum = 0})
assert(baselineChild.deleted and replacementChild.deleted, 'restart must remove both baseline and later aliens')
assert(state.spawned == 0)
` },
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
