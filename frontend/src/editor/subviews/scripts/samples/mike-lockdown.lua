local p = require("pangea")
local helpers = require("helpers.sample")
local entry, session = {}, helpers.create("mike-lockdown", true)
local settings = {waves=2, enemies=2, switchRadius=28, hazardTravel=48}
local switches, enemies, gate, hazard, origin, elapsed, wave, phase = {}, {}, nil, nil, nil, 0, 0, "switch"

local function reset()
  session:clear()
  switches, enemies, gate, hazard, origin, elapsed, wave, phase = {}, {}, nil, nil, nil, 0, 0, "switch"
end

local function clearPoint(point)
  local tile = p.world.sampleTile(point.x, point.y)
  return tile and not tile.solid
end

local function initialize(player)
  origin = player.position
  for index = 1, settings.waves do
    local point = helpers.offset(origin, index*64, 0, 0)
    if not clearPoint(point) then session:fail("Switch route crosses solid tiles"); return end
    switches[index] = {handle=session:spawn("marker", point), point=point}
  end
  gate = session:spawn("gate", helpers.offset(origin, 200, 0, 0))
  hazard = session:spawn("platform", helpers.offset(origin, 96, 48, 0))
  if not hazard or not session.group:control(hazard).ok then session:fail("Hazard controller unavailable"); return end
  session:objective("Touch the first coin switch to start lockdown", 0, settings.waves)
end

local function beginWave()
  wave, phase, enemies = wave+1, "defending", {}
  for index = 1, settings.enemies do
    local point = helpers.offset(origin, 160, index*48, 0)
    if clearPoint(point) then
      local handle = session:spawn("mightymike.caveman", point, true)
      if handle then enemies[#enemies+1] = handle end
    end
  end
  if #enemies == 0 then session:fail("No clear enemy spawn tiles") end
  session:status(phase, wave)
end

local function living()
  local count = 0
  for _, handle in ipairs(enemies) do
    local state = p.object.lifeState(handle)
    if state == "alive" or state == "unknown" then count = count+1 end
  end
  return count
end

function entry.onAreaFrame(ctx)
  local player = p.player.get(0)
  if not player or player.dead then return end
  local ready, fresh = session:begin(player)
  if not ready then return end
  if fresh then initialize(player) end
  if session.failed or phase == "complete" then return end
  elapsed = elapsed+math.min(ctx.deltaSeconds, 0.1)
  session:move(hazard, helpers.offset(origin, 96+math.sin(elapsed*2)*settings.hazardTravel, 48, 0))
  local switch = switches[wave+1]
  if phase == "switch" and switch and helpers.distance(player.position, switch.point) <= settings.switchRadius then
    session:remove(switch.handle)
    beginWave()
    session:objective("Clear the lockdown enemies", wave-1, settings.waves)
  elseif phase == "defending" and living() == 0 then
    if wave == settings.waves then
      phase = "complete"
      session:remove(gate); session:remove(hazard)
      session:objective("Lockdown lifted — gate open", wave, settings.waves)
    else
      phase = "switch"
      session:objective("Touch the next coin switch", wave, settings.waves)
    end
    session:status(phase, wave)
  end
end

entry.onAreaStart, entry.onAreaUnload, entry.onPlayerRespawn = reset, reset, reset
return entry
