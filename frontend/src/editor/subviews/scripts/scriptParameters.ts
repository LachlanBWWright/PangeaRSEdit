import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import type { ScriptDiagnostic, ScriptParameterDefinition, ScriptParameterValue, ScriptParameterValues, ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";
import type { ScriptParameterEditingDetails } from "./ScriptParameterConstraintsFields";

export function buildScriptParameterDefinition(input: ScriptParameterDefinition, details: ScriptParameterEditingDetails): Result<ScriptParameterDefinition, string> {
  const minimum = details.minimum.trim() ? z.coerce.number().finite().safeParse(details.minimum) : undefined;
  const maximum = details.maximum.trim() ? z.coerce.number().finite().safeParse(details.maximum) : undefined;
  if (input.type === "number" && (minimum?.success === false || maximum?.success === false)) return err("Enter finite minimum and maximum values, or leave them empty.");
  return validateScriptParameter({ ...input,
    ...(input.type === "number" && minimum?.success ? { minimum: minimum.data } : {}),
    ...(input.type === "number" && maximum?.success ? { maximum: maximum.data } : {}),
    ...(input.type === "number" && details.unit.trim() ? { unit: details.unit.trim() } : {}),
    ...(input.type === "string" && details.choices.length ? { choices: [...details.choices] } : {}),
  });
}

export function parseScriptParameterValue(parameter: ScriptParameterDefinition, text: string): Result<ScriptParameterValue, string> {
  if (parameter.type === "boolean") {
    const parsed = z.enum(["true", "false"]).safeParse(text.trim().toLowerCase());
    return parsed.success ? ok(parsed.data === "true") : err("Choose true or false.");
  }
  if (parameter.type === "string") {
    if (parameter.choices?.length && !parameter.choices.includes(text)) return err("Choose one of the configured values.");
    return ok(text);
  }
  if (!text.trim()) return err("Enter a number.");
  const number = z.coerce.number().finite().safeParse(text);
  if (!number.success) return err("Enter a finite number.");
  if (parameter.minimum !== undefined && number.data < parameter.minimum) return err(`Minimum: ${parameter.minimum}${parameter.unit ? ` ${parameter.unit}` : ""}.`);
  if (parameter.maximum !== undefined && number.data > parameter.maximum) return err(`Maximum: ${parameter.maximum}${parameter.unit ? ` ${parameter.unit}` : ""}.`);
  return ok(number.data);
}
export function validateScriptParameter(parameter: ScriptParameterDefinition): Result<ScriptParameterDefinition, string> {
  if (!parameter.id.trim() || !parameter.label.trim()) return err("Name the parameter and its Lua key.");
  if (parameter.minimum !== undefined && parameter.maximum !== undefined && parameter.minimum > parameter.maximum) return err("Minimum must not exceed maximum.");
  const value = parseScriptParameterValue(parameter, parameter.defaultValue);
  return value.isErr() ? err(value.error) : ok(parameter);
}
export function getScriptParameterDefaults(parameters: readonly ScriptParameterDefinition[]): ScriptParameterValues {
  const defaults: Record<string, ScriptParameterValue> = {};
  for (const parameter of parameters) {
    const value = parseScriptParameterValue(parameter, parameter.defaultValue);
    if (value.isOk()) defaults[parameter.id] = value.value;
  }
  return defaults;
}
export function removeScriptParameter(state: ScriptWorkspaceState, id: string): Result<ScriptWorkspaceState, string> {
  const assignments = Object.values(state.levels).flatMap((level) => [...level.globalHooks, ...level.terrainBindings, ...level.splineBindings, ...level.mapItemBindings]);
  const references = assignments.filter((entry) => entry.paramRefs.includes(id));
  const definitions = state.customObjects.filter((item) => item.parameters && Object.hasOwn(item.parameters, id));
  const placements = Object.values(state.levels).flatMap((level) => level.customPlacements).filter((item) => item.parameters && Object.hasOwn(item.parameters, id));
  if (references.length + definitions.length + placements.length > 0) return err("Remove this parameter's assignments and item overrides before deleting it.");
  const sourceReferences = Object.values(state.sourceFiles).filter((source) => source.role !== "generated-entry" && (source.content.includes(JSON.stringify(id)) || source.content.includes(`'${id}'`)));
  if (sourceReferences.length > 0) return err(`Update this parameter's Lua references before deleting it: ${sourceReferences.map((source) => source.path).join(", ")}`);
  return ok({ ...state, params: state.params.filter((parameter) => parameter.id !== id), compiledFiles: {} });
}

function parameterValuesErrors(parameters: readonly ScriptParameterDefinition[], values: ScriptParameterValues, label: string, filePath: string): readonly ScriptDiagnostic[] {
  const diagnostics: ScriptDiagnostic[] = [];
  for (const [id, value] of Object.entries(values)) {
    const parameter = parameters.find((entry) => entry.id === id);
    const parsed = parameter?.type === "number" ? z.number().finite().safeParse(value) : parameter?.type === "boolean" ? z.boolean().safeParse(value) : z.string().safeParse(value);
    const validation = parameter && parsed.success ? parseScriptParameterValue(parameter, String(value)) : err(parameter ? `Value must be ${parameter.type}.` : "Register this parameter before using an override.");
    if (validation.isErr()) diagnostics.push({ category: "source-validation", severity: "error", message: `${label} · ${id}: ${validation.error}`, code: "parameter.value", filePath, line: 0, column: 0 });
  }
  return diagnostics;
}
export function getScriptParameterDiagnostics(state: ScriptWorkspaceState): readonly ScriptDiagnostic[] {
  const diagnostics: ScriptDiagnostic[] = [];
  for (const parameter of state.params) {
    const result = validateScriptParameter(parameter);
    if (result.isErr()) diagnostics.push({ category: "source-validation", severity: "error", message: `${parameter.label}: ${result.error}`, code: "parameter.definition", filePath: "Data/Scripts/config/params.json", line: 0, column: 0 });
  }
  for (const item of state.customObjects) diagnostics.push(...parameterValuesErrors(state.params, item.parameters ?? {}, item.label, "Data/Scripts/config/objects.json"));
  for (const [levelKey, level] of Object.entries(state.levels)) {
    for (const placement of level.customPlacements) diagnostics.push(...parameterValuesErrors(state.params, placement.parameters ?? {}, placement.label, `Data/Scripts/config/placements/level-${levelKey}.json`));
  }
  return diagnostics;
}
