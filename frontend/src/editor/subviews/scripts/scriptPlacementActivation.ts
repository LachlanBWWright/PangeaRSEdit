import { err, ok, type Result } from "neverthrow";
import { scriptPlacementActivationSchema, type ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";
import { updateWorkspaceLevel } from "./scriptWorkspaceStateRuntime";

export function setCustomPlacementActivation(workspace: ScriptWorkspaceState, placementId: string, activation: unknown): Result<ScriptWorkspaceState, string> {
  const parsed = scriptPlacementActivationSchema.safeParse(activation);
  if (!parsed.success) return err("Choose an activation policy with a positive, finite radius.");
  const placement = workspace.levels[workspace.context.levelKey]?.customPlacements.find((entry) => entry.id === placementId);
  if (!placement) return err("The selected placement no longer exists.");
  return ok(updateWorkspaceLevel(workspace, workspace.context.levelKey, (level) => ({
    ...level,
    customPlacements: level.customPlacements.map((entry) => entry.id === placementId ? { ...entry, activation: parsed.data } : entry),
  })));
}
