import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusChip } from "./ScriptSharedComponents";
import { parseParamType } from "./scriptWorkspaceHelpers";
import type { ScriptParameterDefinition } from "./scriptWorkspaceState";

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
}: ScriptParametersPanelProps) {
  return (
    <Card className="border-slate-800 bg-slate-950/70">
      <CardHeader>
        <CardTitle className="text-white">Parameter Registry</CardTitle>
        <CardDescription>
          Typed parameter metadata stays out of raw script code and
          exports with the extended package.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="grid gap-2 md:grid-cols-2">
          <div className="grid gap-2">
            <Label htmlFor="param-id">Param id</Label>
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
              onValueChange={(value) => onParamTypeChange(parseParamType(value))}
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
            <Input
              id="param-default"
              value={paramDefaultValue}
              onChange={(event) => onParamDefaultValueChange(event.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="param-description">Description</Label>
          <textarea
            id="param-description"
            className="min-h-20 rounded-md border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white"
            value={paramDescription}
            onChange={(event) => onParamDescriptionChange(event.target.value)}
          />
        </div>
        <Button onClick={onSaveParam}>Save Parameter</Button>
        {paramOptions.map((param) => (
          <div
            key={param.id}
            className="rounded-xl border border-slate-800 bg-slate-900/80 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-white">{param.label}</p>
                <p className="text-xs text-slate-400">{param.id}</p>
              </div>
              <StatusChip label={param.type} tone="neutral" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}