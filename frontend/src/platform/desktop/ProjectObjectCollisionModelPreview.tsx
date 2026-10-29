import type { ScriptCustomObjectDefinition } from "@/editor/subviews/scripts/scriptWorkspaceState";
import { useProjectModelAssets } from "./useProjectModelAssets";
import { ProjectModelPreview } from "./ProjectModelPreview";

export function ProjectObjectCollisionModelPreview({ definition }: { definition: ScriptCustomObjectDefinition }) {
  const library = useProjectModelAssets();
  const asset = library.assets.find((candidate) => candidate.id === definition.assetId);
  if (asset) return <ProjectModelPreview key={`${asset.id}:${asset.revision}`} asset={asset} definition={definition} />;
  return <p className="workbench-muted" role="status">{library.error || (library.project ? "The linked model is not in the current project asset list. Check its assignment in Appearance if it remains unavailable." : "Open the owning desktop project to overlay this linked model.")}</p>;
}
