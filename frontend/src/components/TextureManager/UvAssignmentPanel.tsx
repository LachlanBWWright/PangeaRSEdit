import type { UvLayout } from "@/modelEditing/uv/uvTypes";
import { getTextureSizeLabel } from "@/components/TextureManager/textureItemState";

interface UvAssignmentPanelProps {
  textureName: string;
  textureType: "diffuse" | "normal" | "other";
  material?: string;
  size?: { width: number; height: number };
  uvLayout: UvLayout | null;
}

export function UvAssignmentPanel({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  textureName: __textureName,
  textureType,
  material,
  size,
  uvLayout,
}: UvAssignmentPanelProps) {
  const totalVertices = uvLayout?.meshes.reduce((sum, m) => sum + m.vertices.length, 0) ?? 0;
  const totalFaces = uvLayout?.meshes.reduce((sum, m) => sum + m.faces.length, 0) ?? 0;

  return (
    <div className="rounded border border-gray-700 bg-gray-900/60 p-3 text-sm space-y-2">
      <div className="flex justify-between">
        <span className="text-gray-400">Material</span>
        <span className="text-gray-200">{material ?? "Unknown"}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">Texture Type</span>
        <span className="text-gray-200 capitalize">{textureType}</span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-400">Resolution</span>
        <span className="text-gray-200">{getTextureSizeLabel(size)}</span>
      </div>
      {uvLayout && (
        <>
          <div className="flex justify-between">
            <span className="text-gray-400">UV Meshes</span>
            <span className="text-gray-200">{uvLayout.meshes.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">UV Vertices</span>
            <span className="text-gray-200">{totalVertices}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">UV Faces</span>
            <span className="text-gray-200">{totalFaces}</span>
          </div>
          <div className="mt-2 space-y-1">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Mesh Assignments</p>
            {uvLayout.meshes.map((mesh, index) => (
              <div
                key={index}
                className="flex justify-between rounded bg-gray-800/50 px-2 py-1 text-xs"
              >
                <span className="text-gray-200 truncate">{mesh.meshName}</span>
                <span className="text-gray-400 shrink-0 ml-2">
                  {mesh.vertices.length}v · {mesh.faces.length}f
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      {!uvLayout && (
        <p className="text-xs text-gray-500">
          Load a model with this texture to view UV assignment details.
        </p>
      )}
    </div>
  );
}
