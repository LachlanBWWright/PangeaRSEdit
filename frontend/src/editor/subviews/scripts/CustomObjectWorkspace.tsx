import { useState } from "react";
import { Boxes, Plus, Upload, Download, Code2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateObjectDialog } from "./CreateObjectDialog";
import { CustomObjectAppearance } from "./CustomObjectAppearance";
import { CustomObjectBehavior } from "./CustomObjectBehavior";
import { CustomObjectCollision } from "./CustomObjectCollision";
import { UploadedObjectModelPreview } from "./UploadedObjectModelPreview";
import { NativeObjectModelPicker } from "./NativeObjectModelPicker";
import { Globals } from "@/data/globals/globals";
import { ProjectObjectCollisionModelPreview } from "@/platform/desktop/ProjectObjectCollisionModelPreview";
import { CustomObjectUsage } from "./CustomObjectUsage";
import { createObjectDefinition, deleteObjectDefinition, getObjectUsage, prepareObjectAsset } from "./scriptObjectActions";
import { updateCustomObjectDefinition, type ScriptWorkspaceContext } from "./scriptWorkspaceState";
import { useScriptWorkspace } from "./useScriptWorkspace";
import { useAtomValue } from "jotai";
import { objectModelSnapshotsAtom, objectModelSnapshotKey } from "./objectModelSnapshots";
import { ScriptLibraryTools } from "./ScriptLibraryTools";
import { createNativeActorVariant, nativeActorChoices } from "./scriptNativeActorVariants";
import { useObjectAuthoringSelection } from "./scriptAuthoringNavigation";
import { duplicateScriptObject } from "./scriptObjectDuplication";
import { ObjectImportReview } from "./ObjectImportReview";
import { useObjectBundleActions } from "./useObjectBundleActions";
import { ObjectLibraryList } from "./ObjectLibraryList";
import { ObjectReadiness } from "./ObjectReadiness";
import { CustomObjectDefinitionScope } from "./CustomObjectDefinitionScope";
import { desktopBridge } from "@/platform/desktop/client";
import { getObjectReadiness } from "./scriptObjectReadiness";
import { getScriptWorkspaceRevision, scriptWorkflowEvidenceAtom, scriptWorkflowEvidenceKey } from "./scriptWorkflowEvidence";
import "./scriptWorkbench.css";

type InspectorTab = "appearance" | "behavior" | "collision" | "usage";
const tabs: readonly { id: InspectorTab; label: string }[] = [
  { id: "appearance", label: "Appearance" }, { id: "behavior", label: "Behavior" },
  { id: "collision", label: "Collision" }, { id: "usage", label: "Instances" },
];

export function CustomObjectWorkspace({ context, onPlace, onSelectPlacement, nativeMetadata }: {
  context: ScriptWorkspaceContext;
  onPlace?: (id: string) => void;
  onSelectPlacement?: (id: string) => void;
  nativeMetadata?: Readonly<Record<string, string>>;
}) {
  const { workspace, update, persist } = useScriptWorkspace(context);
  const snapshots = useAtomValue(objectModelSnapshotsAtom);
  const globals = useAtomValue(Globals);
  const { selectedId, setSelectedId, tab, setTab } = useObjectAuthoringSelection(context.gameId);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const bundles = useObjectBundleActions({ workspace, persist, onSelect: setSelectedId, onError: setError });
  const evidenceByLevel = useAtomValue(scriptWorkflowEvidenceAtom);
  const evidence = evidenceByLevel[scriptWorkflowEvidenceKey(workspace)];
  const revision = getScriptWorkspaceRevision(workspace);
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
  return <div className="script-workbench object-library-workbench">
    <fieldset disabled={bundles.importing} inert={bundles.importing} className="contents">
    <div className="workbench-toolbar">
      <div><h3>Object library</h3><p className="workbench-muted">Reusable across {context.gameLabel} levels</p></div>
      <div className="workbench-toolbar-actions">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-slate-700"><Upload size={15} />Import objects<input type="file" accept=".zip" className="sr-only" aria-label="Import objects" onChange={(event) => { const file = event.target.files?.[0]; if (file) void bundles.readBundle(file); event.target.value = ""; }} /></label>
        {bundles.canUndo && <Button variant="ghost" onClick={() => void bundles.undoImport()}>Undo object import</Button>}
        <label className="inline-flex items-center gap-2 text-xs"><input type="checkbox" checked={bundles.includeAuthoringSources} onChange={(event) => bundles.setIncludeAuthoringSources(event.currentTarget.checked)} />Include authoring sources</label>
        <Button variant="ghost" disabled={workspace.customObjects.length === 0 || bundles.exporting} onClick={() => void bundles.exportBundle(false)}><Download size={15} className="mr-2" />Export all objects</Button>
        <Button variant="secondary" disabled={bundles.selectedIds.length === 0 || bundles.exporting} onClick={() => void bundles.exportBundle(true)}>Export selected ({bundles.selectedIds.length})</Button>
        <Button onClick={() => setCreating(true)}><Plus size={16} className="mr-2" />New object</Button>
      </div>
    </div>
    <ScriptLibraryTools workspace={workspace} update={update} />
    {error && <div className="m-4 flex items-start justify-between gap-3 workbench-notice" data-tone="warning" role="alert"><p>{error}</p><button type="button" onClick={() => setError(null)} aria-label="Dismiss object error">Dismiss</button></div>}
    <div className="object-workspace">
      <ObjectLibraryList entries={visible.map((object) => ({ definition: object, snapshot: snapshots[objectModelSnapshotKey(context.gameId, object)], readiness: <ObjectReadiness compact issues={getObjectReadiness(workspace, object, evidence, revision)} /> }))} selectedId={definition?.id} exportIds={bundles.selectedIds} search={search} onSearch={setSearch} onSelect={(id) => { setSelectedId(id); setError(null); }} onToggleExport={bundles.toggleExport} />
      {!definition ? <div className="workbench-empty"><Boxes size={38} strokeWidth={1.3} /><h2>Make something for your level.</h2><p>Create a reusable object with its own appearance, collision and Lua behavior. Then place as many instances as your level needs.</p><Button onClick={() => setCreating(true)}><Plus size={16} className="mr-2" />Create your first object</Button><p className="text-xs">Start empty, use an optional sample, or import objects from another project for this game.</p></div> : <section className="object-inspector" aria-label={`${definition.label} object inspector`}>
        <div className="object-inspector-header"><div className="min-w-0 flex-1"><Input className="h-10 max-w-md border-transparent bg-transparent px-0 text-xl font-semibold" aria-label="Object name" value={definition.label} onChange={(event) => { const label = event.target.value; update((state) => updateCustomObjectDefinition(state, { ...definition, label })); }} /><p className="workbench-muted break-all">{definition.id}</p></div>
          <div className="flex flex-wrap items-center gap-2">{onPlace && <Button onClick={() => onPlace(definition.id)}>Place in level</Button>}<Button variant="secondary" onClick={() => setTab("behavior")}><Code2 size={15} className="mr-2" />Edit behavior</Button><Button variant="ghost" onClick={() => {
            const result = duplicateScriptObject(workspace, definition.id);
            if (result.isErr()) { setError(result.error); return; }
            persist(result.value.state); setSelectedId(result.value.id); setError(null);
          }}><Copy size={15} className="mr-2" />Duplicate object</Button></div>
        </div>
        <CustomObjectDefinitionScope workspace={workspace} definition={definition} />
        <ObjectReadiness issues={getObjectReadiness(workspace, definition, evidence, revision)} />
        <div className="workbench-tabs" aria-label="Object inspector sections">{tabs.map((item) => <button key={item.id} type="button" aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>{item.label}{item.id === "usage" ? ` (${usage.length})` : ""}</button>)}</div>
        {tab === "appearance" && <CustomObjectAppearance workspace={workspace} definition={definition} uploading={uploading} nativeMetadata={nativeMetadata} onChange={(next) => update((state) => updateCustomObjectDefinition(state, next))} onUpload={(file, role) => void upload(file, role)} />}
        {tab === "behavior" && <CustomObjectBehavior workspace={workspace} definition={definition} update={update} onError={setError} />}
        {tab === "collision" && <><CustomObjectCollision definition={definition} gameId={context.gameId} onChange={(next) => update((state) => updateCustomObjectDefinition(state, next))} />{definition.visual.kind === "nativeDisplayGroup" && definition.collision.kind === "preset" && <NativeObjectModelPicker globals={globals} gameId={context.gameId} definition={definition} previewOnly onChange={(next) => update((state) => updateCustomObjectDefinition(state, next))} />}{(definition.visual.kind === "customDisplayGroup" || definition.visual.kind === "customSkeleton") && definition.collision.kind === "preset" && (definition.assetId && desktopBridge() ? <ProjectObjectCollisionModelPreview definition={definition} /> : <UploadedObjectModelPreview definition={definition} workspace={workspace} />)}</>}
        {tab === "usage" && <CustomObjectUsage workspace={workspace} definition={definition} update={update} onPlace={onPlace} onSelectPlacement={onSelectPlacement} />}
        <details className="mt-8 border-t border-slate-700 pt-4"><summary className="cursor-pointer text-sm text-slate-400">Definition details</summary><div className="mt-4 grid gap-3"><p className="workbench-muted break-all">Source: {definition.sourceFilePath}</p><p className="workbench-muted">{usage.length > 0 ? "Remove instances and replacements before deleting this definition." : "Deleting the definition keeps its source file so your Lua can be recovered."}</p><Button className="justify-self-start" variant="destructive" disabled={usage.length > 0} onClick={() => { update((state) => deleteObjectDefinition(state, definition.id)); setSelectedId(null); }}>Delete definition</Button></div></details>
      </section>}
    </div>
    </fieldset>
    {bundles.pending && <ObjectImportReview workspace={workspace} bundle={bundles.pending} error={error} importing={bundles.importing} projectAssets={bundles.projectAssets} onCancel={bundles.cancelImport} onImport={(mode) => void bundles.importBundle(mode)} />}
    <CreateObjectDialog key={String(creating)} open={creating} onOpenChange={setCreating} starters={starters} nativeActors={nativeActorChoices(context)} onCreate={(name, starter) => {
      const result = starter.startsWith("native:")
        ? createNativeActorVariant(workspace, name, starter.slice("native:".length))
        : createObjectDefinition(workspace, name, starter);
      if (result.isErr()) { setError(result.error); return; }
      persist(result.value.state); setSelectedId(result.value.id); setTab("appearance"); setCreating(false); setError(null);
    }} />
  </div>;
}
