import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ScriptCustomObjectDefinition, ScriptCustomObjectPlacement, ScriptWorkspaceState } from "./scriptWorkspaceStateTypes";
import type { ScriptObjectParameter, ScriptObjectParameterValue } from "./scriptObjectParameterTypes";
import { resolveObjectParameters, setCustomObjectParameterDefault, setCustomPlacementParameter, validateObjectParameterValue } from "./scriptObjectParameters";
import type { UpdateScriptWorkspace } from "./useScriptWorkspace";
import { getParameterInheritance, placementCount } from "./scriptObjectScope";

function ParameterScope({ workspace, definition, parameter }: { workspace: ScriptWorkspaceState; definition: ScriptCustomObjectDefinition; parameter: ScriptObjectParameter }) {
  const scope = getParameterInheritance(workspace, definition, parameter);
  return <p className="workbench-muted">Changing this default updates {placementCount(scope.inheriting)} across all levels; overrides remain on {placementCount(scope.overridden)}. New placements inherit it.{scope.replacementRules > 0 && ` ${scope.replacementRules} native replacement ${scope.replacementRules === 1 ? "rule also uses" : "rules also use"} this default; runtime instance counts vary.`}</p>;
}

function ParameterControl({ parameter, value, onChange }: { parameter: ScriptObjectParameter; value: ScriptObjectParameterValue; onChange: (value: ScriptObjectParameterValue) => void }) {
  if (parameter.kind === "boolean") return <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={value === true} onChange={(event) => onChange(event.target.checked)} />{parameter.label}</label>;
  if (parameter.kind === "enum") return <label className="grid gap-1 text-sm">{parameter.label}<select className="h-9 rounded border border-slate-600 bg-slate-900 px-2" value={String(value)} onChange={(event) => onChange(event.target.value)}>{parameter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
  return <label className="grid gap-1 text-sm">{parameter.label}<Input type="number" min={parameter.min} max={parameter.max} step={parameter.step ?? "any"} value={String(value)} onChange={(event) => { if (event.target.value !== "") onChange(event.target.valueAsNumber); }} /></label>;
}

export function CustomObjectParameters({ workspace, definition, update, onError }: { workspace: ScriptWorkspaceState; definition: ScriptCustomObjectDefinition; update: UpdateScriptWorkspace; onError: (message: string) => void }) {
  const parameters = definition.parameterDefinitions ?? [];
  if (parameters.length === 0) return null;
  return <section className="grid gap-3"><h3 className="font-medium">Shared behavior defaults</h3><p className="workbench-muted">Existing placements without overrides and new placements inherit these values. Override one placement in the item inspector. Lua receives them in self.parameters; test again to run updated defaults.</p>{parameters.map((parameter) => <div key={parameter.id} className="grid gap-1"><ParameterControl parameter={parameter} value={parameter.defaultValue} onChange={(value) => { const result = setCustomObjectParameterDefault(workspace, definition.id, parameter.id, value); if (result.isErr()) onError(result.error); else update(() => result.value); }} /><ParameterScope workspace={workspace} definition={definition} parameter={parameter} />{parameter.description && <p className="workbench-muted">{parameter.description}</p>}</div>)}</section>;
}

export function CustomPlacementParameters({ workspace, placement, update, onError }: { workspace: ScriptWorkspaceState; placement: ScriptCustomObjectPlacement; update: UpdateScriptWorkspace; onError?: (message: string) => void }) {
  const definition = workspace.customObjects.find((entry) => entry.id === placement.objectId);
  if (!definition || !definition.parameterDefinitions?.length) return null;
  const values = resolveObjectParameters(definition, placement);
  return <section className="grid gap-3"><h3 className="font-medium">This placement’s behavior</h3><p className="workbench-muted">Overrides affect only this placement. Resetting a value uses the shared definition default and follows future default changes.</p>{definition.parameterDefinitions.map((parameter) => {
    const overrideValue = placement.parameterOverrides?.[parameter.id];
    const override = overrideValue !== undefined && validateObjectParameterValue(parameter, overrideValue).isOk();
    return <div key={parameter.id} className="grid gap-1"><ParameterControl parameter={parameter} value={values[parameter.id] ?? parameter.defaultValue} onChange={(value) => { const result = setCustomPlacementParameter(workspace, placement.id, parameter.id, value); if (result.isErr()) onError?.(result.error); else update(() => result.value); }} /><div className="flex items-center justify-between gap-2"><span className="workbench-muted">{override ? "Placement override" : overrideValue !== undefined ? "Invalid override; uses definition default" : "Uses definition default"}</span>{overrideValue !== undefined && <Button size="sm" variant="ghost" onClick={() => { const result = setCustomPlacementParameter(workspace, placement.id, parameter.id, undefined); if (result.isErr()) onError?.(result.error); else update(() => result.value); }}>Reset to default</Button>}</div></div>;
  })}</section>;
}
