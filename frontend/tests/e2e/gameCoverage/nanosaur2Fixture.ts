import { routeRuntimeCallbacks } from "../runtimeScriptLifecycle";

export function nanosaur2CoverageScript(generation: number, players: number) {
  return routeRuntimeCallbacks(`local pangea = require("pangea")
local entry = {}
local marker
local deaths, respawns, pickups, frame = 0, 0, 0, 0
local pickupId = ""
function entry.onDeath(ctx)
  assert(ctx.playerNum == 0, "death crossed local player boundary")
  assert(pangea.player.get(0).dead, "Lua death callback preceded native death")
  deaths=deaths+1
end
function entry.onPlayerRespawn(ctx)
  assert(ctx.playerNum == 0, "respawn crossed local player boundary")
  assert(not pangea.player.get(0).dead, "Lua respawn callback preceded native reset")
  respawns=respawns+1
end
function entry.onPickupCollected(ctx)
  assert(ctx.playerNum == 0 and ctx.amount > 0, "invalid pickup player or amount")
  pickups=pickups+1; pickupId=ctx.pickupId
  return {handled=true, consumePickup=ctx.pickupId ~= "nanosaur2.freeLifePow", healthDelta=0.25, scoreDelta=0}
end
function entry.onFrame(ctx)
  frame=frame+1
  if not marker then
    marker=assert(pangea.spawn.scripted("reload-probe", pangea.player.get(0).position))
    assert(pangea.player.setState(0, "fuel", 0.375).ok, "player zero fuel rejected")
    ${players === 2 ? `assert(pangea.player.count() == 2 and not ctx.networked, "not offline two-player")
    assert(pangea.player.setState(1, "fuel", 0.625).ok, "second player fuel rejected")
    assert(pangea.player.getState(0, "fuel") == 0.375, "second player state modified first")` : ""}
    local invalid=pangea.player.setState(${players}, "fuel", 0.9)
    assert(not invalid.ok, "nonexistent player accepted")
    local invalidMode=pangea.player.fire(0, {mode="coverage-invalid"})
    assert(not invalidMode.ok, "invalid fire mode accepted")
  end
  local state=pangea.object.state(marker)
  state.generation=${generation}; state.frames=frame
  state.deaths=deaths; state.respawns=respawns
  state.pickups=pickups; state.pickupId=pickupId
  state.fuel0=pangea.player.getState(0, "fuel")
  state.dead0=pangea.player.get(0).dead
  ${players === 2 ? `state.fuel1=pangea.player.getState(1, "fuel")
  state.dead1=pangea.player.get(1).dead` : ""}
end
return entry
`);
}
