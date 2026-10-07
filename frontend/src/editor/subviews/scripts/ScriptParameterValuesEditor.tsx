import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getScriptParameterDefaults, parseScriptParameterValue } from "./scriptParameters";
import type { ScriptParameterDefinition, ScriptParameterValue, ScriptParameterValues } from "./scriptWorkspaceStateTypes";

interface FieldProps { parameter: ScriptParameterDefinition; value: ScriptParameterValue; onChange: (value: ScriptParameterValue) => void; }
function ParameterField({ parameter, value, onChange }: FieldProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState("");
  const id = `parameter-value-${parameter.id}`;
  const commit = () => {
    if (draft === null) return;
    const result = parseScriptParameterValue(parameter, draft);
    if (result.isErr()) { setError(result.error); return; }
    onChange(result.value); setDraft(null); setError("");
  };
  return <div className="grid gap-1">
    <Label htmlFor={id}>{parameter.label}{parameter.unit ? ` (${parameter.unit})` : ""}</Label>
    {parameter.type === "boolean" ? <Checkbox id={id} checked={value === true} onCheckedChange={(checked) => onChange(checked === true)} />
      : parameter.type === "string" && parameter.choices?.length ? <Select value={String(value)} onValueChange={onChange}><SelectTrigger id={id}><SelectValue /></SelectTrigger><SelectContent>{parameter.choices.map((choice) => <SelectItem key={choice} value={choice}>{choice}</SelectItem>)}</SelectContent></Select>
      : <Input id={id} type="text" inputMode={parameter.type === "number" ? "decimal" : "text"} value={draft ?? String(value)} aria-invalid={Boolean(error)} onChange={(event) => { setDraft(event.target.value); setError(""); }} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") commit(); if (event.key === "Escape") { setDraft(null); setError(""); } }} />}
    <p className="text-xs text-slate-400">{parameter.description}</p>
    {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
  </div>;
}

interface Props {
  parameters: readonly ScriptParameterDefinition[];
  values: ScriptParameterValues;
  inherited?: ScriptParameterValues;
  onChange: (values: ScriptParameterValues) => void;
  label?: string;
}
export function ScriptParameterValuesEditor({ parameters, values, inherited = {}, onChange, label = "Behavior parameters" }: Props) {
  const defaults = { ...getScriptParameterDefaults(parameters), ...inherited };
  return <section className="grid gap-3"><h4 className="font-medium">{label}</h4><p className="text-xs text-slate-400">Read values in Lua with self.parameters["key"]. Reset removes an override and uses the inherited default.</p>
    {parameters.length === 0 && <p className="text-xs text-slate-400">Add parameter definitions in Scripts to expose behavior controls here.</p>}
    {parameters.map((parameter) => <div key={parameter.id} className="grid gap-1 rounded border border-slate-800 p-2"><ParameterField parameter={parameter} value={values[parameter.id] ?? defaults[parameter.id] ?? parameter.defaultValue} onChange={(value) => onChange({ ...values, [parameter.id]: value })} />
      <div className="flex items-center justify-between"><span className="text-xs text-slate-400">{Object.hasOwn(values, parameter.id) ? "Override" : "Inherited default"}</span><Button size="sm" variant="ghost" disabled={!Object.hasOwn(values, parameter.id)} onClick={() => onChange(Object.fromEntries(Object.entries(values).filter(([id]) => id !== parameter.id)))}>Reset</Button></div>
    </div>)}
  </section>;
}
