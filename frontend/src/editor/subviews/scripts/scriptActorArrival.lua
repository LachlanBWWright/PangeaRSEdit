local arrivals = {}

local function release(entry)
  if not pangea.object.exists(entry.handle) then return end
  if pangea.object.hasControl(entry.handle, entry.token) then
    pangea.object.releaseControl(entry.handle, entry.token)
  end
end

function arrivals.begin(handle, ground, duration, animation, startHeight)
  local origin = pangea.object.position(handle)
  if not origin then return nil end
  local geometry = pangea.object.geometry(handle)
  local capabilities = pangea.object.capabilities(handle)
  if not geometry or not capabilities or not capabilities.opacity then return nil end
  local destination = { x = ground.x, y = ground.y + geometry.groundOffset.y, z = ground.z }
  local controlled = pangea.object.acquireControl(handle)
  if not controlled.ok then return nil end
  local faded = pangea.object.setOpacityResult(handle, 0)
  if not faded.ok then
    pangea.object.releaseControl(handle, controlled.token)
    return nil
  end
  if startHeight then
    origin.y = destination.y + startHeight
    local positioned = pangea.object.setPositionResult(handle, origin)
    if not positioned.ok then release({ handle = handle, token = controlled.token }); return nil end
  end
  if animation then
    local animated = pangea.object.setAnimationResult(handle, animation, 1, 0.15)
    if not animated.ok then release({handle=handle,token=controlled.token}); return nil end
  end
  return { handle = handle, origin = origin, destination = destination,
    duration = math.max(0.1, duration), elapsed = 0, token = controlled.token }
end

function arrivals.update(entries, delta)
  local pending = {}
  for _, entry in ipairs(entries or {}) do
    if pangea.object.exists(entry.handle) and pangea.object.hasControl(entry.handle, entry.token) then
      entry.elapsed = entry.elapsed + delta
      local t = math.min(1, entry.elapsed / entry.duration)
      local position = pangea.object.position(entry.handle)
      local destination = entry.destination
      local target = {
        x = entry.origin.x + (destination.x - entry.origin.x) * t,
        y = entry.origin.y + (destination.y - entry.origin.y) * t,
        z = entry.origin.z + (destination.z - entry.origin.z) * t,
      }
      local moved = position and pangea.object.moveKinematic(entry.handle, {
        x = target.x - position.x, y = target.y - position.y, z = target.z - position.z,
      }, "solid")
      local faded = pangea.object.setOpacityResult(entry.handle, t)
      if moved and moved.blocked then
        pangea.object.state(entry.handle).arrivalStatus = "blocked"
        release(entry)
      elseif t == 1 or not moved or not moved.ok or not faded.ok then
        pangea.object.state(entry.handle).arrivalStatus = moved and moved.ok and faded.ok and "arrived" or "failed"
        release(entry)
      else
        pending[#pending + 1] = entry
      end
    end
  end
  return pending
end

function arrivals.release(entries)
  for _, entry in ipairs(entries or {}) do release(entry) end
end
