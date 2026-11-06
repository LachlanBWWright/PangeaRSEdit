import { err, ok, type Result } from "neverthrow";
import { scriptObjectParameterSchema, type ScriptObjectParameter } from "./scriptObjectParameterTypes";

export interface ObjectParameterDraft {
  id: string;
  label: string;
  description: string;
  kind: "number" | "boolean" | "enum";
  numberDefault: string;
  min: string;
  max: string;
  step: string;
  booleanDefault: boolean;
  enumDefault: string;
  options: { value: string; label: string }[];
}

export function createParameterDraft(parameter?: ScriptObjectParameter): ObjectParameterDraft {
  return {
    id: parameter?.id ?? "", label: parameter?.label ?? "", description: parameter?.description ?? "", kind: parameter?.kind ?? "number",
    numberDefault: parameter?.kind === "number" ? String(parameter.defaultValue) : "0",
    min: parameter?.kind === "number" && parameter.min !== undefined ? String(parameter.min) : "",
    max: parameter?.kind === "number" && parameter.max !== undefined ? String(parameter.max) : "",
    step: parameter?.kind === "number" && parameter.step !== undefined ? String(parameter.step) : "",
    booleanDefault: parameter?.kind === "boolean" ? parameter.defaultValue : false,
    enumDefault: parameter?.kind === "enum" ? parameter.defaultValue : "",
    options: parameter?.kind === "enum" ? parameter.options : [{ value: "", label: "" }],
  };
}

export function parseParameterDraft(draft: ObjectParameterDraft): Result<ScriptObjectParameter, string> {
  const identity = { id: draft.id.trim(), label: draft.label.trim(), description: draft.description.trim() || undefined };
  const optionalNumber = (value: string) => value.trim() === "" ? undefined : Number(value);
  const content = draft.kind === "number"
    ? { ...identity, kind: draft.kind, defaultValue: draft.numberDefault.trim() === "" ? undefined : Number(draft.numberDefault), min: optionalNumber(draft.min), max: optionalNumber(draft.max), step: optionalNumber(draft.step) }
    : draft.kind === "boolean"
      ? { ...identity, kind: draft.kind, defaultValue: draft.booleanDefault }
      : { ...identity, kind: draft.kind, defaultValue: draft.enumDefault, options: draft.options.map((option) => ({ value: option.value.trim(), label: option.label.trim() })) };
  const parsed = scriptObjectParameterSchema.safeParse(content);
  if (!parsed.success) return err(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; "));
  return ok(parsed.data);
}
