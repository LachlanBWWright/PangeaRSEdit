import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { parseParamType } from "./scriptWorkspaceHelpers";
import type { ScriptParameterDefinition } from "./scriptWorkspaceState";
import { Checkbox } from "@/components/ui/checkbox";
import { ScriptParameterConstraintsFields, type ScriptParameterEditingDetails } from "./ScriptParameterConstraintsFields";

interface ScriptParametersPanelProps {
  paramId: string;
  onParamIdChange: (value: string) => void;
  paramLabel: string;
  onParamLabelChange: (value: string) => void;
  paramType: "number" | "boolean" | "string";
  onParamTypeChange: (value: "number" | "boolean" | "string") => void;
  paramDefaultValue: string;
  onParamDefaultValueChange: (value: string) => void;
  paramDescription: string;
  onParamDescriptionChange: (value: string) => void;
  paramOptions: readonly ScriptParameterDefinition[];
  onSaveParam: () => void;
  details?: ScriptParameterEditingDetails;
  onDetailsChange?: (details: ScriptParameterEditingDetails) => void;
  onEditParam?: (parameter: ScriptParameterDefinition) => void;
  onDeleteParam?: (id: string) => void;
}

export function ScriptParametersPanel({
  paramId,
  onParamIdChange,
  paramLabel,
  onParamLabelChange,
  paramType,
  onParamTypeChange,
  paramDefaultValue,
  onParamDefaultValueChange,
  paramDescription,
  onParamDescriptionChange,
  paramOptions,
  onSaveParam,
  details,
  onDetailsChange,
  onEditParam,
  onDeleteParam,
}: ScriptParametersPanelProps) {
  return (
    <section className="min-w-0">
        <h3 className="font-semibold text-white">Behavior controls</h3>
        <p className="mt-1 text-sm text-slate-400">Define named values that item definitions and individual instances can customize.</p>
        <details className="mt-1 text-xs text-slate-400"><summary className="cursor-pointer">How values inherit</summary><p className="mt-1">Values inherit game defaults, then definition defaults, then instance overrides. Lua reads <code>self.parameters["key"]</code>.</p></details>
      <div className="mt-3 grid gap-3">
        <div className="grid gap-2 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="param-id">Lua key</Label>
            <Input
              id="param-id"
              value={paramId}
              onChange={(event) => onParamIdChange(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="param-label">Label</Label>
            <Input
              id="param-label"
              value={paramLabel}
              onChange={(event) => onParamLabelChange(event.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-2 md:grid-cols-[160px_1fr]">
          <div className="grid gap-2">
            <Label htmlFor="param-type">Type</Label>
            <Select
              value={paramType}
              onValueChange={(value) =>
                onParamTypeChange(parseParamType(value))
              }
            >
              <SelectTrigger id="param-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="number">number</SelectItem>
                <SelectItem value="boolean">boolean</SelectItem>
                <SelectItem value="string">string</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="param-default">Default value</Label>
            {paramType === "boolean" ? <Checkbox id="param-default" checked={paramDefaultValue === "true"} onCheckedChange={(checked) => onParamDefaultValueChange(String(checked === true))} /> : paramType === "string" && details?.choices.length ? <Select value={paramDefaultValue} onValueChange={onParamDefaultValueChange}><SelectTrigger id="param-default"><SelectValue /></SelectTrigger><SelectContent>{details.choices.map((choice) => <SelectItem key={choice} value={choice}>{choice}</SelectItem>)}</SelectContent></Select> : <Input
              id="param-default"
              inputMode={paramType === "number" ? "decimal" : "text"}
              value={paramDefaultValue}
              onChange={(event) =>
                onParamDefaultValueChange(event.target.value)
              }
            />}
          </div>
        </div>
        {details && onDetailsChange && <details className="text-sm text-slate-400"><summary className="cursor-pointer">Validation and display options</summary><div className="mt-3"><ScriptParameterConstraintsFields type={paramType} details={details} onChange={onDetailsChange} /></div></details>}
        <div className="grid gap-2">
          <Label htmlFor="param-description">Description</Label>
          <textarea
            id="param-description"
            className="min-h-16 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            value={paramDescription}
            onChange={(event) => onParamDescriptionChange(event.target.value)}
          />
        </div>
        <Button className="justify-self-start" onClick={onSaveParam}>Save control</Button>
        <div className="divide-y divide-slate-800 border-y border-slate-800">
        {paramOptions.map((param) => (
          <div
            key={param.id}
            className="flex min-w-0 flex-wrap items-start justify-between gap-3 py-3"
          >
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium text-white">{param.label}</p>
                <p className="text-xs text-slate-400">Default: {param.defaultValue}{param.unit ? ` ${param.unit}` : ""}{param.description ? ` · ${param.description}` : ""}</p>
                <details className="mt-1 text-xs text-slate-400"><summary className="cursor-pointer">Control details</summary><p className="mt-1 font-mono">{param.id} · {param.type}</p></details>
              </div>
              <div className="flex shrink-0 gap-1">{onEditParam && <Button size="sm" variant="ghost" onClick={() => onEditParam(param)}>Edit</Button>}{onDeleteParam && <Button size="sm" variant="ghost" onClick={() => onDeleteParam(param.id)}>Delete</Button>}</div>
          </div>
        ))}
        </div>
      </div>
    </section>
  );
}
