import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ScriptAssetFile, ScriptBehaviorDefinition, ScriptCustomObjectDefinition, ScriptCustomObjectPlacement, ScriptParameterDefinition } from "./scriptWorkspaceState";
import type { NativeReplacementCompatibility } from "./scriptNativeAudit";
import { ScriptCustomObjectInstancesPanel } from "./ScriptCustomObjectInstancesPanel";
import { ScriptObjectDefinitionInspector } from "./ScriptObjectDefinitionInspector";
import { OBJECT_STARTERS, objectStarterSchema, type ObjectStarter } from "./scriptObjectStarters";

export interface ScriptCustomObjectsPanelProps {
  gameId: string;
  customObjectBehaviorId: string;
  onCustomObjectBehaviorIdChange: (value: string) => void;
  customObjectBehaviors: readonly ScriptBehaviorDefinition[];
  customObjectLabel: string;
  onCustomObjectLabelChange: (value: string) => void;
  generatedCustomObjectId: string;
  customObjectOptions: readonly ScriptCustomObjectDefinition[];
  customObjectPlacements: readonly ScriptCustomObjectPlacement[];
  onRemoveCustomObjectPlacement: (placementId: string) => void;
  onExportDefinitions: () => void;
  onImportDefinitions: (file: File) => void;
  onCreateObjectScript?: () => void;
  showCreateObjectScript?: boolean;
  showLevelInstances?: boolean;
  compact?: boolean;
  showHeaderActions?: boolean;
  onCreateObject: () => void;
  onCreateFromTemplate?: (template: ObjectStarter, label: string) => void;
  onUpdateObject: (definition: ScriptCustomObjectDefinition) => void;
  onDuplicateObject?: (id: string) => void;
  onDeleteObject?: (id: string) => void;
  onEditObjectScript?: (definition: ScriptCustomObjectDefinition) => void;
  onPlaceObject?: (id: string) => void;
  objectUsageCounts?: Readonly<Record<string, number>>;
  assetFiles?: Readonly<Record<string, ScriptAssetFile>>;
  parameters?: readonly ScriptParameterDefinition[];
  onUploadAsset: (definition: ScriptCustomObjectDefinition, file: File, role: "model" | "skeleton") => void;
  selectedTerrainItem: { readonly index: number; readonly type: number; readonly x: number; readonly z: number } | null;
  terrainReplacementCompatibility: NativeReplacementCompatibility | null;
  replacementObjectId: string | null;
  onReplaceSelectedItem: (customObjectId: string) => void;
  onRestoreSelectedItem: () => void;
  selectedMapItem: { readonly index: number; readonly type: number; readonly x: number; readonly y: number } | null;
  mapReplacementCompatibility: NativeReplacementCompatibility | null;
  mapReplacementObjectId: string | null;
  onReplaceSelectedMapItem: (customObjectId: string) => void;
  onRestoreSelectedMapItem: () => void;
  selectedSplineItem: { readonly splineNum: number; readonly itemIndex: number; readonly nativeType: number } | null;
  splineReplacementCompatibility: NativeReplacementCompatibility | null;
  splineReplacementObjectId: string | null;
  onReplaceSelectedSplineItem: (customObjectId: string) => void;
  onRestoreSelectedSplineItem: () => void;
}

export function ScriptCustomObjectsPanel(props: ScriptCustomObjectsPanelProps) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [starter, setStarter] = useState<ObjectStarter>("decoration");
  const [useExisting, setUseExisting] = useState(false);
  const filtered = props.customObjectOptions.filter((definition) => `${definition.label} ${definition.id} ${definition.description}`.toLowerCase().includes(query.toLowerCase()));
  const selected = filtered.find((definition) => definition.id === selectedId) ?? filtered[0];
  const showCreation = creating || props.customObjectOptions.length === 0;
  const template = OBJECT_STARTERS.find((option) => option.id === starter);
  return <section className="grid min-w-0 gap-5 py-3" aria-label="Custom object definitions">
    {props.showHeaderActions !== false ? <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-base font-semibold text-white">Custom Objects</h2><p className="mt-1 text-xs text-slate-400">Reusable game-wide items. Place instances separately on each level.</p></div>
      <div className="flex flex-wrap gap-1"><Button size="sm" variant="ghost" onClick={props.onExportDefinitions}>Export definitions</Button><label className="inline-flex min-h-8 cursor-pointer items-center rounded-md px-3 text-sm text-slate-300 hover:bg-slate-800 focus-within:ring-2 focus-within:ring-ring">Import bundle<input type="file" accept=".zip" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) props.onImportDefinitions(file); event.target.value = ""; }} /></label></div>
    </div> : null}
    <div className="grid min-w-0 items-start gap-5 md:grid-cols-[13rem_minmax(0,1fr)] lg:grid-cols-[14rem_minmax(0,1fr)]">
      <aside className="grid min-w-0 gap-3 border-b border-slate-800 pb-5 md:sticky md:top-0 md:border-b-0 md:border-r md:pr-5">
        <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-white">Item library</h3><Button size="sm" variant="secondary" onClick={() => setCreating(true)}>New item</Button></div>
        <div className="grid gap-1"><Label htmlFor="custom-object-search">Find an item</Label><Input id="custom-object-search" type="search" placeholder="Search names or descriptions" value={query} onChange={(event) => setQuery(event.target.value)} /></div>
        <p className="text-xs text-slate-400">{filtered.length} of {props.customObjectOptions.length} definitions</p>
        <div className="grid max-h-64 divide-y divide-slate-800 overflow-auto md:max-h-[32rem]" aria-label="Item definitions">
          {filtered.map((definition) => <button key={definition.id} type="button" aria-pressed={selected?.id === definition.id && !showCreation} className={`min-w-0 border-l-2 px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${selected?.id === definition.id && !showCreation ? "border-blue-400 bg-slate-800/70" : "border-transparent hover:bg-slate-800/40"}`} onClick={() => { setSelectedId(definition.id); setCreating(false); }}>
            <span className="block break-words text-sm font-medium text-slate-100">{definition.label}</span><span className="mt-1 block text-xs text-slate-400">{definition.visual.kind === "none" ? "No visual" : "Visual configured"} · {props.objectUsageCounts?.[definition.id] ?? 0} references</span>
          </button>)}
          {filtered.length === 0 ? <p className="py-4 text-sm text-slate-400">{props.customObjectOptions.length ? "No matching items. Try another search." : "Create your first item from a starter."}</p> : null}
        </div>
      </aside>
      <div className="min-w-0">
        {showCreation ? <section className="grid max-w-xl gap-4">
          <h3 className="text-sm font-semibold text-white">New scripted item</h3>
          <p className="text-sm text-slate-400">Choose a starting behavior and name. Its editable script and reusable definition are created together.</p>
          <div className="grid gap-1"><Label htmlFor="custom-object-label">Item name</Label><Input id="custom-object-label" value={props.customObjectLabel} placeholder="e.g. Floating health crystal" onChange={(event) => props.onCustomObjectLabelChange(event.target.value)} /></div>
          {props.onCreateFromTemplate ? <>
            <div className="grid gap-1"><Label>Starting behavior</Label><Select value={useExisting ? "existing" : starter} onValueChange={(value) => {
              if (value === "existing") { setUseExisting(true); return; }
              const result = objectStarterSchema.safeParse(value);
              if (result.success) { setStarter(result.data); setUseExisting(false); }
            }}><SelectTrigger aria-label="Starting behavior"><SelectValue /></SelectTrigger><SelectContent>{OBJECT_STARTERS.map((option) => <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>)}<SelectItem value="existing">Use an existing object script</SelectItem></SelectContent></Select></div>
            {!useExisting ? <p className="text-xs text-slate-400">{template?.description}</p> : null}
          </> : null}
          {useExisting || !props.onCreateFromTemplate ? <div className="grid gap-1"><Label>Object script</Label><Select value={props.customObjectBehaviorId} onValueChange={props.onCustomObjectBehaviorIdChange}><SelectTrigger aria-label="Object script"><SelectValue placeholder="Choose an object script" /></SelectTrigger><SelectContent>{props.customObjectBehaviors.map((behavior) => <SelectItem key={behavior.id} value={behavior.id}>{behavior.label}</SelectItem>)}</SelectContent></Select></div> : null}
          <div className="flex flex-wrap gap-2"><Button disabled={!props.customObjectLabel.trim() || ((useExisting || !props.onCreateFromTemplate) && !props.customObjectBehaviorId)} onClick={() => {
            setSelectedId(props.generatedCustomObjectId);
            if (props.onCreateFromTemplate && !useExisting) props.onCreateFromTemplate(starter, props.customObjectLabel);
            else props.onCreateObject();
            setCreating(false); setQuery("");
          }}>Create item</Button>{props.customObjectOptions.length ? <Button variant="outline" onClick={() => setCreating(false)}>Cancel</Button> : null}
            {props.onCreateObjectScript && props.showCreateObjectScript !== false ? <Button variant="outline" onClick={props.onCreateObjectScript}>Create an advanced object script</Button> : null}
          </div>
        </section> : selected ? <ScriptObjectDefinitionInspector key={selected.id} definition={selected} panel={props} /> : null}
      </div>
    </div>
    {props.showLevelInstances !== false ? <ScriptCustomObjectInstancesPanel placements={props.customObjectPlacements} definitions={props.customObjectOptions} onRemovePlacement={props.onRemoveCustomObjectPlacement} /> : null}
  </section>;
}
