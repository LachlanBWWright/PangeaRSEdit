local p = require("pangea")
local entry = {}
local port, original, away, awaySpawned, phase, frames = nil, nil, nil, nil, "starting", 0

local function move(position)
  local ground = assert(p.world.sampleTerrain(position.x, position.z))
  assert(p.object.setPosition(port, {x=position.x,y=ground.height,z=position.z}))
end

function entry.onFrame(ctx)
  if ctx.levelNum ~= 0 then return end
  p.player.setHealthResult(0, 1)
  if not port then
    for _, handle in ipairs(p.object.all()) do
      if p.object.type(handle) == "custom.brain-port" then port = handle; break end
    end
    if not port then return end
    original = assert(p.object.position(port))
    local playerHandle = assert(p.object.findByTag("player")[1])
    assert(p.object.setScriptControlledResult(playerHandle, true).ok)
  end
  assert(p.object.exists(port), "sample port vanished while leaving its spawn range")
  local state = p.object.state(port)
  if phase == "starting" and (state.spawned or 0) >= 3 then
    assert(p.object.delete(state.children[1]))
    phase = "replenishing"
  elseif phase == "replenishing" and state.spawned >= 4 then
    local position = assert(p.object.position(port))
    away = {x=position.x+5000,z=position.z}
    move(away)
    phase, frames = "away", 0
  elseif phase == "away" then
    move(away)
    frames = frames + 1
    if frames == 10 then
      awaySpawned = state.spawned
      assert(p.object.delete(state.children[1]))
    end
    if frames > 90 then
      local current = p.player.get(0).position
      local anchor = p.object.position(port)
      assert(state.spawned == awaySpawned, "sample kept spawning outside player range: timer " .. tostring(state.playerDistance) .. " current " .. tostring(current.x-anchor.x))
      assert(state.status == "waiting-for-player", "sample did not pause when a spawn slot was free: " .. tostring(state.status))
      move(original)
      phase = "returning"
    end
  elseif phase == "returning" then
    move(original)
    if state.spawned >= 5 then
      state.persistentPort = true
      state.replenished = true
      state.rangePaused = true
      phase = "complete"
    end
  end
  state.proofPhase = phase
end

return entry
