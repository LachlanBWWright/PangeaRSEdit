import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceState";
import type { ScriptCustomObjectsPanelProps } from "./ScriptCustomObjectsPanel";
import { ScriptObjectAppearanceEditor } from "./ScriptObjectAppearanceEditor";
import { ScriptObjectAnimationEditor } from "./ScriptObjectAnimationEditor";
import { ScriptObjectCollisionEditor } from "./ScriptObjectCollisionEditor";
import { ScriptObjectAdvancedReplacement } from "./ScriptObjectAdvancedReplacement";
import { ScriptParameterValuesEditor } from "./ScriptParameterValuesEditor";

export function ScriptObjectDefinitionInspector({ definition, panel }: { readonly definition: ScriptCustomObjectDefinition; readonly panel: ScriptCustomObjectsPanelProps }) {
  const [label, setLabel] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const usage = panel.objectUsageCounts?.[definition.id] ?? 0;
  return <div className="grid min-w-0">
    <section className="grid gap-3 pb-5">
      <div className="grid gap-1"><Label htmlFor={`definition-label-${definition.id}`}>Item name</Label><Input id={`definition-label-${definition.id}`} value={label ?? definition.label} onChange={(event) => setLabel(event.target.value)} onBlur={() => {
        if (label?.trim()) { panel.onUpdateObject({ ...definition, label: label.trim() }); setLabel(null); }
      }} aria-invalid={label !== null && !label.trim()} /></div>
      {label !== null && !label.trim() ? <p className="text-xs text-red-300">Item name cannot be empty.</p> : null}
      {definition.description ? <p className="text-xs text-slate-400">{definition.description}</p> : null}
      <p className="text-xs text-slate-400">{usage} reference{usage === 1 ? "" : "s"} · {definition.compatibility === "preview-ready" ? "Preview ready" : "Extended runtime"}</p>
      <div className="flex flex-wrap gap-2">
        {panel.onEditObjectScript ? <Button size="sm" variant="secondary" onClick={() => panel.onEditObjectScript?.(definition)}>Edit item script</Button> : null}
        {panel.onPlaceObject ? <Button size="sm" onClick={() => panel.onPlaceObject?.(definition.id)}>Place on this level</Button> : null}
        {panel.onDuplicateObject ? <Button size="sm" variant="ghost" onClick={() => panel.onDuplicateObject?.(definition.id)}>Duplicate</Button> : null}
        {panel.onDeleteObject ? <span title={usage > 0 ? "Remove its placements and replacements before deleting this definition." : undefined}><Button size="sm" variant="ghost" className="text-red-300 hover:text-red-200" disabled={usage > 0} onClick={() => setConfirmDelete(true)}>Delete definition</Button></span> : null}
      </div>
      {confirmDelete ? <div className="border-l-2 border-red-500 pl-3"><p className="mb-2 text-sm">Delete “{definition.label}”? This removes its reusable definition.</p><div className="flex gap-2"><Button size="sm" variant="destructive" onClick={() => { panel.onDeleteObject?.(definition.id); setConfirmDelete(false); }}>Delete</Button><Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button></div></div> : null}
    </section>
    <ScriptObjectAppearanceEditor definition={definition} gameId={panel.gameId} assetFiles={panel.assetFiles} onUpdate={panel.onUpdateObject} onUpload={panel.onUploadAsset} />
    <ScriptObjectAnimationEditor definition={definition} onUpdate={panel.onUpdateObject} />
    <ScriptObjectCollisionEditor definition={definition} onUpdate={panel.onUpdateObject} />
    <div className="min-w-0 border-t border-slate-800 py-5"><ScriptParameterValuesEditor label="Definition defaults" parameters={panel.parameters ?? []} values={definition.parameters ?? {}} onChange={(parameters) => panel.onUpdateObject({ ...definition, parameters })} /></div>
    <ScriptObjectAdvancedReplacement objectId={definition.id} panel={panel} />
    <footer className="grid gap-3 border-t border-slate-800 pt-4 text-xs text-slate-400">
      {!panel.onPlaceObject ? <p>Open a level and choose this item in the Items menu to place it.</p> : null}
      <details><summary className="cursor-pointer">Definition identity and source</summary><p className="mt-2 break-all">{definition.id}</p><p className="break-all">{definition.sourceFilePath}</p></details>
    </footer>
  </div>;
}
