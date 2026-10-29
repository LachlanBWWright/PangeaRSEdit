import type { ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";
import type { ScriptObjectParameterValue } from "./scriptObjectParameterTypes";
import { resolveObjectParameters } from "./scriptObjectParameters";

export function objectParameterLua(values: Readonly<Record<string, ScriptObjectParameterValue>>): string {
  return `{ ${Object.entries(values).map(([key, value]) => `[${JSON.stringify(key)}] = ${JSON.stringify(value)}`).join(", ")} }`;
}

export function buildObjectParameterRuntime(state: ScriptWorkspaceState): string {
  return [
    "local __parameterDefaults = {",
    ...state.customObjects.map((definition) => `  [${JSON.stringify(definition.id)}] = ${objectParameterLua(resolveObjectParameters(definition))},`),
    "}",
    "local __pendingPlacement = nil",
    "local __instanceParameters = {}",
    "local function __definitionForObject(ctx)",
    "  if ctx.definitionId ~= nil and ctx.definitionId ~= '' then return ctx.definitionId end",
    "  return ctx.objectType",
    "end",
    "local function __parametersForObject(ctx)",
    "  local key = tostring(ctx.object.id) .. ':' .. tostring(ctx.object.generation)",
    "  local definitionId = __definitionForObject(ctx)",
    "  if __instanceParameters[key] == nil or ctx.event == 'spawn' then",
    "    local values = {}",
    "    for key, value in pairs(__parameterDefaults[definitionId] or {}) do values[key] = value end",
    "    if __pendingPlacement and __pendingPlacement.objectId == definitionId then",
    "      for key, value in pairs(__pendingPlacement.values) do values[key] = value end",
    "      local state = pangea.object.state(ctx.object)",
    "      state.__pangeaPlacementId = __pendingPlacement.id",
    "      state.__pangeaPlacementLevel = __pendingPlacement.level",
    "      __pendingPlacement = nil",
    "    end",
    "    __instanceParameters[key] = values",
    "  end",
    "  local snapshot = {}",
    "  for name, value in pairs(__instanceParameters[key]) do snapshot[name] = value end",
    "  if ctx.event == 'destroy' or ctx.event == 'streamOut' then __instanceParameters[key] = nil end",
    "  return snapshot",
    "end",
    "local function __spawnPlacement(objectId, position, values, placementId, levelKey)",
    "  local previous = __pendingPlacement",
    "  __pendingPlacement = { objectId = objectId, values = values, id = placementId, level = levelKey }",
    "  local handle = pangea.spawn.scripted(objectId, position)",
    "  __pendingPlacement = previous",
    "  if not handle then",
    "    pangea.log.error(string.format('Failed to spawn placement %s (definition %s, level %s). Inspect native command rejection and asset dependencies.', placementId, objectId, levelKey))",
    "  end",
    "  return handle",
    "end",
  ].join("\n");
}
