local p = require("pangea")
local entry = {}
local frames, boarded, startZ, riding = 0, false, nil, false

function entry.onFrame()
  local player = p.player.get(0)
  if not player or not player.object then return end
  p.player.setHealthResult(0, 1)
  local root, platforms
  platforms = {}
  for _, handle in ipairs(p.object.all()) do
    local state = p.object.state(handle)
    if state.sampleRole == "marker" and not root then root = handle end
    if state.sampleRole == "platform" then platforms[#platforms+1] = handle end
  end
  if not root or #platforms ~= 3 then return end
  table.sort(platforms, function(a,b) return a.id < b.id end)
  local state = p.level.state()
  state.playerDead = player.dead
  state.playerControlled = p.object.scriptControlled(player.object)
  state.playerY = player.position.y
  state.playerZ = player.position.z
  state.platformZ = p.object.position(platforms[1]).z
  state.platformVelocity = p.object.velocity(platforms[1]).z
  state.playerBottom = p.object.bounds(player.object).min.y
  state.platformTop = p.object.bounds(platforms[1]).max.y
  if state.phase == "unavailable" then return end
  frames = frames+1
  if frames == 1 and not boarded then p.player.setPositionResult(0, p.object.position(root)); return end
  local nextPlatform = platforms[math.min(3, (state.progress or 0)+1)]
  if not boarded then
    local platform = p.object.bounds(platforms[1])
    local body = p.object.geometry(player.object)
    if not platform or not body then return end
    p.player.setPositionResult(0, {x=(platform.min.x+platform.max.x)/2,
      y=platform.max.y+body.groundOffset.y+2, z=(platform.min.z+platform.max.z)/2})
    p.object.setVelocityResult(player.object, {x=0,y=-10,z=0})
    boarded, startZ, frames = true, (platform.min.z+platform.max.z)/2, 0
    return
  end
  if not riding then
    local point = p.object.position(platforms[1])
    if frames < 45 then return end
    local distance = math.abs(player.position.z-point.z)
    state.riderDistance, state.riderTravel = distance, math.abs(player.position.z-startZ)
    if distance < 100 and math.abs(player.position.z-startZ) > 40 then
      riding = true
      state.platformCarried = true
    end
    return
  end
  if state.progress == 3 then state.proofComplete = true; return end
  local platform = p.object.bounds(nextPlatform)
  local body = p.object.geometry(player.object)
  p.player.setPositionResult(0, {x=(platform.min.x+platform.max.x)/2,
    y=platform.max.y+body.groundOffset.y+2, z=(platform.min.z+platform.max.z)/2})
end

return entry
