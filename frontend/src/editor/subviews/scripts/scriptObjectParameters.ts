import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import type { ScriptCustomObjectDefinition, ScriptCustomObjectPlacement, ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";
import { scriptObjectParameterSchema, type ScriptObjectParameter, type ScriptObjectParameterValue } from "./scriptObjectParameterTypes";
import { updateCustomObjectDefinition, updateWorkspaceLevel } from "./scriptWorkspaceStateRuntime";

export function validateObjectParameterValue(parameter: ScriptObjectParameter, value: ScriptObjectParameterValue): Result<ScriptObjectParameterValue, string> {
  if (parameter.kind === "boolean") return z.boolean().safeParse(value).success ? ok(value) : err(`${parameter.label} must be enabled or disabled.`);
  if (parameter.kind === "enum") return parameter.options.some((option) => option.value === value) ? ok(value) : err(`Choose a valid ${parameter.label.toLowerCase()}.`);
  const parsed = z.number().finite().safeParse(value);
  if (!parsed.success) return err(`${parameter.label} must be a finite number.`);
  if (parameter.min !== undefined && parsed.data < parameter.min) return err(`${parameter.label} must be at least ${parameter.min}.`);
  if (parameter.max !== undefined && parsed.data > parameter.max) return err(`${parameter.label} must be at most ${parameter.max}.`);
  if (parameter.step !== undefined) {
    const steps = (parsed.data - (parameter.min ?? 0)) / parameter.step;
    if (Math.abs(steps - Math.round(steps)) > 1e-8) return err(`${parameter.label} must use increments of ${parameter.step}.`);
  }
  return ok(parsed.data);
}

export function validateObjectParameters(parameters: readonly ScriptObjectParameter[]): Result<void, string> {
  const ids = new Set<string>();
  for (const parameter of parameters) {
    if (!scriptObjectParameterSchema.safeParse(parameter).success) return err("Invalid behavior parameter definition.");
    if (ids.has(parameter.id)) return err(`Duplicate behavior parameter: ${parameter.id}.`);
    ids.add(parameter.id);
    if (parameter.kind === "number" && parameter.min !== undefined && parameter.max !== undefined && parameter.min > parameter.max) return err(`${parameter.label} has an invalid range.`);
    if (parameter.kind === "enum" && new Set(parameter.options.map((option) => option.value)).size !== parameter.options.length) return err(`${parameter.label} has duplicate choices.`);
    const checked = validateObjectParameterValue(parameter, parameter.defaultValue);
    if (checked.isErr()) return err(checked.error);
  }
  return ok(undefined);
}

export function resolveObjectParameters(definition: ScriptCustomObjectDefinition, placement?: ScriptCustomObjectPlacement): Record<string, ScriptObjectParameterValue> {
  const values: Record<string, ScriptObjectParameterValue> = {};
  for (const parameter of definition.parameterDefinitions ?? []) {
    const override = placement?.parameterOverrides?.[parameter.id];
    values[parameter.id] = override !== undefined && validateObjectParameterValue(parameter, override).isOk() ? override : parameter.defaultValue;
  }
  return values;
}

export function setCustomObjectParameterDefault(state: ScriptWorkspaceState, objectId: string, parameterId: string, value: ScriptObjectParameterValue): Result<ScriptWorkspaceState, string> {
  const definition = state.customObjects.find((entry) => entry.id === objectId);
  const parameter = definition?.parameterDefinitions?.find((entry) => entry.id === parameterId);
  if (!definition || !parameter) return err("Behavior parameter no longer exists.");
  const checked = validateObjectParameterValue(parameter, value);
  if (checked.isErr()) return err(checked.error);
  const parameters = definition.parameterDefinitions?.map((entry) => {
    if (entry.id !== parameterId) return entry;
    const parsed = scriptObjectParameterSchema.safeParse({ ...entry, defaultValue: checked.value });
    return parsed.success ? parsed.data : entry;
  });
  return ok(updateCustomObjectDefinition(state, { ...definition, parameterDefinitions: parameters }));
}

export function setCustomPlacementParameter(state: ScriptWorkspaceState, placementId: string, parameterId: string, value: ScriptObjectParameterValue | undefined): Result<ScriptWorkspaceState, string> {
  const placement = state.levels[state.context.levelKey]?.customPlacements.find((entry) => entry.id === placementId);
  const definition = state.customObjects.find((entry) => entry.id === placement?.objectId);
  const parameter = definition?.parameterDefinitions?.find((entry) => entry.id === parameterId);
  if (!placement || !parameter) return err("Placement or behavior parameter no longer exists.");
  if (value !== undefined) {
    const checked = validateObjectParameterValue(parameter, value);
    if (checked.isErr()) return err(checked.error);
  }
  const overrides = Object.fromEntries(Object.entries(placement.parameterOverrides ?? {}).filter(([id]) => id !== parameterId));
  if (value !== undefined) overrides[parameterId] = value;
  return ok(updateWorkspaceLevel(state, state.context.levelKey, (level) => ({ ...level, customPlacements: level.customPlacements.map((entry) => entry.id === placementId ? { ...entry, parameterOverrides: overrides } : entry) })));
}
