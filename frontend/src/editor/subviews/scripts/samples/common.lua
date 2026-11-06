local p = require("pangea")
local common = {}

function common.same(a, b)
  return a and b and a.id == b.id and a.generation == b.generation
end

function common.distance(a, b)
  return math.sqrt((a.x-b.x)^2 + (a.y-b.y)^2 + (a.z-b.z)^2)
end

function common.offset(point, x, y, z)
  return {x=point.x+x, y=point.y+y, z=point.z+z}
end

function common.forward(player)
  local yaw = player.rotation and player.rotation.y or 0
  return {x=-math.sin(yaw), y=0, z=-math.cos(yaw)}
end

function common.ground(point, footprint, elevation)
  local player=p.player.get(0)
  local placement=p.spatial.findGround({point},{halfExtents=footprint or {x=24,y=40,z=24},
    ignore=player and player.object,elevation=elevation})
  return placement.ok and placement.position or nil
end

function common.create(id, planar)
  local session = {id=id, planar=planar, group=nil, clocks={}, failed=false}

  function session:status(phase, progress)
    if self.failed and phase ~= "unavailable" then return end
    local state = p.level.state()
    state.sample, state.phase, state.progress = self.id, phase, progress or 0
  end

  function session:fail(message)
    if not self.failed then p.log.warn(self.id .. ": " .. message) end
    self.failed = true
    self:status("unavailable")
    p.ui.message("Sample paused: " .. message, {duration=8})
  end

  function session:spawn(id, point, native, placement)
    local result
    if native then result = p.spawn.nativeResult(id, point, {placement=placement or "native"})
    else result = p.spawn.scriptedResult("custom." .. id, point, {placement=placement or "world"}) end
    if not result.ok or not result.primary then self:fail(result.message or "Spawn failed"); return nil end
    local handle = result.primary
    if not self.group:track(handle).ok then
      p.object.deleteResult(handle); self:fail("Resource group rejected object"); return nil
    end
    p.object.state(handle).sampleRole = native and "native:" .. id or id
    return handle
  end

  function session:begin(player)
    if self.failed then return false end
    if self.group and not self.group.closed then return true end
    self:clear()
    self.group = p.resources.create()
    if not self.group then self:fail("Resource group unavailable"); return false end
    self:status("ready")
    return true, true
  end

  function session:objective(text, current, total, player)
    local result = p.ui.objective(self.id .. ":" .. (player or 0),
      {text=text, current=current, total=total, player=player or 0})
    if result.ok then self.group:hud(result.handle) end
  end

  function session:clock(text, remaining, current, total, player)
    local seconds = math.max(0, math.ceil(remaining))
    local label = text .. " — " .. seconds .. "s"
    local key = label .. ":" .. current
    if self.clocks[player or 0] == key then return end
    self.clocks[player or 0] = key
    self:objective(label, current, total, player)
  end

  function session:move(handle, destination)
    local position = p.object.position(handle)
    if not position then return false end
    local moved = p.object.moveKinematic(handle,
      {x=destination.x-position.x, y=destination.y-position.y, z=destination.z-position.z}, "solid")
    if not moved.ok then self:fail(moved.message or "Movement query failed"); return false end
    if moved.blocked then self:status("blocked") end
    return moved.completed == true
  end

  function session:remove(handle)
    if handle and p.object.exists(handle) then p.object.deleteResult(handle) end
  end

  function session:clear()
    if self.group then self.group:clear() end
    self.clocks, self.group, self.failed = {}, nil, false
  end

  return session
end

return common
