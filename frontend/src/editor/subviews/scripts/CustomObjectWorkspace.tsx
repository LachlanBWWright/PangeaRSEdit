import { useState } from "react";
import { Boxes, Box, Plus, Search, Upload, Download, Code2 } from "lucide-react";
import { ResultAsync } from "neverthrow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateObjectDialog } from "./CreateObjectDialog";
import { CustomObjectAppearance } from "./CustomObjectAppearance";
import { CustomObjectBehavior } from "./CustomObjectBehavior";
import { CustomObjectCollision } from "./CustomObjectCollision";
import { CustomObjectUsage } from "./CustomObjectUsage";
import { buildScriptDefinitionBundle, importScriptDefinitionBundle } from "./scriptDefinitionBundle";
import { createObjectDefinition, deleteObjectDefinition, getObjectUsage, mergeDefinitionBundle, prepareObjectAsset } from "./scriptObjectActions";
import { updateCustomObjectDefinition, type ScriptWorkspaceContext } from "./scriptWorkspaceState";
import { downloadBytes } from "./scriptWorkspaceHelpers";
import { useScriptWorkspace } from "./useScriptWorkspace";
import { useAtomValue } from "jotai";
import { objectModelSnapshotsAtom, objectModelSnapshotKey } from "./objectModelSnapshots";
import { ScriptLibraryTools } from "./ScriptLibraryTools";
import "./scriptWorkbench.css";

type InspectorTab = "appearance" | "behavior" | "collision" | "usage";
const tabs: readonly { id: InspectorTab; label: string }[] = [
  { id: "appearance", label: "Appearance" }, { id: "behavior", label: "Behavior" },
  { id: "collision", label: "Collision" }, { id: "usage", label: "Instances" },
];

export function CustomObjectWorkspace({ context, onPlace, onSelectPlacement }: {
  context: ScriptWorkspaceContext;
  onPlace?: (id: string) => void;
  onSelectPlacement?: (id: string) => void;
}) {
  const { workspace, update, persist } = useScriptWorkspace(context);
  const snapshots = useAtomValue(objectModelSnapshotsAtom);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [tab, setTab] = useState<InspectorTab>("appearance");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const definition = workspace.customObjects.find((object) => object.id === selectedId) ?? workspace.customObjects[0];
  const visible = workspace.customObjects.filter((object) => `${object.label} ${object.id}`.toLowerCase().includes(search.toLowerCase()));
  const starters = workspace.behaviorCatalog.filter((behavior) => behavior.targetKinds.includes("customObject"));
  const usage = definition ? getObjectUsage(workspace, definition.id) : [];
  const upload = async (file: File, role: "model" | "skeleton") => {
    if (!definition) return;
    setError(null);
    setUploading(true);
    const result = await prepareObjectAsset(workspace, definition, file, role);
    if (result.isErr()) setError(result.error); else update(result.value);
    setUploading(false);
  };
  const importBundle = async (file: File) => {
    setError(null);
    const read = await ResultAsync.fromPromise(file.arrayBuffer(), () => `Could not read ${file.name}`);
    if (read.isErr()) { setError(read.error); return; }
    const result = importScriptDefinitionBundle(new Uint8Array(read.value), context);
    if (result.isErr()) { setError(result.error); return; }
    update((state) => mergeDefinitionBundle(state, result.value));
    setSelectedId(result.value.definitions[0]?.id ?? null);
  };
  return <div className="script-workbench object-library-workbench">
    <div className="workbench-toolbar">
      <div><h3>Object library</h3><p className="workbench-muted">Reusable across {context.gameLabel} levels</p></div>
      <div className="workbench-toolbar-actions">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-700"><Upload size={15} />Import objects<input type="file" accept=".zip" className="sr-only" aria-label="Import objects" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importBundle(file); event.target.value = ""; }} /></label>
        <Button variant="ghost" disabled={workspace.customObjects.length === 0} onClick={() => {
          const result = buildScriptDefinitionBundle(workspace);
          if (result.isErr()) setError(result.error); else { setError(null); downloadBytes(result.value, `${context.gameId}-objects.zip`); }
        }}><Download size={15} className="mr-2" />Export objects</Button>
        <Button onClick={() => setCreating(true)}><Plus size={16} className="mr-2" />New object</Button>
      </div>
    </div>
    <ScriptLibraryTools workspace={workspace} update={update} />
    {error && <div className="m-4 flex items-start justify-between gap-3 workbench-notice" data-tone="warning" role="alert"><p>{error}</p><button type="button" onClick={() => setError(null)} aria-label="Dismiss object error">Dismiss</button></div>}
    <div className="object-workspace">
      <aside className="object-library" aria-label="Object library">
        <div className="relative"><Search size={15} className="absolute left-3 top-3 text-slate-400" /><Input aria-label="Search objects" placeholder="Find an object" className="pl-9" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
        <div className="object-library-list">{visible.map((object) => {
          const snapshot = snapshots[objectModelSnapshotKey(context.gameId, object)];
          return <button type="button" className="object-library-item" key={object.id} aria-pressed={definition?.id === object.id} onClick={() => { setSelectedId(object.id); setError(null); }}>{snapshot ? <img src={snapshot} alt="" className="object-model-thumbnail" /> : <Box size={18} />}<span><span className="font-medium">{object.label}</span><span className="workbench-muted">{object.visual.kind === "none" ? "Logic only" : object.visual.kind.includes("Skeleton") ? "Skeletal object" : "Model object"}</span></span></button>;
        })}</div>
        {visible.length === 0 && <p className="workbench-muted px-3 py-5">{search ? "No objects match your search." : "Your objects will appear here."}</p>}
      </aside>
      {!definition ? <div className="workbench-empty"><Boxes size={38} strokeWidth={1.3} /><h2>Make something for your level.</h2><p>Create a reusable object with its own appearance, collision and Lua behavior. Then place as many instances as your level needs.</p><Button onClick={() => setCreating(true)}><Plus size={16} className="mr-2" />Create your first object</Button><p className="text-xs">Start empty, use an optional sample, or import objects from another project for this game.</p></div> : <section className="object-inspector" aria-label={`${definition.label} object inspector`}>
        <div className="object-inspector-header"><div className="min-w-0 flex-1"><Input className="h-10 max-w-md border-transparent bg-transparent px-0 text-xl font-semibold" aria-label="Object name" value={definition.label} onChange={(event) => { const label = event.target.value; update((state) => updateCustomObjectDefinition(state, { ...definition, label })); }} /><p className="workbench-muted break-all">{definition.id}</p></div>
          <div className="flex items-center gap-2">{onPlace && <Button onClick={() => onPlace(definition.id)}>Place in level</Button>}<Button variant="secondary" onClick={() => setTab("behavior")}><Code2 size={15} className="mr-2" />Edit behavior</Button></div>
        </div>
        <div className="workbench-tabs" aria-label="Object inspector sections">{tabs.map((item) => <button key={item.id} type="button" aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>{item.label}{item.id === "usage" ? ` (${usage.length})` : ""}</button>)}</div>
        {tab === "appearance" && <CustomObjectAppearance workspace={workspace} definition={definition} uploading={uploading} onChange={(next) => update((state) => updateCustomObjectDefinition(state, next))} onUpload={(file, role) => void upload(file, role)} />}
        {tab === "behavior" && <CustomObjectBehavior workspace={workspace} definition={definition} update={update} onError={setError} />}
        {tab === "collision" && <CustomObjectCollision definition={definition} onChange={(next) => update((state) => updateCustomObjectDefinition(state, next))} />}
        {tab === "usage" && <CustomObjectUsage workspace={workspace} definition={definition} update={update} onPlace={onPlace} onSelectPlacement={onSelectPlacement} />}
        <details className="mt-8 border-t border-slate-700 pt-4"><summary className="cursor-pointer text-sm text-slate-400">Definition details</summary><div className="mt-4 grid gap-3"><p className="workbench-muted break-all">Source: {definition.sourceFilePath}</p><p className="workbench-muted">{usage.length > 0 ? "Remove instances and replacements before deleting this definition." : "Deleting the definition keeps its source file so your Lua can be recovered."}</p><Button className="justify-self-start" variant="destructive" disabled={usage.length > 0} onClick={() => { update((state) => deleteObjectDefinition(state, definition.id)); setSelectedId(null); }}>Delete definition</Button></div></details>
      </section>}
    </div>
    <CreateObjectDialog key={String(creating)} open={creating} onOpenChange={setCreating} starters={starters} onCreate={(name, starter) => {
      const result = createObjectDefinition(workspace, name, starter);
      if (result.isErr()) { setError(result.error); return; }
      persist(result.value.state); setSelectedId(result.value.id); setTab("appearance"); setCreating(false); setError(null);
    }} />
  </div>;
}
