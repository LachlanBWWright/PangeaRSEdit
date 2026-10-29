import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScriptNumberField } from "./ScriptNumberField";
import { animationClipIndex, animationClipLabel, removeObjectAnimationBinding, setObjectAnimationBinding, suggestedAnimationActions, type ObjectAnimationClip } from "./scriptAnimationMappings";
import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceState";
import { MAX_OBJECT_ANIMATION_ACTIONS, objectAnimationActionSchema } from "./scriptAnimationLimits";

interface Props {
  definition: ScriptCustomObjectDefinition;
  availableClips?: readonly ObjectAnimationClip[];
  onChange: (definition: ScriptCustomObjectDefinition) => void;
}

function AnimationClipSelect({ id, label, value, clipName, clips, onChange }: {
  id: string;
  label: string;
  value: number;
  clipName?: string;
  clips: readonly ObjectAnimationClip[];
  onChange: (index: number) => void;
}) {
  const namedClips = clips.filter((clip) => clip.name === clipName);
  const missing = clipName === undefined ? !clips.some((clip) => clip.index === value) : namedClips.length !== 1;
  const selected = clipName === undefined ? value : namedClips.length === 1 ? namedClips[0]?.index ?? -1 : -1;
  return <div className="workbench-field">
    <label htmlFor={id}>{label}</label>
    <select id={id} className="h-9 rounded-md border border-slate-600 bg-slate-900 px-3" value={selected} aria-invalid={missing} onChange={(event) => {
      const index = animationClipIndex(event.target.value, clips);
      if (index !== undefined) onChange(index);
    }}>
      {missing && <option value={selected} disabled>{clipName === undefined ? `Missing clip (native ID ${value})` : `Missing or ambiguous clip: ${clipName}`}</option>}
      {clips.map((clip) => <option key={clip.index} value={clip.index}>{animationClipLabel(clip)}</option>)}
    </select>
    {missing && <p className="text-sm text-amber-300">Choose a clip from the current asset before testing.</p>}
  </div>;
}

export function CustomObjectAnimations({ definition, availableClips = [], onChange }: Props) {
  const [name, setName] = useState("");
  const visual = definition.visual;
  if (visual.kind !== "nativeSkeleton" && visual.kind !== "customSkeleton") return null;
  const actionCount = visual.kind === "customSkeleton" ? Object.keys(visual.animations).length : 0;
  const nameValid = objectAnimationActionSchema.safeParse(name.trim()).success;
  return <div className="workbench-section">
    <h3>Animation</h3>
    <ScriptNumberField label="Playback speed" value={visual.animationSpeed} min={0.01} max={100} step={0.05} onChange={(animationSpeed) => onChange({ ...definition, visual: { ...visual, animationSpeed } })} />
    {visual.kind === "nativeSkeleton" ? <>
      {availableClips.length > 0 ? <AnimationClipSelect id={`native-animation-${definition.id}`} label="Initial animation" value={visual.initialAnimation} clips={availableClips} onChange={(initialAnimation) => onChange({ ...definition, visual: { ...visual, initialAnimation } })} /> : <details>
        <summary className="cursor-pointer text-sm">Native animation details</summary>
        <p className="workbench-muted">This game skeleton has no imported clip names. Use its native animation ID and test in the game.</p>
        <ScriptNumberField label="Initial animation ID" value={visual.initialAnimation} onChange={(initialAnimation) => onChange({ ...definition, visual: { ...visual, initialAnimation } })} />
      </details>}
    </> : <>
      <div className="workbench-field"><label htmlFor={`initial-animation-${definition.id}`}>Initial action</label><select id={`initial-animation-${definition.id}`} className="h-9 rounded-md border border-slate-600 bg-slate-900 px-3" value={visual.initialAnimation} onChange={(event) => onChange({ ...definition, visual: { ...visual, initialAnimation: event.target.value } })}>
        {Object.keys(visual.animations).map((animation) => <option key={animation}>{animation}</option>)}
      </select></div>
      <p className="workbench-muted">Map names used by your Lua behavior to clips in this asset. Mapping an action does not implement its behavior.</p>
      <p className="workbench-muted">{actionCount} of {MAX_OBJECT_ANIMATION_ACTIONS} actions. Every source clip remains available in the clip selectors.{actionCount >= MAX_OBJECT_ANIMATION_ACTIONS && " Remove an unused action to add another."}</p>
      <div className="workbench-fields">{Object.entries(visual.animations).map(([animation, index], position) => <div key={animation} className="flex items-end gap-2">
        {availableClips.length > 0 ? <AnimationClipSelect id={`animation-clip-${definition.id}-${position}`} label={`${animation} clip`} value={index} clipName={definition.assetId ? definition.assetAnimations?.[animation] : undefined} clips={availableClips} onChange={(value) => onChange(setObjectAnimationBinding(definition, animation, value, availableClips))} /> : <details className="flex-1">
          <summary className="cursor-pointer text-sm">{animation}: native clip {index}</summary>
          {definition.assetId && definition.assetAnimations?.[animation] ? <p className="text-sm text-amber-300">Clip {definition.assetAnimations[animation]} is unavailable. Restore or reimport the linked asset to change this mapping.</p> : <ScriptNumberField label={`${animation} animation ID`} value={index} onChange={(value) => onChange(setObjectAnimationBinding(definition, animation, value, availableClips))} />}
        </details>}
        <Button size="sm" variant="ghost" aria-label={`Remove ${animation} action`} disabled={animation === visual.initialAnimation} onClick={() => onChange(removeObjectAnimationBinding(definition, animation))}>Remove</Button>
      </div>)}</div>
      {availableClips.length === 0 && <p className="workbench-muted">Import a skeleton with clip metadata to choose animations by name. Existing native IDs are retained.</p>}
      <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
        event.preventDefault();
        const trimmed = name.trim();
        if (!nameValid || actionCount >= MAX_OBJECT_ANIMATION_ACTIONS || visual.animations[trimmed] !== undefined) return;
        onChange(setObjectAnimationBinding(definition, trimmed, availableClips[0]?.index ?? 0, availableClips));
        setName("");
      }}><div className="workbench-field"><label htmlFor={`animation-name-${definition.id}`}>New action name</label><Input id={`animation-name-${definition.id}`} list={`animation-actions-${definition.id}`} placeholder="e.g. walk" maxLength={63} aria-invalid={name.trim().length > 0 && !nameValid} value={name} onChange={(event) => setName(event.target.value)} />{name.trim().length > 0 && !nameValid && <p className="text-sm text-amber-300">Use an action name of at most 63 UTF-8 bytes.</p>}<datalist id={`animation-actions-${definition.id}`}>{suggestedAnimationActions.map((action) => <option key={action} value={action} />)}</datalist></div><Button type="submit" variant="secondary" disabled={!nameValid || actionCount >= MAX_OBJECT_ANIMATION_ACTIONS || visual.animations[name.trim()] !== undefined}>Add action</Button></form>
    </>}
  </div>;
}
