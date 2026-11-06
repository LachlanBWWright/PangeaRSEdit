local p = require("pangea")
local helpers = require("helpers.sample")
local entry, session = {}, helpers.create("nanosaur2-interception")
local settings = {seconds=45, gates=3, spacing=1600, radius=450, interceptors=2}
local gates, drones, origin, phase, progress, remaining = {}, {}, nil, "waiting", 0, settings.seconds

local function reset()
  session:clear()
  gates, drones, origin, phase, progress, remaining = {}, {}, nil, "waiting", 0, settings.seconds
end

local function gate(point)
  local handle = session:spawn("marker", point)
  if handle then p.object.setScaleResult(handle, 4) end
  return {handle=handle, point=point}
end

local function intercept(player)
  for index = 1, settings.interceptors do
    local point = helpers.offset(player.position, index == 1 and -700 or 700, 250, -1000)
    local terrain = p.world.sampleTerrain(point.x, point.z)
    if terrain then point.y = math.max(point.y, terrain.height+500) end
    local handle = session:spawn("target", point)
    if handle then
      p.object.setDamageResult(handle, 0.15)
      if not session.group:control(handle).ok then session:fail("Drone controller unavailable"); return end
      drones[#drones+1] = handle
    end
  end
end

local function finish(nextPhase)
  phase = nextPhase
  for _, handle in ipairs(drones) do session:remove(handle) end
  for _, checkpoint in ipairs(gates) do session:remove(checkpoint.handle) end
  session:status(phase, math.max(0, progress-1))
end

function entry.onFrame(ctx)
  local player = p.player.get(0)
  if not player or player.dead then return end
  local ready, fresh = session:begin(player)
  if not ready then return end
  if fresh then
    origin = helpers.offset(player.position, 0, 300, -800)
    for index = 0, settings.gates do
      local point = helpers.offset(origin, math.sin(index)*500, 0, -index*settings.spacing)
      local terrain = p.world.sampleTerrain(point.x, point.z)
      if terrain then point.y = math.max(point.y, terrain.height+700) end
      gates[index+1] = gate(point)
    end
    session:objective("Fly into the first marker to start interception", 0, settings.gates)
  end
  if session.failed or phase == "complete" or phase == "failed" then return end
  local nextGate = gates[progress+1]
  if phase == "escaping" then
    for _, handle in ipairs(drones) do
      if p.object.lifeState(handle) == "dead" then session:remove(handle)
      elseif p.object.exists(handle) then
        local point = p.object.position(handle)
        local distance = helpers.distance(point, player.position)
        local step = math.min(distance, 500*math.min(ctx.deltaSeconds, 0.1))
        if distance > 1 then session:move(handle, {
          x=point.x+(player.position.x-point.x)/distance*step,
          y=point.y+(player.position.y-point.y)/distance*step,
          z=point.z+(player.position.z-point.z)/distance*step}) end
      end
    end
    remaining = remaining-math.min(ctx.deltaSeconds, 0.1)
    session:clock("Escape checkpoints", remaining, progress-1, settings.gates)
    if remaining <= 0 then
      finish("failed")
      session:objective("Escape timed out — respawn to retry", progress-1, settings.gates)
      return
    end
  end
  if not nextGate or helpers.distance(player.position, nextGate.point) > settings.radius then return end
  session:remove(nextGate.handle)
  progress = progress+1
  if phase == "waiting" then phase = "escaping"; intercept(player) end
  if progress == settings.gates+1 then finish("complete") end
  session:status(phase, progress-1)
  session:objective(phase == "complete" and "Interception escaped" or "Escape checkpoints — 45 seconds", progress-1, settings.gates)
end

entry.onLevelStart, entry.onLevelUnload, entry.onPlayerRespawn = reset, reset, reset
return entry
