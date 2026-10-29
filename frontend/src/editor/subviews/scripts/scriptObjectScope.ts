import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";
import type { ScriptObjectParameter } from "./scriptObjectParameterTypes";
import { validateObjectParameterValue } from "./scriptObjectParameters";

export function getObjectDefinitionScope(workspace: ScriptWorkspaceState, objectId: string) {
  const levels = Object.values(workspace.levels);
  const placements = levels.flatMap((level) => level.customPlacements).filter((placement) => placement.objectId === objectId);
  const replacements = levels.flatMap((level) => [...level.terrainReplacements, ...level.mapReplacements, ...level.splineReplacements]).filter((replacement) => replacement.customObjectId === objectId);
  return { placements, replacementRules: replacements.length };
}

export function getParameterInheritance(workspace: ScriptWorkspaceState, definition: ScriptCustomObjectDefinition, parameter: ScriptObjectParameter) {
  const scope = getObjectDefinitionScope(workspace, definition.id);
  const overridden = scope.placements.filter((placement) => {
    const value = placement.parameterOverrides?.[parameter.id];
    return value !== undefined && validateObjectParameterValue(parameter, value).isOk();
  }).length;
  return { inheriting: scope.placements.length - overridden, overridden, replacementRules: scope.replacementRules };
}

export function placementCount(count: number): string {
  return `${count} ${count === 1 ? "placement" : "placements"}`;
}
