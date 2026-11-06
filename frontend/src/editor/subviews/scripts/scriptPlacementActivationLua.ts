import { objectParameterLua } from "./scriptObjectParameterLua";
import { resolveObjectParameters } from "./scriptObjectParameters";
import { placementWorldPosition } from "./scriptPlacementCoordinates";
import type { ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";

export function buildPlacementActivationRuntime(workspace: ScriptWorkspaceState): string {
  const horizontalAxis = workspace.context.gameId === "MightyMike-Android" ? "y" : "z";
  const records = Object.entries(workspace.levels).flatMap(([levelKey, level]) =>
    level.customPlacements.flatMap((placement) => {
      const definition = workspace.customObjects.find((entry) => entry.id === placement.objectId);
      if (!definition || placement.activation?.kind !== "near-player" || !/^\d+$/.test(levelKey)) return [];
      const position = placementWorldPosition(workspace.context.gameId, placement.position);
      return [`  { level = ${Number(levelKey)}, levelKey = ${JSON.stringify(levelKey)}, id = ${JSON.stringify(placement.id)}, objectId = ${JSON.stringify(placement.objectId)}, position = { x = ${position.x}, y = ${position.y}, z = ${position.z} }, radius = ${placement.activation.radius}, values = ${objectParameterLua(resolveObjectParameters(definition, placement))} },`];
    }),
  );
  return [
    "local __nearPlacements = {", ...records, "}",
    "local function __resetNearPlacements()",
    "  for _, placement in ipairs(__nearPlacements) do",
    "    if placement.handle and pangea.object.exists(placement.handle) then pangea.object.delete(placement.handle) end",
    "    placement.handle = nil",
    "    placement.inside = false",
    "  end",
    "end",
    "local function __updateNearPlacements(ctx)",
    "  if #__nearPlacements == 0 then return end",
    "  local players = {}",
    "  for index = 0, pangea.player.count() - 1 do",
    "    local player = pangea.player.get(index)",
    "    if player and player.position then players[#players + 1] = player.position end",
    "  end",
    "  if #players == 0 then return end",
    "  for _, placement in ipairs(__nearPlacements) do",
    "    if placement.level == ctx.levelNum then",
    "      local radius = placement.radius * (placement.inside and 1.2 or 1)",
    "      local nearby = false",
    "      for _, player in ipairs(players) do",
    `        local dx, dz = player.x - placement.position.x, player.${horizontalAxis} - placement.position.${horizontalAxis}`,
    "        if dx * dx + dz * dz <= radius * radius then nearby = true; break end",
    "      end",
    "      if nearby and not placement.inside then",
    "        placement.inside = true",
    "        placement.handle = __spawnPlacement(placement.objectId, placement.position, placement.values, placement.id, placement.levelKey)",
    "      elseif not nearby and placement.inside then",
    "        local deleted = not placement.handle or not pangea.object.exists(placement.handle) or pangea.object.delete(placement.handle)",
    "        if deleted then placement.handle = nil; placement.inside = false end",
    "      end",
    "    end",
    "  end",
    "end",
  ].join("\n");
}
