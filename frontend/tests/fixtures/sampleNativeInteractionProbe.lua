local p = require("pangea")
local entry = {}
local transformed, frames = false, 0

function entry.onFrame()
  local player = p.player.get(0)
  if not player or player.dead then return end
  p.player.setHealthResult(0, 1)
  local alarm, egg
  local nativeCount = 0
  for _, handle in ipairs(p.object.all()) do
    local state = p.object.state(handle)
    if state.sampleRole == "target" then alarm = handle end
    if state.sampleRole == "native:nanosaur.egg" then egg = handle end
    if state.sampleRole == "native:bugdom.ant" or state.sampleRole == "native:nanosaur.stegosaurus" then nativeCount = nativeCount+1 end
  end
  local state = p.level.state()
  if not state.sample then return end
  frames = frames+1
  if state.sample == "bugdom-alarm" then
    if state.phase == "silenced" then
      state.proofComplete = nativeCount > 0
      return
    end
    if not alarm then return end
    local point = p.object.position(alarm)
    if nativeCount == 0 then
      if frames == 1 then p.player.setPositionResult(0, {x=point.x+250,y=point.y+100,z=point.z}) end
      return
    end
    if not transformed then
      local result = p.player.transform(0, "ball")
      if not result.ok then state.probeError=result.message; return end
      transformed = true
    end
    p.player.setPositionResult(0, {x=point.x,y=point.y+30,z=point.z})
  elseif egg then
    if state.phase == "defending" and nativeCount > 0 then state.proofComplete = true; return end
    if state.phase ~= "ready" then return end
    local relations = p.player.relations(0)
    if relations and relations.carried and relations.carried.id == egg.id then return end
    local point = p.object.position(egg)
    p.player.setPositionResult(0, {x=point.x,y=point.y+30,z=point.z})
    local result = p.player.carry(0, egg)
    if not result.ok then state.probeError=result.message end
  end
end

return entry
