import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScriptNumberField } from "./ScriptNumberField";
import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceState";

export function CustomObjectAnimations({ definition, onChange }: { definition: ScriptCustomObjectDefinition; onChange: (definition: ScriptCustomObjectDefinition) => void }) {
  const [name, setName] = useState("");
  const visual = definition.visual;
  if (visual.kind !== "nativeSkeleton" && visual.kind !== "customSkeleton") return null;
  return <div className="workbench-section">
    <h3>Animation</h3>
    <ScriptNumberField label="Playback speed" value={visual.animationSpeed} min={0.01} max={100} step={0.05} onChange={(animationSpeed) => onChange({ ...definition, visual: { ...visual, animationSpeed } })} />
    {visual.kind === "nativeSkeleton" ? <ScriptNumberField label="Initial animation ID" value={visual.initialAnimation} onChange={(initialAnimation) => onChange({ ...definition, visual: { ...visual, initialAnimation } })} /> : <>
      <div className="workbench-field"><label htmlFor={`initial-animation-${definition.id}`}>Initial animation</label><select id={`initial-animation-${definition.id}`} className="h-9 rounded-md border border-slate-600 bg-slate-900 px-3" value={visual.initialAnimation} onChange={(event) => onChange({ ...definition, visual: { ...visual, initialAnimation: event.target.value } })}>
        {Object.keys(visual.animations).map((animation) => <option key={animation}>{animation}</option>)}
      </select></div>
      <div className="workbench-fields">{Object.entries(visual.animations).map(([animation, index]) => <div key={animation} className="flex items-end gap-2"><ScriptNumberField label={`${animation} animation ID`} value={index} onChange={(value) => onChange({ ...definition, visual: { ...visual, animations: { ...visual.animations, [animation]: value } } })} /><Button size="sm" variant="ghost" disabled={animation === visual.initialAnimation} onClick={() => onChange({ ...definition, visual: { ...visual, animations: Object.fromEntries(Object.entries(visual.animations).filter(([key]) => key !== animation)) } })}>Remove</Button></div>)}</div>
      <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
        event.preventDefault();
        const trimmed = name.trim();
        if (!trimmed || visual.animations[trimmed] !== undefined) return;
        onChange({ ...definition, visual: { ...visual, animations: { ...visual.animations, [trimmed]: 0 } } });
        setName("");
      }}><div className="workbench-field"><label htmlFor={`animation-name-${definition.id}`}>New animation name</label><Input id={`animation-name-${definition.id}`} placeholder="e.g. walking" value={name} onChange={(event) => setName(event.target.value)} /></div><Button type="submit" variant="secondary" disabled={!name.trim() || visual.animations[name.trim()] !== undefined}>Add animation</Button></form>
    </>}
  </div>;
}
