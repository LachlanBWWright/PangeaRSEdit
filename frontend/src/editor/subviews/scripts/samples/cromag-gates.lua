local p = require("pangea")
local helpers = require("helpers.sample")
local entry, session = {}, helpers.create("cromag-gates")
local settings = {seconds=45, stages=3, distance=1800, branchOffset=250, radius=300}
local racers = {}

local function reset()
  session:clear()
  racers = {}
end

local function clearGates(racer)
  for _, gate in ipairs(racer.gates) do session:remove(gate.handle) end
  racer.gates = {}
end

local function gatesAhead(player, racer)
  local forward = helpers.forward(player)
  local center = helpers.offset(player.position, forward.x*settings.distance, 0, forward.z*settings.distance)
  for index, side in ipairs({-1, 1}) do
    local point = helpers.ground(helpers.offset(center, forward.z*side*settings.branchOffset, 0, -forward.x*side*settings.branchOffset))
    if point then
      point.y = point.y+100
      local handle = session:spawn("marker", point)
      racer.gates[#racer.gates+1] = {handle=handle, point=point, bonus=index == 1 and 3 or 6}
    end
  end
  if #racer.gates == 0 then session:fail("No dry ground for the next gates") end
end

local function updatePlayer(player, racer, delta, index)
  if racer.done or player.dead then return end
  racer.remaining = racer.remaining-delta
  if racer.remaining <= 0 then
    racer.done = true
    clearGates(racer)
    session:objective("Bonus challenge timed out — restart race to retry", racer.progress, settings.stages, index)
    return
  end
  session:clock("Choose gate: left +3s / right +6s", racer.remaining, racer.progress, settings.stages, index)
  for _, gate in ipairs(racer.gates) do
    local crossed=p.spatial.crossing(racer.previous or player.position,player.position,
      {kind="sphere",center=gate.point,radius=settings.radius})
    if crossed.ok and crossed.crossed then
      racer.progress, racer.remaining = racer.progress+1, racer.remaining+gate.bonus
      clearGates(racer)
      racer.done = racer.progress == settings.stages
      if not racer.done then gatesAhead(player, racer) end
      session:objective(racer.done and "Bonus route complete" or "Choose either next gate: left +3s / right +6s",
        racer.progress, settings.stages, index)
      break
    end
  end
  racer.previous=player.position
end

function entry.onRaceFrame(ctx)
  local first = p.player.get(0)
  if not first then return end
  local ready, fresh = session:begin(first)
  if not ready then return end
  if fresh then racers = {} end
  for _, player in ipairs(p.player.list({kind="localHuman"})) do
    local index = player.playerNum
      if not racers[index] then
        racers[index] = {gates={}, remaining=settings.seconds, progress=0, done=false}
        gatesAhead(player, racers[index])
        session:objective("Choose either bonus gate — 45 seconds", 0, settings.stages, index)
      end
      updatePlayer(player, racers[index], math.min(ctx.deltaSeconds, 0.1), index)
  end
  session:status(racers[0] and racers[0].done and "finished" or "racing", racers[0] and racers[0].progress or 0)
end

entry.onRaceStart, entry.onRaceUnload = reset, reset
return entry
