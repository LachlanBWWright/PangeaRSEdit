import { useState } from "react";
import { z } from "zod";
import { assetImportResultSchema, projectAssetSchema, type AssetImportRecipe, type ProjectAsset } from "@pangea/desktop-contracts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "@/editor/subviews/scripts/scriptWorkspaceState";
import { desktopRequest } from "./client";
import { applyProjectAsset, projectAssetUsage } from "./projectModelAssignment";
import { ProjectModelPreview } from "./ProjectModelPreview";
import { ProjectModelImportSettings } from "./ProjectModelImportSettings";
import type { ProjectModelAssetLibrary } from "./useProjectModelAssets";

export function ProjectModelAssetWorkbench({ definition, workspace, onChange, library }: {
  definition: ScriptCustomObjectDefinition; workspace: ScriptWorkspaceState; onChange: (definition: ScriptCustomObjectDefinition) => void;
  library: ProjectModelAssetLibrary;
}) {
  const [selected, setSelected] = useState(definition.assetId ?? "");
  const [name, setName] = useState(definition.label);
  const [mode, setMode] = useState<"managed" | "external">("managed");
  const [recipeDraft, setRecipeDraft] = useState<{ asset: string; value: AssetImportRecipe } | null>(null);
  const [assignmentError, setAssignmentError] = useState("");
  const [previewReady, setPreviewReady] = useState("");
  const pending = library.pending.find((item) => item.asset.id === selected);
  const asset = pending?.asset ?? library.assets.find((item) => item.id === selected);
  const recipe: AssetImportRecipe = recipeDraft?.asset === selected ? recipeDraft.value : asset?.recipe ?? { scale: 1, rotation: [0, 0, 0] };
  const usage = asset ? projectAssetUsage(workspace, asset.id) : [];
  if (!library.project) return <p className="workbench-muted">Open a desktop project to import linked model assets.</p>;

  function assign(model: ProjectAsset) {
    const assigned = applyProjectAsset(definition, model);
    if (assigned.isErr()) setAssignmentError(assigned.error);
    else { setAssignmentError(""); onChange(assigned.value); }
  }
  async function importModel() {
    const result = await library.perform({ operation: "assets.import", name: name.trim(), mode, recipe }, assetImportResultSchema);
    if (!result) return;
    setSelected(result.asset.id);
    if (!result.needsReview) assign(result.asset);
  }
  async function acceptModel() {
    if (!pending) return;
    const accepted = await library.perform({ operation: "assets.accept", id: pending.asset.id, revision: pending.asset.revision }, projectAssetSchema);
    if (accepted) assign(accepted);
  }
  return <div className="grid gap-4">
    <label className="grid gap-2 text-sm">Project model<select className="rounded border border-slate-600 bg-slate-900 p-2" value={selected} disabled={library.busy} onChange={(event) => {
      setSelected(event.target.value);
      const next = library.assets.find((item) => item.id === event.target.value);
      if (next) setName(next.name);
    }}><option value="">Choose an asset or import a model</option>{library.assets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}{library.pending.filter((item) => !library.assets.some((current) => current.id === item.asset.id)).map((item) => <option key={item.asset.id} value={item.asset.id}>{item.asset.name} (review required)</option>)}</select></label>
    {asset && <>
      <ProjectModelPreview key={`${asset.id}:${asset.revision}`} asset={asset} definition={definition} onReady={setPreviewReady} />
      {pending ? <div className="workbench-notice" data-tone="warning"><h4>Review conversion before applying</h4><p>The previous working version remains in use.</p><ul className="my-3 list-disc pl-5">{pending.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul><div className="flex flex-wrap gap-2"><Button disabled={library.busy || previewReady !== asset.revision} onClick={() => void acceptModel()}>Accept conversion and use asset</Button><Button variant="secondary" disabled={library.busy} onClick={() => void library.perform({ operation: "assets.discard", id: pending.asset.id, revision: pending.asset.revision }, z.void())}>Discard conversion</Button></div></div> : <Button className="justify-self-start" disabled={library.busy || definition.assetId === asset.id} onClick={() => assign(asset)}>{definition.assetId === asset.id ? "Used by this object" : "Use this asset"}</Button>}
      <p className="workbench-muted">{usage.length ? `Used by ${usage.map((item) => `${item.label} (${item.placements} placements)`).join(", ")}. Compatible reimports update every use.` : "This asset is not assigned to an object yet."}</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={library.busy} onClick={() => void library.perform({ operation: "assets.external", id: asset.id, action: "open" }, z.void())}>Open source</Button>
        <Button size="sm" variant="secondary" disabled={library.busy} onClick={() => void library.perform({ operation: "assets.reimport", id: asset.id, relocate: false, recipe }, assetImportResultSchema)}>Reimport</Button>
        <Button size="sm" variant="ghost" disabled={library.busy || !asset.previousRevision} onClick={() => void library.perform({ operation: "assets.undo", id: asset.id }, projectAssetSchema)}>Undo reimport</Button>
        <Button size="sm" variant="ghost" disabled={library.busy} onClick={async () => { const duplicate = await library.perform({ operation: "assets.duplicate", id: asset.id, name: `${asset.name} copy`.slice(0, 120) }, projectAssetSchema); if (duplicate) { setSelected(duplicate.id); assign(duplicate); } }}>Duplicate asset</Button>
      </div>
      <details className="border-t border-slate-700 pt-3"><summary className="cursor-pointer text-sm">Source and generated files</summary><div className="mt-3 grid gap-2 text-sm"><p className="break-all">{asset.source.mode === "managed" ? "Project source" : "External source"}: {asset.source.originalName}</p><p>{asset.source.dependencies.length} source dependencies · {asset.animations.length} animation clips</p><p className="break-all text-slate-400">{asset.outputs.model}{asset.outputs.skeleton && <><br />{asset.outputs.skeleton}</>}</p>{asset.warnings.map((warning) => <p key={warning} className="text-amber-300">{warning}</p>)}<div className="flex flex-wrap gap-2"><Button size="sm" variant="ghost" disabled={library.busy} onClick={() => void library.perform({ operation: "assets.external", id: asset.id, action: "reveal" }, z.void())}>Reveal source</Button><Button size="sm" variant="ghost" disabled={library.busy} onClick={() => void library.perform({ operation: "assets.reimport", id: asset.id, relocate: true, recipe }, assetImportResultSchema)}>Locate moved source</Button></div></div></details>
    </>}
    {pending && <p className="workbench-muted">Accept or discard this conversion before adjusting its import settings.</p>}
    <ProjectModelImportSettings asset={asset} recipe={recipe} onChange={(value) => setRecipeDraft({ asset: selected, value })} disabled={library.busy || pending !== undefined} />
    <div className="grid gap-3 border-t border-slate-700 pt-4">
      <h4 className="text-sm font-medium">Import a new asset</h4>
      <label className="grid gap-1 text-sm">Asset name<Input value={name} maxLength={120} disabled={library.busy} onChange={(event) => setName(event.target.value)} /></label>
      <label className="grid gap-1 text-sm">Authoring source<select className="rounded border border-slate-600 bg-slate-900 p-2" value={mode} disabled={library.busy} onChange={(event) => setMode(event.target.value === "external" ? "external" : "managed")}><option value="managed">Copy into project (portable)</option><option value="external">Link external source</option></select></label>
      <p className="workbench-muted">Choose .blend, .gltf, .glb, .bg3d or .3dmf. Native model and skeleton companions are imported together. Save an external source to rebuild its shared game assets.</p>
      <div className="flex flex-wrap gap-2"><Button disabled={library.busy || !name.trim()} onClick={() => void importModel()}>Import model…</Button><Button variant="ghost" disabled={library.busy} onClick={() => void library.perform({ operation: "assets.configure-blender" }, z.object({ executable: z.string() }))}>Configure Blender…</Button>{library.busy && <Button variant="secondary" onClick={() => void desktopRequest({ operation: "assets.cancel" }, z.void())}>Cancel import</Button>}</div>
    </div>
    {library.message && <p className="workbench-muted" role="status">{library.message}</p>}
    {(library.error || assignmentError) && <p className="workbench-notice" data-tone="warning" role="alert">{library.error || assignmentError}</p>}
  </div>;
}
