import { useAtomValue } from "jotai";
import { Globals } from "@/data/globals/globals";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScriptNumberField } from "./ScriptNumberField";
import { CustomObjectAnimations } from "./CustomObjectAnimations";
import { NativeObjectModelPicker } from "./NativeObjectModelPicker";
import { changeObjectVisual } from "./scriptObjectVisuals";
import { getCustomModelFormat } from "./scriptObjectActions";
import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "./scriptWorkspaceState";

interface Props {
  workspace: ScriptWorkspaceState;
  definition: ScriptCustomObjectDefinition;
  onChange: (definition: ScriptCustomObjectDefinition) => void;
  onUpload: (file: File, role: "model" | "skeleton") => void;
  uploading: boolean;
}

export function CustomObjectAppearance({ workspace, definition, onChange, onUpload, uploading }: Props) {
  const globals = useAtomValue(Globals);
  const visual = definition.visual;
  const format = getCustomModelFormat(workspace.context.gameId);
  const skeletal = visual.kind === "nativeSkeleton" || visual.kind === "customSkeleton";
  const custom = visual.kind === "customDisplayGroup" || visual.kind === "customSkeleton";
  return <div className="workbench-section">
    <div className="workbench-field"><label htmlFor={`object-visual-${definition.id}`}>Appearance</label><Select value={visual.kind} onValueChange={(value) => onChange(changeObjectVisual(definition, value, workspace.context.gameId))}>
      <SelectTrigger id={`object-visual-${definition.id}`}><SelectValue /></SelectTrigger><SelectContent>
        <SelectItem value="none">Invisible / logic only</SelectItem><SelectItem value="nativeDisplayGroup">Game model</SelectItem><SelectItem value="customDisplayGroup">Uploaded {format.toUpperCase()} model</SelectItem>
        {format !== "shapes" && <><SelectItem value="nativeSkeleton">Game skeleton</SelectItem><SelectItem value="customSkeleton">Uploaded skeleton</SelectItem></>}
      </SelectContent></Select></div>
    {visual.kind === "none" && <div className="workbench-notice">This object can run Lua and use collision, but will not be drawn. Choose a model when it needs to be visible.</div>}
    {visual.kind === "nativeDisplayGroup" && <NativeObjectModelPicker globals={globals} gameId={workspace.context.gameId} definition={definition} onChange={onChange} />}
    {custom && <div className="workbench-section">
      <div className="workbench-field"><label htmlFor={`model-upload-${definition.id}`}>Upload model</label><Input id={`model-upload-${definition.id}`} type="file" disabled={uploading} accept={`.${format}${format === "bg3d" && visual.kind === "customDisplayGroup" ? ",.gltf,.glb" : ""}`} onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file, "model"); event.target.value = ""; }} /><p className="workbench-muted">{format.toUpperCase()} for {workspace.context.gameLabel}. Up to 16 MiB per asset.</p><p className="break-all text-xs">{workspace.assets[visual.modelPath] ? "Added: " : "Needed: "}{visual.modelPath}</p></div>
      {visual.kind === "customSkeleton" && <div className="workbench-field"><label htmlFor={`skeleton-upload-${definition.id}`}>Skeleton resource</label><Input id={`skeleton-upload-${definition.id}`} type="file" accept=".rsrc" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file, "skeleton"); event.target.value = ""; }} /><p className="break-all text-xs">{workspace.assets[`${visual.skeletonPath}.rsrc`] ? "Added: " : "Needed: "}{visual.skeletonPath}.rsrc</p></div>}
    </div>}
    {visual.kind !== "none" && <ScriptNumberField label="Model scale" value={visual.scale} min={0.01} max={100} step={0.05} onChange={(scale) => onChange({ ...definition, visual: { ...visual, scale } })} />}
    {skeletal && <CustomObjectAnimations definition={definition} onChange={onChange} />}
    {visual.kind !== "none" && <details className="rounded-lg border border-slate-700 p-4"><summary className="cursor-pointer text-sm">Native asset details</summary><div className="workbench-fields mt-4">
      {visual.kind === "nativeDisplayGroup" && <div className="workbench-field"><label htmlFor={`model-bank-${definition.id}`}>Model bank</label><select id={`model-bank-${definition.id}`} className="h-9 rounded-md border border-slate-600 bg-slate-900 px-3" value={visual.group} onChange={(event) => onChange({ ...definition, visual: { ...visual, group: event.target.value === "levelSpecific" ? "levelSpecific" : "global" } })}><option value="global">Global models</option><option value="levelSpecific">Current level models</option></select></div>}
      {(visual.kind === "nativeDisplayGroup" || visual.kind === "customDisplayGroup") && <ScriptNumberField label="Model object ID" value={visual.modelObject} onChange={(modelObject) => onChange({ ...definition, visual: { ...visual, modelObject } })} />}
      {visual.kind === "nativeSkeleton" && <ScriptNumberField label="Native skeleton ID" value={visual.skeletonType} onChange={(skeletonType) => onChange({ ...definition, visual: { ...visual, skeletonType } })} />}
      <ScriptNumberField label="Draw order" value={visual.slot} onChange={(slot) => onChange({ ...definition, visual: { ...visual, slot } })} />
    </div><p className="workbench-muted mt-3">These IDs refer to loaded native assets. Use game-specific IDs and test in the target level.</p></details>}
  </div>;
}
