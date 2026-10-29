import type { ScriptBehaviorDefinition, ScriptCustomObjectDefinition } from "./scriptWorkspaceStateTypes";

const prelude = `local pangea = require("pangea")
local object = {}

local function report(result)
  if not result.ok then pangea.log.warn(result.message) end
  return result.ok
end
`;

const enemy = `${prelude}
---@param self ObjectBehaviorSelf
---@param ctx ObjectFrameContext
function object.onSpawn(self, ctx)
  report(pangea.object.setScriptControlledResult(self.handle, true))
  report(pangea.object.setHealthResult(self.handle, self.parameters.health))
  report(pangea.object.setDamageResult(self.handle, self.parameters.contactDamage))
end

---@param self ObjectBehaviorSelf
---@param ctx ObjectFrameContext
function object.onUpdate(self, ctx)
  local player = pangea.player.get(0)
  if not player or player.dead then return end
  local position = pangea.object.position(self.handle)
  if not position then return end
  local dx, dz = player.position.x - position.x, player.position.z - position.z
  local distance = math.sqrt(dx * dx + dz * dz)
  local settings = self.parameters
  if distance <= settings.stopDistance or distance > settings.detectionRange then return end
  local step = math.min(settings.speed * ctx.deltaSeconds, distance - settings.stopDistance)
  local destination = { x = position.x + dx / distance * step, z = position.z + dz / distance * step }
  local terrain = pangea.world.sampleTerrain(destination.x, destination.z)
  if not terrain then return end
  local result = pangea.object.moveKinematic(self.handle, {
    x = destination.x - position.x,
    y = terrain.height + settings.groundOffset - position.y,
    z = destination.z - position.z,
  }, "solid")
  if not report(result) then return end
  report(pangea.object.setRotationResult(self.handle, { x = 0, y = math.atan(-dx, -dz), z = 0 }))
end

return { __PANGEA_CUSTOM_OBJECT_EXPORT__ = object }
`;

const pickup = `${prelude}
---@param self ObjectBehaviorSelf
---@param ctx ObjectFrameContext
function object.onTriggerEnter(self, ctx)
  if not ctx.other or pangea.object.type(ctx.other) ~= "ottomatic.player" then return end
  local state = pangea.object.state(self.handle)
  if state.collected then return end
  local settings = self.parameters
  local player = pangea.player.get(0)
  if not player or player.dead then return end
  local result
  if settings.reward == "health" then
    result = pangea.player.healResult(0, settings.amount)
  elseif settings.reward == "fuel" then
    result = pangea.player.setState(0, "fuel", math.min(1, (player.fuel or 0) + settings.amount))
  else
    result = pangea.player.setScoreResult(0, (player.score or 0) + settings.scorePoints)
  end
  if not report(result) then return end
  state.collected = true
  report(pangea.object.deleteResult(self.handle))
end

return { __PANGEA_CUSTOM_OBJECT_EXPORT__ = object }
`;

const trigger = `${prelude}
---@param self ObjectBehaviorSelf
---@param ctx ObjectFrameContext
function object.onTriggerEnter(self, ctx)
  if not ctx.other or pangea.object.type(ctx.other) ~= "ottomatic.player" then return end
  local state = pangea.object.state(self.handle)
  if self.parameters.once and state.activated then return end
  if self.parameters.action == "completeLevel" then
    if not report(pangea.level.complete(0, true)) then return end
  else
    pangea.events.emit("custom.trigger", { object = self.handle, playerNum = 0 })
  end
  state.activated = true
end

return { __PANGEA_CUSTOM_OBJECT_EXPORT__ = object }
`;

const platform = `${prelude}
---@param self ObjectBehaviorSelf
---@param ctx ObjectFrameContext
function object.onSpawn(self, ctx)
  local state = pangea.object.state(self.handle)
  state.startedAt = ctx.levelTimeSeconds
  state.origin = pangea.object.position(self.handle)
  report(pangea.object.setScriptControlledResult(self.handle, true))
end

---@param self ObjectBehaviorSelf
---@param ctx ObjectFrameContext
function object.onUpdate(self, ctx)
  local state = pangea.object.state(self.handle)
  local origin = state.origin
  if not origin then return end
  local settings = self.parameters
  local elapsed = ctx.levelTimeSeconds - (state.startedAt or ctx.levelTimeSeconds)
  local travel = math.sin(elapsed * math.pi * 2 / settings.period) * settings.distance
  local destination = { x = origin.x, y = origin.y, z = origin.z }
  destination[settings.axis] = destination[settings.axis] + travel
  report(pangea.object.setPositionResult(self.handle, destination))
end

return { __PANGEA_CUSTOM_OBJECT_EXPORT__ = object }
`;

function starter(id: string, label: string, description: string, template: string): ScriptBehaviorDefinition {
  return {
    id: `otto.custom.${id}`, label, description, template, category: "Gameplay starters",
    targetKinds: ["customObject"], supportedHooks: ["onLevelStart"],
    sourceFilePath: `Data/Scripts/src/objects/${id}.lua`, previewSupport: "preview-ready",
    defaultTags: [], contributedTags: [],
  };
}

export const OTTO_OBJECT_STARTERS: readonly ScriptBehaviorDefinition[] = [
  starter("enemy", "Enemy", "Chases the player across terrain, takes weapon damage and deals contact damage. Choose its appearance separately.", enemy),
  starter("pickup", "Pickup", "Gives health, fuel or score once when the player touches it.", pickup),
  starter("trigger", "Trigger", "Emits a custom.trigger event or completes the level when entered.", trigger),
  starter("platform", "Moving platform", "Moves along a chosen axis and carries a player standing on it.", platform),
];

type Defaults = Pick<ScriptCustomObjectDefinition, "collision" | "parameterDefinitions">;
export function ottoStarterDefaults(id: string): Defaults | undefined {
  if (id === "otto.custom.enemy") return {
    collision: { kind: "preset", preset: "enemy", bounds: { width: 100, height: 150, depth: 100 } },
    parameterDefinitions: [
      { kind: "number", id: "health", label: "Health", defaultValue: 1, min: 0.01, max: 100, step: 0.01 },
      { kind: "number", id: "contactDamage", label: "Contact damage", defaultValue: 0.1, min: 0, max: 1, step: 0.05 },
      { kind: "number", id: "speed", label: "Movement speed", defaultValue: 150, min: 0, max: 2000 },
      { kind: "number", id: "detectionRange", label: "Detection range", defaultValue: 2000, min: 0, max: 20000 },
      { kind: "number", id: "stopDistance", label: "Stopping distance", defaultValue: 100, min: 0, max: 2000 },
      { kind: "number", id: "groundOffset", label: "Height above terrain", defaultValue: 0, min: -1000, max: 1000 },
    ],
  };
  if (id === "otto.custom.pickup") return {
    collision: { kind: "preset", preset: "pickup", bounds: { width: 100, height: 100, depth: 100 } },
    parameterDefinitions: [
      { kind: "enum", id: "reward", label: "Reward", defaultValue: "health", options: [{ value: "health", label: "Health" }, { value: "fuel", label: "Fuel" }, { value: "score", label: "Score" }] },
      { kind: "number", id: "amount", label: "Health / fuel amount", description: "Fraction of a full meter; used for health and fuel rewards.", defaultValue: 0.25, min: 0, max: 1, step: 0.05 },
      { kind: "number", id: "scorePoints", label: "Score points", description: "Used when Reward is Score.", defaultValue: 100, min: 0, max: 100000, step: 1 },
    ],
  };
  if (id === "otto.custom.trigger") return {
    collision: { kind: "preset", preset: "triggerBox", bounds: { width: 200, height: 200, depth: 200 } },
    parameterDefinitions: [
      { kind: "boolean", id: "once", label: "Activate only once", defaultValue: true },
      { kind: "enum", id: "action", label: "When entered", defaultValue: "event", options: [{ value: "event", label: "Emit custom.trigger event" }, { value: "completeLevel", label: "Complete level" }] },
    ],
  };
  if (id === "otto.custom.platform") return {
    collision: { kind: "preset", preset: "platform", bounds: { width: 300, height: 40, depth: 300 } },
    parameterDefinitions: [
      { kind: "enum", id: "axis", label: "Movement axis", defaultValue: "y", options: [{ value: "x", label: "East / west" }, { value: "y", label: "Up / down" }, { value: "z", label: "North / south" }] },
      { kind: "number", id: "distance", label: "Travel from start", defaultValue: 200, min: 0, max: 10000 },
      { kind: "number", id: "period", label: "Round trip time (seconds)", defaultValue: 4, min: 0.1, max: 600, step: 0.1 },
    ],
  };
  return undefined;
}
