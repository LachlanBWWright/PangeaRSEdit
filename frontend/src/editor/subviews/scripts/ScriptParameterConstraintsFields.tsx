import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ScriptParameterEditingDetails {
  readonly minimum: string;
  readonly maximum: string;
  readonly unit: string;
  readonly choices: readonly string[];
}
interface Props { type: "number" | "boolean" | "string"; details: ScriptParameterEditingDetails; onChange: (details: ScriptParameterEditingDetails) => void; }
export function ScriptParameterConstraintsFields({ type, details, onChange }: Props) {
  const [choice, setChoice] = useState("");
  if (type === "boolean") return null;
  return <details className="rounded border border-slate-800 p-3"><summary className="cursor-pointer">Valid values and units</summary><div className="mt-3 grid gap-3">
    {type === "number" && <><div className="grid grid-cols-2 gap-2"><div><Label htmlFor="parameter-minimum">Minimum (optional)</Label><Input id="parameter-minimum" inputMode="decimal" value={details.minimum} onChange={(event) => onChange({ ...details, minimum: event.target.value })} /></div><div><Label htmlFor="parameter-maximum">Maximum (optional)</Label><Input id="parameter-maximum" inputMode="decimal" value={details.maximum} onChange={(event) => onChange({ ...details, maximum: event.target.value })} /></div></div><div><Label htmlFor="parameter-unit">Unit</Label><Input id="parameter-unit" placeholder="seconds, health, game units…" value={details.unit} onChange={(event) => onChange({ ...details, unit: event.target.value })} /></div></>}
    {type === "string" && <><p className="text-xs text-slate-400">Add named choices to use a dropdown instead of free text.</p><div className="flex gap-2"><Input aria-label="New parameter choice" value={choice} onChange={(event) => setChoice(event.target.value)} /><Button variant="outline" disabled={!choice.trim() || details.choices.includes(choice.trim())} onClick={() => { onChange({ ...details, choices: [...details.choices, choice.trim()] }); setChoice(""); }}>Add choice</Button></div>{details.choices.map((value) => <div key={value} className="flex items-center justify-between"><span>{value}</span><Button variant="ghost" size="sm" onClick={() => onChange({ ...details, choices: details.choices.filter((candidate) => candidate !== value) })}>Remove {value}</Button></div>)}</>}
  </div></details>;
}
