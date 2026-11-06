import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";
import { getObjectDefinitionScope, placementCount } from "./scriptObjectScope";

export function CustomObjectDefinitionScope({ workspace, definition }: { workspace: ScriptWorkspaceState; definition: ScriptCustomObjectDefinition }) {
  const scope = getObjectDefinitionScope(workspace, definition.id);
  return <details className="workbench-disclosure">
    <summary>Shared object · {placementCount(scope.placements.length)}</summary>
    <p>Appearance, collision and behavior apply to every placement across all levels, including future instances. Placements inherit parameter defaults unless they have an override.{scope.replacementRules > 0 && ` Also used by ${scope.replacementRules} native replacement ${scope.replacementRules === 1 ? "rule" : "rules"}; runtime instance counts vary.`}</p>
  </details>;
}
