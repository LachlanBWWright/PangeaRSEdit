local pangea = require("pangea")
local landing = {}

function landing.check(point, target, ignore, radius, height)
  local terrain = pangea.world.sampleTerrain(point.x, point.z)
  if not terrain or not terrain.normal or terrain.normal.y < 0.85 then return nil end
  if terrain.waterHeight and terrain.waterHeight > terrain.height then return nil end
  local ground = { x = point.x, y = terrain.height, z = point.z }
  local from = { x = ground.x, y = ground.y + height * 0.5, z = ground.z }
  local to = { x = target.x, y = target.y + height * 0.5, z = target.z }
  local hit, status = pangea.world.raycast(from, to, "solid", ignore)
  if not status or not status.ok or hit then return nil end
  local dx, dz = target.x - point.x, target.z - point.z
  local distance = math.sqrt(dx * dx + dz * dz)
  if distance < radius * 4 then return nil end
  local travel = math.max(0, distance - radius * 4)
  local bounds = {
    min = { x = ground.x - radius, y = ground.y + 5, z = ground.z - radius },
    max = { x = ground.x + radius, y = ground.y + height, z = ground.z + radius },
  }
  local obstacle, swept = pangea.world.sweepBox(bounds,
    { x = dx / distance * travel, y = 0, z = dz / distance * travel }, "solid", ignore)
  if not swept or not swept.ok or obstacle then return nil end
  return ground
end

function landing.find(target, ignore, phase, attempts, minimum, maximum, radius, height)
  for index = 1, attempts do
    local angle = phase + index * 2.3999632297287
    local distance = minimum + (maximum - minimum) * index / attempts
    local ground = landing.check({ x = target.x + math.cos(angle) * distance,
      z = target.z + math.sin(angle) * distance }, target, ignore, radius, height)
    if ground then return ground end
  end
  return nil
end

return landing
