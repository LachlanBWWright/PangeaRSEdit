import { err, ok, type Result } from "neverthrow";
import type { ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";

export function getCustomObjectUsageCounts(state: ScriptWorkspaceState): Readonly<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const level of Object.values(state.levels)) {
    for (const placement of level.customPlacements) {
      counts[placement.objectId] = (counts[placement.objectId] ?? 0) + 1;
    }
    for (const replacement of [...level.terrainReplacements, ...level.mapReplacements, ...level.splineReplacements]) {
      counts[replacement.customObjectId] = (counts[replacement.customObjectId] ?? 0) + 1;
    }
  }
  return counts;
}

export function duplicateCustomObjectDefinition(state: ScriptWorkspaceState, id: string): Result<ScriptWorkspaceState, string> {
  const original = state.customObjects.find((definition) => definition.id === id);
  if (!original) return err("This item definition no longer exists.");
  let suffix = 2;
  let nextId = `${id}.copy`;
  while (state.customObjects.some((definition) => definition.id === nextId)) {
    nextId = `${id}.copy${suffix++}`;
  }
  const source = state.sourceFiles[original.sourceFilePath];
  if (!source) return err("The original item's behavior source is missing.");
  const stem = nextId.replace(/[^a-zA-Z0-9_-]/g, "-");
  let sourcePath = `Data/Scripts/src/objects/${stem}.lua`;
  let pathSuffix = 2;
  while (state.sourceFiles[sourcePath]) sourcePath = `Data/Scripts/src/objects/${stem}-${pathSuffix++}.lua`;
  return ok({
    ...state,
    customObjects: [...state.customObjects, { ...original, id: nextId, label: `${original.label} copy`, sourceFilePath: sourcePath }],
    sourceFiles: { ...state.sourceFiles, [sourcePath]: { ...source, path: sourcePath, ownerId: nextId, readOnly: false } },
    moduleOrder: [...state.moduleOrder, sourcePath],
    compiledFiles: {},
  });
}

export function deleteCustomObjectDefinition(state: ScriptWorkspaceState, id: string): Result<ScriptWorkspaceState, string> {
  const usage = getCustomObjectUsageCounts(state)[id] ?? 0;
  if (usage > 0) return err(`This item is used by ${usage} placement${usage === 1 ? "" : "s"} or replacement${usage === 1 ? "" : "s"}. Remove or reassign those uses before deleting its definition.`);
  return ok({ ...state, customObjects: state.customObjects.filter((definition) => definition.id !== id) });
}
