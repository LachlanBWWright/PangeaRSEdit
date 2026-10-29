local pangea = require("pangea")
local port = {}

function port.onSpawn(self, ctx)
  local position = assert(pangea.object.position(self.handle))
  position.y = assert(pangea.world.sampleTerrain(position.x, position.z)).height
  assert(pangea.object.setPosition(self.handle, position))
  local state = pangea.object.state(self.handle)
  state.spawned = 0
  state.elapsed = 0
  state.children = {}
  state.level = ctx.levelNum
  pangea.time.every(0.4, function()
    if state.spawned >= 3 then return end
    local position = assert(pangea.object.position(self.handle))
    position.x = position.x + 350 + state.spawned * 150
    local ground = assert(pangea.world.sampleTerrain(position.x, position.z))
    position.y = ground.height
    local result = pangea.spawn.nativeResult("ottomatic.brainAlien", position)
    assert(result.ok and result.primary, result.message)
    assert(pangea.object.type(result.primary) == "ottomatic.enemy.brainalien")
    pangea.object.state(result.primary).origin = "independent-brain-port"
    state.spawned = state.spawned + 1
    state.children[state.spawned] = result.primary
    pangea.log.info("independent brain port spawned " .. state.spawned)
  end)
end

function port.onUpdate(self, ctx)
  local state = pangea.object.state(self.handle)
  state.elapsed = state.elapsed + pangea.time.delta()
end

function port.onDestroy(self, ctx)
  local state = pangea.object.state(self.handle)
  for _, child in ipairs(state.children or {}) do
    if pangea.object.exists(child) then assert(pangea.object.delete(child)) end
  end
  pangea.log.info("independent brain port destroyed")
end

return { custom_brain_port = port }
