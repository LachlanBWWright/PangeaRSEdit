import { routeRuntimeCallbacks } from "../runtimeScriptLifecycle";

export const ottoCheckpointScript = routeRuntimeCallbacks(`local pangea = require("pangea")
local entry = {}
local marker, ticksAtReset, tasksAtReset, eventsAtReset
local timers, tasks, events, resets, deaths, respawns, frame = 0, 0, 0, 0, 0, 0, 0
local lastRespawnFrame = 0
local respawnX, respawnZ, deathX, deathZ
local displaced = false
function entry.onObjectFrame(ctx)
  if ctx.objectType ~= "reload-probe" then return end
  local state = pangea.object.state(ctx.object)
  if ctx.event == "spawn" then
    state.checkpointValue = "baseline"
    pangea.time.every(0.01, function() timers=timers+1 end)
    pangea.task.start(function()
      while true do tasks=tasks+1; pangea.task.wait(0.01) end
    end)
    pangea.events.on("otto-checkpoint-owned", function() events=events+1 end)
  elseif ctx.event == "checkpointReset" then
    resets=resets+1
    assert(state.checkpointValue == "baseline", "checkpoint did not restore object state")
    ticksAtReset=timers; tasksAtReset=tasks; eventsAtReset=events
  end
end
function entry.onDeath(ctx)
  assert(ctx.playerNum == 0, "wrong death player")
  local player = assert(pangea.player.get(0))
  assert(player.dead and player.health == 0, "death callback preceded native death state")
  deathX=player.position.x; deathZ=player.position.z
  deaths=deaths+1
end
function entry.onPlayerRespawn(ctx)
  assert(ctx.playerNum == 0, "wrong respawn player")
  local player = assert(pangea.player.get(0))
  assert(not player.dead and player.health == 1, "respawn callback preceded native recovery")
  assert(player.collisionEnabled, "respawn left collision disabled")
  assert(player.velocity.x == 0 and player.velocity.y == 0 and player.velocity.z == 0, "respawn retained velocity")
  if respawnX then
    assert(player.position.x == respawnX and player.position.z == respawnZ, "checkpoint position drifted")
    assert(math.abs(deathX-respawnX) > 400, "player was not displaced before native reset")
  end
  respawnX=player.position.x; respawnZ=player.position.z
  assert(math.abs(player.fuel-0.37) < 0.001, "native respawn lost fuel")
  assert(pangea.persistence.get("otto-checkpoint-coverage", 1) == "durable", "checkpoint lost persistence")
  assert(resets == deaths, "native checkpoint callback count differs from deaths")
  respawns=respawns+1; lastRespawnFrame=frame; displaced=false
  pangea.object.state(marker).checkpointValue="modified-after-reset"
end
function entry.onFrame(ctx)
  frame=frame+1
  pangea.events.emit("otto-checkpoint-owned", {})
  local player = assert(pangea.player.get(0))
  if not marker then
    assert(pangea.player.setState(0, "fuel", 0.37).ok, "fuel setup failed")
    assert(pangea.persistence.set("otto-checkpoint-coverage", 1, "durable"), "persistence setup failed")
    marker=assert(pangea.spawn.scripted("reload-probe", player.position), "marker spawn failed")
  end
  if resets > 0 then
    assert(timers == ticksAtReset and tasks == tasksAtReset and events == eventsAtReset, "checkpoint leaked owned work")
  end
  if respawns > 0 and frame-lastRespawnFrame > 30 then
    displaced=math.abs(player.position.x-respawnX) > 400
    local terrain=assert(pangea.world.sampleTerrain(respawnX+600, respawnZ), "displacement terrain missing")
    assert(pangea.player.setPosition(0, {x=respawnX+600,y=terrain.height+600,z=respawnZ}), "displacement failed")
    assert(pangea.player.setVelocity(0, {x=0,y=0,z=0}), "stop failed")
    displaced=true
  end
  local state=pangea.object.state(marker)
  state.frames=frame; state.deaths=deaths; state.respawns=respawns; state.resets=resets
  state.timers=timers; state.tasks=tasks; state.events=events
  state.ticksAtReset=ticksAtReset; state.tasksAtReset=tasksAtReset; state.eventsAtReset=eventsAtReset
  state.displaced=displaced; state.respawnX=respawnX; state.respawnZ=respawnZ
end
return entry
`);
