import { Input } from "@/components/ui/input";
import { ProjectObjectAssetPicker } from "@/platform/desktop/ProjectObjectAssetPicker";
import { ProjectModelAssetWorkbench } from "@/platform/desktop/ProjectModelAssetWorkbench";
import type { ProjectModelAssetLibrary } from "@/platform/desktop/useProjectModelAssets";
import { UploadedModelObjectPicker } from "./UploadedModelObjectPicker";
import { getCustomModelFormat } from "./scriptObjectActions";
import type { ScriptCustomObjectDefinition, ScriptWorkspaceState } from "./scriptWorkspaceState";

export function ObjectAppearanceAssets({ definition, workspace, projectModel, library, onChange, onUpload, uploading }: {
  definition: ScriptCustomObjectDefinition; workspace: ScriptWorkspaceState; projectModel: boolean; library: ProjectModelAssetLibrary;
  onChange: (definition: ScriptCustomObjectDefinition) => void; onUpload: (file: File, role: "model" | "skeleton") => void; uploading: boolean;
}) {
  const visual = definition.visual;
  if (visual.kind !== "customDisplayGroup" && visual.kind !== "customSkeleton") return null;
  const format = getCustomModelFormat(workspace.context.gameId);
  if (projectModel) return <ProjectModelAssetWorkbench key={definition.id} definition={definition} workspace={workspace} onChange={onChange} library={library} />;
  const loaded = !!workspace.assets[visual.modelPath];
  return <div className="grid gap-3">
    <details className="workbench-disclosure" open={!loaded}>
      <summary>{loaded ? "Replace uploaded assets" : "Add model assets"}</summary>
      <div className="grid gap-3">
        <ProjectObjectAssetPicker format={format} role="model" disabled={uploading} onUpload={onUpload} />
        <label className="workbench-field">Upload model<Input type="file" disabled={uploading} accept={`.${format}${format === "bg3d" && visual.kind === "customDisplayGroup" ? ",.gltf,.glb" : ""}`} onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file, "model"); event.target.value = ""; }} /></label>
        {visual.kind === "customSkeleton" && <>
          <ProjectObjectAssetPicker format={format} role="skeleton" disabled={uploading} onUpload={onUpload} />
          <label className="workbench-field">Skeleton resource<Input type="file" accept=".rsrc" disabled={uploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) onUpload(file, "skeleton"); event.target.value = ""; }} /></label>
        </>}
        <p className="workbench-muted">Up to 16 MiB per asset.</p>
      </div>
    </details>
    <details className="workbench-disclosure"><summary>Asset files</summary><div>
      <p className="break-all text-xs">{loaded ? "Added: " : "Needed: "}{visual.modelPath}</p>
      {visual.kind === "customSkeleton" && <p className="break-all text-xs">{workspace.assets[`${visual.skeletonPath}.rsrc`] ? "Added: " : "Needed: "}{visual.skeletonPath}.rsrc</p>}
    </div></details>
    {visual.kind === "customDisplayGroup" && loaded && <details className="workbench-disclosure"><summary>Objects in this file</summary><UploadedModelObjectPicker key={visual.modelPath} definition={definition} workspace={workspace} onChange={onChange} /></details>}
  </div>;
}
