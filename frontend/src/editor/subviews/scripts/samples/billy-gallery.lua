local p = require("pangea")
local helpers = require("helpers.sample")
local entry, session = {}, helpers.create("billy-gallery")
local settings = {seconds=30, targetSeconds=6, rounds=9, bonusSeconds=5, seed=7123}
local targets, origin, elapsed, remaining, round, combo, hits, finished = {}, nil, 0, 30, 0, 0, 0, false

local function clearTargets()
  for _, target in ipairs(targets) do session:remove(target.handle) end
  targets = {}
end

local function reset()
  session:clear()
  targets, origin, elapsed, remaining, round, combo, hits, finished = {}, nil, 0, settings.seconds, 0, 0, 0, false
end

local function nextRound()
  clearTargets()
  round, elapsed = round+1, 0
  if round > settings.rounds then finished = true; return end
  local friendly = (round*settings.seed)%3+1
  for index = 1, 3 do
    local point = helpers.offset(origin, (index-2)*250, (round%2)*80, 0)
    local handle = session:spawn("target", point)
    if not handle then return end
    local target = {handle=handle, point=point, friendly=index == friendly, bonus=index == (friendly%3)+1}
    if target.bonus and not session.group:control(handle).ok then session:fail("Target controller unavailable"); return end
    p.object.state(handle).role = target.friendly and "friendly" or target.bonus and "bonus" or "target"
    targets[#targets+1] = target
  end
end

function entry.onWeaponHit(ctx)
  if finished or session.failed then return end
  for index, target in ipairs(targets) do
    if helpers.same(ctx.target, target.handle) then
      local score = 0
      if target.friendly then combo = 0; score = -100
      else
        combo, hits = combo+1, hits+1
        score = 100*combo
        if target.bonus then remaining = remaining+settings.bonusSeconds end
      end
      session:remove(target.handle)
      table.remove(targets, index)
      session:status("shooting", hits)
      session:objective("Gallery hits — spare flashing targets; moving targets add 5s", hits, settings.rounds*2)
      return {applyDamage=false, damage=0, scoreDelta=score}
    end
  end
end

function entry.onAreaFrame(ctx)
  local player = p.player.get(0)
  if not player or player.dead then return end
  local ready, fresh = session:begin(player)
  if not ready then return end
  if fresh then
    local forward = helpers.forward(player)
    origin = helpers.offset(player.position, forward.x*900, 250, forward.z*900)
    nextRound()
    session:objective("Shoot crates; spare flashing crates; moving crates add 5s", 0, settings.rounds*2)
  end
  if session.failed or finished then return end
  local delta = math.min(ctx.deltaSeconds, 0.1)
  elapsed, remaining = elapsed+delta, remaining-delta
  session:clock("Gallery: spare flashing crates; moving crates add 5s", remaining, hits, settings.rounds*2)
  for _, target in ipairs(targets) do
    if target.friendly then p.object.setOpacityResult(target.handle, math.sin(elapsed*10)>0 and 1 or 0.25) end
    if target.bonus then session:move(target.handle, helpers.offset(target.point, math.sin(elapsed*2)*100, 0, 0)) end
  end
  if remaining <= 0 then finished = true
  elseif elapsed >= settings.targetSeconds or #targets == 0 then
    if #targets > 0 then combo = 0 end
    nextRound()
  end
  if finished then
    clearTargets()
    session:status("complete", hits)
    session:objective("Gallery complete — restart area to retry", hits, settings.rounds*2)
  end
end

entry.onAreaStart, entry.onAreaUnload = reset, reset
return entry
