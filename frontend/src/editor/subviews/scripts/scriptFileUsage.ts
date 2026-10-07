import type { ScriptWorkspaceState } from "./scriptWorkspaceState";

export function getScriptFileUsageLabels(workspace: ScriptWorkspaceState, filePath: string): readonly string[] {
  const items = workspace.customObjects.filter((item) => item.sourceFilePath === filePath);
  const objectTypes = workspace.behaviorCatalog.filter((behavior) => behavior.sourceFilePath === filePath && behavior.objectType !== undefined);
  const assignments = Object.values(workspace.levels).flatMap((level) => [
    ...level.globalHooks, ...level.terrainBindings, ...level.splineBindings, ...level.mapItemBindings,
  ]).filter((assignment) => assignment.sourceFilePath === filePath);
  return [...new Set([
    ...items.map((item) => item.label),
    ...objectTypes.map((behavior) => `${behavior.label} (object type)`),
    ...assignments.map((assignment) => assignment.label),
  ])];
}
