import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ItemThumbnail } from "@/components/items/ItemThumbnail";
import type { ScriptCustomObjectDefinition } from "./scriptWorkspaceState";
import { getObjectNativeModelOptions } from "./scriptObjectNativeCatalog";
import { objectPreviewGame } from "./scriptObjectModelPreview";

export function ScriptObjectNativeModelPicker({ definition, gameId, onUpdate }: { readonly definition: ScriptCustomObjectDefinition; readonly gameId: string; readonly onUpdate: (definition: ScriptCustomObjectDefinition) => void }) {
  const [query, setQuery] = useState("");
  const options = useMemo(() => getObjectNativeModelOptions(gameId), [gameId]);
  const visual = definition.visual;
  if (visual.kind !== "nativeDisplayGroup") return null;
  const visible = options.filter((option) => `${option.label} ${option.bank}`.toLowerCase().includes(query.toLowerCase()));
  const selected = options.find((option) => visual.group === option.bank && visual.modelObject === option.index);
  return <div className="grid gap-2">
    {selected ? <ItemThumbnail game={objectPreviewGame(gameId)} kind="terrainItem" itemType={selected.itemType} levelNum={selected.level} label={selected.label} metadata={selected.bank} /> : <div className="text-sm"><p className="break-words text-slate-200">{visual.group} · model {visual.modelObject}</p><p className="text-xs text-slate-400">Not in the model catalog. Edit its bank and index in Advanced asset selection.</p></div>}
    <details className="min-w-0 text-sm">
      <summary className="cursor-pointer text-slate-300">Change game model</summary>
      <div className="mt-3 grid gap-2">
    <div className="grid gap-1"><Label htmlFor={`native-model-search-${definition.id}`}>Choose a game model</Label><Input id={`native-model-search-${definition.id}`} type="search" placeholder="Search known models and banks" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
    <div className="grid max-h-60 divide-y divide-slate-800 overflow-auto">
      {visible.map((option) => <button key={option.id} type="button" aria-pressed={visual.group === option.bank && visual.modelObject === option.index} className={`min-w-0 border-l-2 px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${visual.group === option.bank && visual.modelObject === option.index ? "border-blue-400 bg-slate-800/70" : "border-transparent hover:bg-slate-800/40"}`} onClick={() => onUpdate({ ...definition, visual: { ...visual, group: option.bank, modelObject: option.index } })}>
        <ItemThumbnail game={objectPreviewGame(gameId)} kind="terrainItem" itemType={option.itemType} levelNum={option.level} label={option.label} metadata={option.bank} />
      </button>)}
    </div>
    {visible.length === 0 ? <p className="text-xs text-slate-400">No catalogued models match.</p> : null}
      </div>
    </details>
  </div>;
}
