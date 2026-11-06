local p = require("pangea")
local helpers = require("helpers.sample")
local entry, session = {}, helpers.create("nanosaur-nest")
local settings = {waves=3, waveSeconds=10, maxAlive=3, enemy="nanosaur.stegosaurus"}
local egg, origin, enemies, phase, elapsed, wave = nil, nil, {}, "waiting", 0, 0

local function reset()
  session:clear()
  egg, origin, enemies, phase, elapsed, wave = nil, nil, {}, "waiting", 0, 0
end

local function living()
  local count = 0
  for _, handle in ipairs(enemies) do
    local state = p.object.lifeState(handle)
    if state == "alive" or state == "unknown" then count = count+1 end
  end
  return count
end

local function spawnWave(player)
  for index = 1, settings.maxAlive-living() do
    local angle = (wave*3+index)*2.4
    local point = helpers.ground(helpers.offset(origin, math.cos(angle)*900, 0, math.sin(angle)*900))
    if point then
      local hit, status = p.world.raycast(helpers.offset(point, 0, 120, 0), player.position, "solid", player.object)
      if status and status.ok and not hit then
        local handle = session:spawn(settings.enemy, point, true, "ground")
        if handle then enemies[#enemies+1] = handle end
      end
    end
  end
end

local function startDefence()
  phase, elapsed = "defending", settings.waveSeconds
  session:status(phase)
  p.ui.message("Nest disturbed! Survive three waves.", {duration=5})
end

function entry.onFrame(ctx)
  local player = p.player.get(0)
  if not player or player.dead then return end
  local ready, fresh = session:begin(player)
  if not ready then return end
  if fresh then
    origin = helpers.ground(helpers.offset(player.position, 350, 0, 0))
    if not origin then session:fail("No dry nest location"); return end
    egg = session:spawn("nanosaur.egg", origin, true)
    session.group:on("player.carried",function(event)
      if phase=="waiting" and event.playerNum==0 and helpers.same(event.object,egg) then startDefence() end
    end)
    session:objective("Pick up the nearby egg to begin nest defence", 0, settings.waves)
  end
  if phase ~= "defending" or session.failed then return end
  elapsed = elapsed + math.min(ctx.deltaSeconds, 0.1)
  if elapsed < settings.waveSeconds then return end
  if wave == settings.waves then
    phase = "complete"
    session:status(phase, wave)
    session:objective("Nest defence complete — recover the egg normally", wave, settings.waves)
    return
  end
  wave, elapsed = wave+1, 0
  spawnWave(player)
  session:status(phase, wave)
  session:objective("Survive the nest defence", wave, settings.waves)
end

entry.onLevelStart, entry.onLevelUnload, entry.onPlayerRespawn = reset, reset, reset
return entry
