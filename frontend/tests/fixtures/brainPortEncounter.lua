local p = require("pangea")
local entry = {}
local marker, origin, fast, slow, oldFast, oldSlow, oldChildren
local phase, frames, resets, phaseFrames = "starting", 0, 0, 0
local beforeFast, beforeSlow, slowAtDelete
local proofs = {}

local function ports()
  local found = {}
  for _, handle in ipairs(p.object.all()) do
    if p.object.type(handle) == "custom.brain-port" then
      found[p.object.state(handle).__pangeaPlacementId] = handle
    end
  end
  return found["port-fast"], found["port-slow"]
end

local function movePlayer(position)
  local ground = assert(p.world.sampleTerrain(position.x, position.z))
  assert(p.player.setPosition(0, {x=position.x,y=ground.height+400,z=position.z}))
  assert(p.player.setVelocity(0, {x=0,y=0,z=0}))
end

local function advance(nextPhase)
  phase = nextPhase
  phaseFrames = 0
end

function entry.onPlayerRespawn(ctx)
  resets = resets + 1
  if phase == "checkpoint-ready" then advance("checkpoint-resumed") end
end

function entry.onFrame(ctx)
  if ctx.levelNum ~= 0 then return end
  frames = frames + 1
  phaseFrames = phaseFrames + 1
  local player = assert(p.player.get(0))
  if not marker then
    marker = assert(p.spawn.scripted("custom.encounter-observer", player.position))
    origin = {x=player.position.x,z=player.position.z}
  end
  fast, slow = ports()
  if phase == "starting" and fast and slow then
    local a, b = p.object.state(fast), p.object.state(slow)
    if a.spawned >= 2 and b.spawned >= 1 then
      assert(a.spawned > b.spawned, "per-placement intervals did not differ")
      beforeFast, beforeSlow = a.spawned, b.spawned
      assert(p.object.captureCheckpoint(fast) and p.object.captureCheckpoint(slow))
      proofs.independentOverrides = true
      advance("checkpoint-ready")
    end
  elseif phase == "checkpoint-resumed" then
    assert(fast and slow, "checkpoint lost placed objects")
    assert(p.object.state(fast).spawned == 0, "restart policy retained old quota")
    assert(p.object.state(slow).spawned == beforeSlow, "preserve policy lost checkpoint quota")
    proofs.checkpointRestart, proofs.checkpointPreserve = true, true
    advance("waiting-for-restarted-timers")
  elseif phase == "waiting-for-restarted-timers" then
    if fast and slow and p.object.state(fast).spawned > 0 and p.object.state(slow).spawned > beforeSlow then
      proofs.timersRestarted = true
      oldFast, oldSlow = fast, slow
      oldChildren = {}
      for _, parent in ipairs({fast,slow}) do
        for _, child in ipairs(p.object.state(parent).children) do oldChildren[#oldChildren+1] = child end
      end
      advance("leaving")
    end
  elseif phase == "leaving" then
    movePlayer({x=origin.x+6000,z=origin.z})
    if not fast and not slow and phaseFrames > 5 then
      assert(not p.object.exists(oldFast) and not p.object.exists(oldSlow), "distant ports survived")
      for _, child in ipairs(oldChildren) do assert(not p.object.exists(child), "distant port leaked child") end
      proofs.leftArea = true
      advance("returning")
    end
  elseif phase == "returning" then
    movePlayer(origin)
    if fast and slow then
      assert(fast.id ~= oldFast.id or fast.generation ~= oldFast.generation, "fast handle was not invalidated")
      assert(slow.id ~= oldSlow.id or slow.generation ~= oldSlow.generation, "slow handle was not invalidated")
      proofs.freshHandles = true
      advance("waiting-for-reentry-spawns")
    end
  elseif phase == "waiting-for-reentry-spawns" then
    if fast and slow and p.object.state(fast).spawned >= 2 and p.object.state(slow).spawned >= 1 then
      assert(p.object.state(fast).spawned > p.object.state(slow).spawned, "reentry lost interval overrides")
      oldFast = fast
      oldChildren = p.object.state(fast).children
      slowAtDelete = p.object.state(slow).spawned
      assert(p.object.delete(fast), "delete first port failed")
      advance("waiting-for-independent-port")
    end
  elseif phase == "waiting-for-independent-port" then
    assert(not fast and not p.object.exists(oldFast), "deleted port respawned while player remained nearby")
    for _, child in ipairs(oldChildren) do assert(not p.object.exists(child), "deleted port leaked child") end
    assert(slow, "deleting first port deleted second port")
    if p.object.state(slow).spawned > slowAtDelete then
      proofs.deletionIsolated = true
      assert(p.object.delete(slow), "second port cleanup failed")
      advance("cleaning-up")
    end
  elseif phase == "cleaning-up" and not fast and not slow then
    proofs.cleaned = true
    advance("complete")
  end
  local state = p.object.state(marker)
  state.phase, state.frames, state.resets = phase, frames, resets
  state.beforeFast, state.beforeSlow = beforeFast, beforeSlow
  for key, value in pairs(proofs) do state[key] = value end
end

return entry
