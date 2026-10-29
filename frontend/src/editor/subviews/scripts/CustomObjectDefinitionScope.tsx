import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";
import { getObjectDefinitionScope, placementCount } from "./scriptObjectScope";

export function CustomObjectDefinitionScope({ workspace, definition }: { workspace: ScriptWorkspaceState; definition: ScriptCustomObjectDefinition }) {
  const scope = getObjectDefinitionScope(workspace, definition.id);
  return <p className="workbench-notice">Shared definition — appearance, collision and behavior apply to {placementCount(scope.placements.length)} across all levels, and future instances. Parameter defaults apply wherever a placement has no override.{scope.replacementRules > 0 && ` Also used by ${scope.replacementRules} native replacement ${scope.replacementRules === 1 ? "rule" : "rules"}; spawned instance counts depend on the level at runtime.`}</p>;
}
