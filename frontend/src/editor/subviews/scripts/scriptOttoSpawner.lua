local object = {}
-- Checkpoint state rewinds; retain current ownership to remove later aliens.
local ownedChildren = {}

local function handleKey(handle)
  return handle.id .. ":" .. handle.generation
end

local function stop(state)
  if state.timer then pangea.time.cancel(state.timer) end
  state.timer = nil
end

local function clearChildren(self, state)
  for _, child in ipairs(ownedChildren[handleKey(self.handle)] or state.children or {}) do
    if pangea.object.exists(child) then pangea.object.deleteResult(child) end
  end
  ownedChildren[handleKey(self.handle)] = nil
  state.children = {}
  state.arrivals = {}
end

local function reconcileCheckpointChildren(self, state)
  local retained = {}
  for _, child in ipairs(state.children or {}) do retained[handleKey(child)] = true end
  for _, child in ipairs(ownedChildren[handleKey(self.handle)] or {}) do
    if not retained[handleKey(child)] and pangea.object.exists(child) then
      pangea.object.deleteResult(child)
    end
  end
  ownedChildren[handleKey(self.handle)] = state.children or {}
end

local function pruneChildren(state)
  local alive = {}
  for _, child in ipairs(state.children) do
    local lifecycle = pangea.object.lifeState(child)
    if lifecycle == "alive" or lifecycle == "unknown" then alive[#alive + 1] = child end
  end
  state.children = alive
end

local function start(self, ctx)
  local state = pangea.object.state(self.handle)
  if state.timer then return end
  local settings = self.parameters or {}
  local quota = settings.quota or 3
  state.spawned = state.spawned or 0
  state.children = state.children or {}
  ownedChildren[handleKey(self.handle)] = state.children
  state.level = ctx.levelNum
  state.completed = quota > 0 and state.spawned >= quota
  if state.completed then state.status = "completed"; return end
  state.timer = pangea.time.every(settings.spawnInterval or 0.4, function()
    if not pangea.object.exists(self.handle) then stop(state); return end
    pruneChildren(state)
    state.aliveCount = #state.children
    ownedChildren[handleKey(self.handle)] = state.children
    if #state.children >= (settings.maxAlive or 3) then state.status = "at-capacity"; return end
    local position = pangea.object.position(self.handle)
    if not position then return end
    local player = pangea.player.get(0)
    local range = settings.spawnRange or 2500
    local distance = player and player.position and math.sqrt(
      (player.position.x - position.x)^2 + (player.position.z - position.z)^2) or nil
    state.playerDistance = distance
    if not player or player.dead or not distance or distance > range then
      state.status = "waiting-for-player"
      return
    end
    local angle = (state.spawned % 6) * math.pi / 3
    local destination = { x = position.x + math.cos(angle) * 450,
      z = position.z + math.sin(angle) * 450 }
    position.x = position.x + math.cos(angle) * 200
    position.z = position.z + math.sin(angle) * 200
    local terrain = pangea.world.sampleTerrain(position.x, position.z)
    if not terrain then return end
    position.y = terrain.height
    local ground = pangea.world.sampleTerrain(destination.x, destination.z)
    if not ground then return end
    destination.y = ground.height
    local result = pangea.spawn.nativeResult("ottomatic.brainAlien", position, {placement="ground"})
    if not result.ok or not result.primary then
      pangea.log.warn(result.message or "Brain Alien could not be spawned")
      return
    end
    pangea.object.state(result.primary).origin = "independent-brain-port"
    local entry = arrivals.begin(result.primary, destination, settings.arrivalDuration or 1.2, 1)
    if not entry then
      pangea.object.deleteResult(result.primary)
      return
    end
    state.arrivals = state.arrivals or {}
    state.arrivals[#state.arrivals + 1] = entry
    state.spawned = state.spawned + 1
    state.children[#state.children + 1] = result.primary
    state.aliveCount = #state.children
    state.status = "spawning"
    pangea.log.info("independent brain port spawned " .. state.spawned)
    state.completed = quota > 0 and state.spawned >= quota
    if state.completed then state.status = "completed"; stop(state) end
  end)
end

function object.onSpawn(self, ctx)
  pangea.object.setScriptControlledResult(self.handle, true)
  pangea.object.setHealthResult(self.handle, self.parameters.health or 2)
  pangea.object.setDamageResult(self.handle, 0)
  local position = pangea.object.position(self.handle)
  if position then
    local terrain = pangea.world.sampleTerrain(position.x, position.z)
    if terrain then
      position.y = terrain.height
      pangea.object.setPositionResult(self.handle, position)
    end
  end
  start(self, ctx)
end

function object.onUpdate(self, ctx)
  local state = pangea.object.state(self.handle)
  state.arrivals = arrivals.update(state.arrivals, ctx.deltaSeconds)
end

function object.onActivate(self, ctx)
  start(self, ctx)
end

function object.onStreamIn(self, ctx)
  start(self, ctx)
end

function object.onCheckpointReset(self, ctx)
  local state = pangea.object.state(self.handle)
  stop(state)
  local settings = self.parameters or {}
  if settings.checkpointPolicy == "restart" then
    clearChildren(self, state)
    state.spawned = 0
  else
    reconcileCheckpointChildren(self, state)
  end
  start(self, ctx)
end

function object.onDeactivate(self, ctx)
  local state = pangea.object.state(self.handle)
  stop(state)
  clearChildren(self, state)
end

function object.onDestroy(self, ctx)
  object.onDeactivate(self, ctx)
  pangea.log.info("independent brain port destroyed")
end

function object.onStreamOut(self, ctx)
  object.onDeactivate(self, ctx)
end

return { __PANGEA_CUSTOM_OBJECT_EXPORT__ = object }
