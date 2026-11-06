import { err, ok, type Result } from "neverthrow";
import type { ScriptObjectParameter } from "./scriptObjectParameterTypes";
import type { ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";
import { updateCustomObjectDefinition } from "./scriptWorkspaceStateRuntime";
import { validateObjectParameters, validateObjectParameterValue } from "./scriptObjectParameters";

export function saveObjectParameter(state: ScriptWorkspaceState, objectId: string, parameter: ScriptObjectParameter, existingId?: string): Result<ScriptWorkspaceState, string> {
  const definition = state.customObjects.find((entry) => entry.id === objectId);
  if (!definition) return err("Custom object no longer exists.");
  const previous = definition.parameterDefinitions ?? [];
  if (existingId !== undefined && !previous.some((entry) => entry.id === existingId)) return err("Behavior setting no longer exists.");
  if (existingId !== undefined && parameter.id !== existingId) return err("Keep the identifier unchanged so existing Lua references remain valid.");
  const parameters = existingId === undefined ? [...previous, parameter] : previous.map((entry) => entry.id === existingId ? parameter : entry);
  const checked = validateObjectParameters(parameters);
  if (checked.isErr()) return err(checked.error);
  const updated = cleanParameterOverrides(state, objectId, parameter.id, parameter);
  return ok(updateCustomObjectDefinition(updated, { ...definition, parameterDefinitions: parameters }));
}

export function removeObjectParameter(state: ScriptWorkspaceState, objectId: string, parameterId: string): Result<ScriptWorkspaceState, string> {
  const definition = state.customObjects.find((entry) => entry.id === objectId);
  if (!definition?.parameterDefinitions?.some((entry) => entry.id === parameterId)) return err("Behavior setting no longer exists.");
  const updated = cleanParameterOverrides(state, objectId, parameterId);
  return ok(updateCustomObjectDefinition(updated, { ...definition, parameterDefinitions: definition.parameterDefinitions.filter((entry) => entry.id !== parameterId) }));
}

function cleanParameterOverrides(state: ScriptWorkspaceState, objectId: string, parameterId: string, parameter?: ScriptObjectParameter): ScriptWorkspaceState {
  const levels = Object.fromEntries(Object.entries(state.levels).map(([key, level]) => [key, {
    ...level,
    customPlacements: level.customPlacements.map((placement) => {
      const value = placement.parameterOverrides?.[parameterId];
      if (placement.objectId !== objectId || value === undefined || (parameter && validateObjectParameterValue(parameter, value).isOk())) return placement;
      return { ...placement, parameterOverrides: Object.fromEntries(Object.entries(placement.parameterOverrides ?? {}).filter(([id]) => id !== parameterId)) };
    }),
  }]));
  return { ...state, levels };
}
