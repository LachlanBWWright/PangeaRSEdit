import type { ScriptHookId, ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";

export function scriptModuleVariable(path: string): string {
  return `__module_${path.replace(/[^a-zA-Z0-9]+/g, "_")}`;
}

export function buildLevelModuleRouting(state: ScriptWorkspaceState): string {
  const levels = Object.entries(state.levels).map(([levelKey, level]) => {
    const hooks = state.context.supportedHooks.map((hook) => {
      const assigned = level.globalHooks.filter((entry) => entry.hookId === hook).map((entry) => entry.sourceFilePath);
      const bindings = hook === "onTerrainItem" ? level.terrainBindings
        : hook === "onSplineItem" ? level.splineBindings
          : hook === "onMapItem" ? level.mapItemBindings : [];
      const paths = new Set([...assigned, ...bindings.map((binding) => binding.sourceFilePath)]);
      const modules = state.moduleOrder.filter((path) => paths.has(path) && state.sourceFiles[path]);
      return `    [${JSON.stringify(hook)}] = { ${modules.map(scriptModuleVariable).join(", ")} },`;
    });
    return [`  [${JSON.stringify(levelKey)}] = {`, ...hooks, "  },"].join("\n");
  });
  return [
    "local __levelModules = {", ...levels, "}",
    "local function __modulesForHook(name, ctx)",
    "  local result = {}",
    "  for _, candidate in ipairs(__modules) do result[#result + 1] = candidate end",
    "  local level = __levelModules[tostring(ctx.levelNum)] or {}",
    "  for _, candidate in ipairs(level[name] or {}) do result[#result + 1] = candidate end",
    "  return result",
    "end",
  ].join("\n");
}

export function getScopedModulePaths(state: ScriptWorkspaceState): ReadonlySet<string> {
  const assigned = Object.values(state.levels).flatMap((level) => [
    ...level.globalHooks, ...level.terrainBindings, ...level.splineBindings, ...level.mapItemBindings,
  ]).map((entry) => entry.sourceFilePath);
  return new Set([
    ...assigned,
    ...state.customObjects.map((entry) => entry.sourceFilePath),
    ...state.behaviorCatalog.map((entry) => entry.sourceFilePath),
  ]);
}

export function buildLevelPlacementSpawns(state: ScriptWorkspaceState, hook: ScriptHookId): readonly string[] {
  const start = state.context.supportedHooks.includes("onLevelStart") ? "onLevelStart"
    : state.context.supportedHooks.includes("onAreaStart") ? "onAreaStart" : "onRaceStart";
  if (hook !== start) return [];
  return Object.entries(state.levels).flatMap(([key, level]) => {
    if (!/^\d+$/.test(key) || level.customPlacements.length === 0) return [];
    const spawns = level.customPlacements.flatMap((placement) => {
      if (!state.customObjects.some((definition) => definition.id === placement.objectId)) return [];
      const { x, y, z } = placement.position;
      return [`    pangea.spawn.scripted(${JSON.stringify(placement.objectId)}, { x = ${x}, y = ${y}, z = ${z} })`];
    });
    return [`  if ctx.levelNum == ${Number(key)} then`, ...spawns, "  end"];
  });
}
