local p = require("pangea")
local helpers = require("helpers.sample")
local entry, session = {}, helpers.create("bugdom-alarm")
local settings = {radius=1800, interval=4, maxAlive=3, quota=6}
local alarm, soldiers, elapsed, spawned, silenced = nil, {}, 0, 0, false

local function reset()
  session:clear()
  alarm, soldiers, elapsed, spawned, silenced = nil, {}, 0, 0, false
end

local function living()
  local count = 0
  for _, handle in ipairs(soldiers) do
    local state = p.object.lifeState(handle)
    if state == "alive" or state == "unknown" then count = count + 1 end
  end
  return count
end

function entry.onWeaponHit(ctx)
  if alarm and helpers.same(ctx.target,alarm) and ctx.attackKind=="rolling" then
    return {damage=p.object.health(alarm)}
  end
end

function entry.onFrame(ctx)
  local player = p.player.get(0)
  if not player or player.dead then return end
  local ready, fresh = session:begin(player)
  if not ready then return end
  if fresh then
    local point = helpers.ground(helpers.offset(player.position, 600, 0, 0))
    if not point then session:fail("No dry ground for alarm"); return end
    alarm = session:spawn("target", point, false, "ground")
    session:objective("Roll into the alarm to silence reinforcements", 0, 1)
  end
  if not alarm or silenced then return end
  if p.object.exists(alarm) then
    local relations, bounds = p.player.relations(0), p.object.bounds(alarm)
    if relations and relations.form == "ball" and bounds then
      local actors, status = p.world.overlapBox(bounds, "player")
      if status and status.ok then
        for _, handle in ipairs(actors or {}) do
          if helpers.same(handle, player.object) then p.combat.apply(alarm,p.object.health(alarm) or 0) end
        end
      end
    end
  end
  if p.object.lifeState(alarm) == "dead" or not p.object.exists(alarm) then
    silenced = true
    session:remove(alarm)
    session:status("silenced", spawned)
    session:objective("Alarm silenced", 1, 1)
    return
  end
  elapsed = elapsed + math.min(ctx.deltaSeconds, 0.1)
  if elapsed < settings.interval or spawned >= settings.quota or living() >= settings.maxAlive then return end
  local point = p.object.position(alarm)
  if helpers.distance(point, player.position) > settings.radius then return end
  local hit, status = p.world.raycast(helpers.offset(point, 0, 100, 0),
    helpers.offset(player.position, 0, 100, 0), "solid", alarm)
  if not status or not status.ok or hit and not helpers.same(hit.object, player.object) then return end
  local angle = spawned * 2.4
  local ground = helpers.ground(helpers.offset(point, math.cos(angle)*450, 0, math.sin(angle)*450))
  if not ground then return end
  local handle = session:spawn("bugdom.ant", ground, true, "ground")
  if not handle then return end
  soldiers[#soldiers+1], elapsed, spawned = handle, 0, spawned+1
  session:status("alert", spawned)
end

entry.onLevelStart, entry.onLevelUnload, entry.onPlayerRespawn = reset, reset, reset
return entry
