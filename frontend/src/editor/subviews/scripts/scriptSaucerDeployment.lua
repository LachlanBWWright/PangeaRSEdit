local pangea = require("pangea")
local landing = require("helpers.landing-search")
local arrivals = require("helpers.actor-arrival")
local encounter = {}

-- These are script settings, not engine encounter rules.
local settings = { actor = "ottomatic.brainAlien", maxAlive = 3, cooldown = 12,
  arrivalSeconds = 2, flightSeconds = 3, altitude = 1100, searchAttempts = 12 }
local children, visuals, pending = {}, {}, {}
local flight, elapsed, cooldown, phase = nil, 0, 3, 0
local owned

local function remove(handle)
  if handle and pangea.object.exists(handle) then pangea.object.deleteResult(handle) end
end

local function clearVisuals()
  for _, handle in ipairs(visuals) do remove(handle) end
  visuals = {}
end

local function visual(id, position)
  local spawned = pangea.spawn.scriptedResult(id, position, {placement="world"})
  if not spawned.ok or not spawned.primary then return nil end
  local handle = spawned.primary
  if not owned:track(handle).ok then remove(handle); return nil end
  visuals[#visuals + 1] = handle
  return handle
end

local function prune()
  local alive = {}
  for _, handle in ipairs(children) do
    local state = pangea.object.lifeState(handle)
    if state == "alive" or state == "unknown" then alive[#alive + 1] = handle end
  end
  children = alive
end

local function startFlight(player)
  phase = phase + 1
  local playerHandle = player.object
  local point = landing.find(player.position, playerHandle, phase,
    settings.searchAttempts, 700, 1600, 90, 220)
  if not point then return false end
  local position = { x = point.x - 1800, y = point.y + settings.altitude, z = point.z }
  local top = visual("custom.transport-top", position)
  local bottom = top and visual("custom.transport-bottom", position)
  if not top or not bottom then clearVisuals(); return false end
  flight = { point = point, top = top, bottom = bottom, phase = "approach" }
  elapsed = 0
  return true
end

local function deploy(player)
  local point = flight.point
  local ignore = player.object
  -- Recheck after approach: the player and obstacles can have moved.
  if not landing.check(point, player.position, ignore, 90, 220) then return end
  local result = pangea.spawn.nativeResult(settings.actor,
    { x = point.x, y = point.y + 650, z = point.z }, {placement="world"})
  if not result.ok or not result.primary then return end
  if not owned:track(result.primary).ok then remove(result.primary); return end
  local geometry = pangea.object.geometry(result.primary)
  if not geometry then remove(result.primary); return end
  local radius = math.max(math.abs(geometry.min.x), math.abs(geometry.max.x), math.abs(geometry.min.z), math.abs(geometry.max.z))
  local height = geometry.max.y - geometry.min.y
  if not landing.check(point, player.position, ignore, radius, height) then remove(result.primary); return end
  local entry = arrivals.begin(result.primary, point, settings.arrivalSeconds, 1, 650)
  if not entry then remove(result.primary); return end
  children[#children + 1] = result.primary
  pending[#pending + 1] = entry
  pangea.object.state(result.primary).origin = "scripted-saucer-deployment"
  flight.beam = visual("custom.transport-beam", {
    x = point.x, y = point.y + settings.altitude, z = point.z })
  if flight.beam then pangea.object.setOpacityResult(flight.beam, 0.45) end
end

function encounter.onFrame(ctx)
  if not owned or owned.closed then owned = pangea.resources.create() end
  if not owned then return end
  local delta = math.min(ctx.deltaSeconds, 0.1)
  pending = arrivals.update(pending, delta)
  prune()
  local player = pangea.player.get(0)
  if not player or player.dead then return end
  if not flight then
    cooldown = cooldown - delta
    if cooldown <= 0 and #children < settings.maxAlive then
      if not startFlight(player) then cooldown = 2 end
    end
    return
  end
  elapsed = elapsed + delta
  local point = flight.point
  local offset = 0
  if flight.phase == "approach" then
    offset = -1800 * (1 - math.min(1, elapsed / settings.flightSeconds))
    if elapsed >= settings.flightSeconds then
      deploy(player)
      flight.phase = "beam"
      elapsed = 0
    end
  elseif flight.phase == "beam" then
    if elapsed >= settings.arrivalSeconds then
      remove(flight.beam)
      flight.phase = "depart"
      elapsed = 0
    end
  else
    offset = 1800 * math.min(1, elapsed / settings.flightSeconds)
    if elapsed >= settings.flightSeconds then
      clearVisuals(); flight = nil; cooldown = settings.cooldown; return
    end
  end
  local position = { x = point.x + offset, y = point.y + settings.altitude, z = point.z }
  for _, handle in ipairs({ flight.top, flight.bottom }) do
    if pangea.object.exists(handle) then pangea.object.setPositionResult(handle, position) end
  end
end

function encounter.onLevelUnload()
  if owned then owned:clear(); owned = nil end
  clearVisuals()
  for _, handle in ipairs(children) do remove(handle) end
  children, pending, flight = {}, {}, nil
  elapsed, cooldown, phase = 0, 3, 0
end

encounter.onLevelStart = encounter.onLevelUnload
encounter.onPlayerRespawn = encounter.onLevelUnload
return encounter
