import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceState";
import { ScriptObjectNumberField } from "./ScriptObjectNumberField";

interface Props {
  readonly definition: ScriptCustomObjectDefinition;
  readonly onUpdate: (definition: ScriptCustomObjectDefinition) => void;
}
export function ScriptObjectAnimationEditor({ definition, onUpdate }: Props) {
  const [name, setName] = useState("");
  const visual = definition.visual;
  if (visual.kind !== "nativeSkeleton" && visual.kind !== "customSkeleton") return null;
  return <section className="grid min-w-0 gap-3 border-t border-slate-800 py-5">
    <h3 className="text-sm font-semibold text-white">Animation</h3>
    {visual.kind === "nativeSkeleton" ? <ScriptObjectNumberField label="Initial animation index" value={visual.initialAnimation} integer onCommit={(initialAnimation) => onUpdate({ ...definition, visual: { ...visual, initialAnimation } })} /> : <>
      <div className="grid gap-1"><Label>Initial animation</Label><Select value={visual.initialAnimation} onValueChange={(initialAnimation) => onUpdate({ ...definition, visual: { ...visual, initialAnimation } })}>
        <SelectTrigger aria-label="Initial animation"><SelectValue /></SelectTrigger><SelectContent>{Object.keys(visual.animations).map((animation) => <SelectItem key={animation} value={animation}>{animation}</SelectItem>)}</SelectContent>
      </Select></div>
      <p className="text-xs text-slate-400">Name the skeleton’s animation indices so your script can use those names.</p>
      {Object.entries(visual.animations).map(([animation, index]) => <div key={animation} className="flex items-end gap-2">
        <div className="min-w-0 flex-1"><ScriptObjectNumberField label={animation} value={index} integer onCommit={(value) => onUpdate({ ...definition, visual: { ...visual, animations: { ...visual.animations, [animation]: value } } })} /></div>
        <Button variant="outline" disabled={animation === visual.initialAnimation} onClick={() => onUpdate({ ...definition, visual: { ...visual, animations: Object.fromEntries(Object.entries(visual.animations).filter(([candidate]) => candidate !== animation)) } })}>Remove</Button>
      </div>)}
      <div className="flex items-end gap-2"><div className="grid min-w-0 flex-1 gap-1"><Label htmlFor={`animation-name-${definition.id}`}>New animation name</Label><Input id={`animation-name-${definition.id}`} value={name} onChange={(event) => setName(event.target.value)} /></div>
        <Button disabled={!name.trim() || visual.animations[name.trim()] !== undefined} onClick={() => { onUpdate({ ...definition, visual: { ...visual, animations: { ...visual.animations, [name.trim()]: 0 } } }); setName(""); }}>Add</Button>
      </div>
    </>}
    <ScriptObjectNumberField label="Playback speed" value={visual.animationSpeed} min={0.01} max={100} onCommit={(animationSpeed) => onUpdate({ ...definition, visual: { ...visual, animationSpeed } })} />
  </section>;
}
