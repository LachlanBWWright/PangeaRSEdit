import type { PointerEvent, RefObject } from "react";
import type { UvMeshLayout } from "@/modelEditing/uv/uvTypes";
import {
  buildMeshPath,
  getMeshStroke,
  UV_WORKSPACE_SIZE,
} from "./uvMapEditorState";

interface UvEditorCanvasProps {
  readonly textureUrl: string;
  readonly textureName: string;
  readonly meshes: readonly UvMeshLayout[];
  readonly selectedMesh: UvMeshLayout | null;
  readonly selectedVertexIndex: number | null;
  readonly overlappingMeshIds: ReadonlySet<string>;
  readonly showOtherMeshes: boolean;
  readonly zoomPercent: number;
  readonly svgRef: RefObject<SVGSVGElement | null>;
  readonly zoomTargetRef: RefObject<HTMLDivElement | null>;
  readonly onSelectMesh: (mesh: UvMeshLayout) => void;
  readonly onStartVertexDrag: (
    event: PointerEvent<SVGCircleElement>,
    meshId: string,
    vertexIndex: number,
  ) => void;
  readonly onMoveVertex: (clientX: number, clientY: number) => void;
  readonly onEndVertexDrag: () => void;
}

function MeshPath({
  mesh,
  meshIndex,
  isOverlapping,
  onSelect,
}: {
  readonly mesh: UvMeshLayout;
  readonly meshIndex: number;
  readonly isOverlapping: boolean;
  readonly onSelect: (mesh: UvMeshLayout) => void;
}) {
  return (
    <path
      d={buildMeshPath(mesh)}
      fill={isOverlapping ? "rgba(251, 191, 36, 0.08)" : "none"}
      stroke={getMeshStroke(meshIndex)}
      strokeWidth={isOverlapping ? "1.4" : "0.85"}
      opacity={isOverlapping ? 0.95 : 0.45}
      className="cursor-pointer"
      onPointerDown={(event) => {
        event.stopPropagation();
        onSelect(mesh);
      }}
    />
  );
}

export function UvEditorCanvas({
  textureUrl,
  textureName,
  meshes,
  selectedMesh,
  selectedVertexIndex,
  overlappingMeshIds,
  showOtherMeshes,
  zoomPercent,
  svgRef,
  zoomTargetRef,
  onSelectMesh,
  onStartVertexDrag,
  onMoveVertex,
  onEndVertexDrag,
}: UvEditorCanvasProps) {
  const zoomScale = zoomPercent / 100;
  const selectedMeshIndex = selectedMesh
    ? Math.max(0, meshes.findIndex((mesh) => mesh.meshId === selectedMesh.meshId))
    : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex min-h-0 flex-1 flex-col rounded border border-gray-700 bg-gray-900/60 p-3">
        <div className="mb-3 flex shrink-0 items-center justify-between text-xs text-gray-400">
          <span>Wheel over the texture to zoom; use the scrollbars to pan.</span>
          <span>{UV_WORKSPACE_SIZE} px workspace</span>
        </div>
        <div
          className="relative min-h-65 flex-1 overflow-auto rounded border border-gray-700 bg-checkered custom-scrollbar"
        >
          <div
            ref={zoomTargetRef}
            className="relative"
            style={{
              width: `${UV_WORKSPACE_SIZE * zoomScale}px`,
              height: `${UV_WORKSPACE_SIZE * zoomScale}px`,
            }}
          >
            <img
              src={textureUrl}
              alt={`${textureName} texture`}
              className="absolute inset-0 h-full w-full object-contain"
              style={{ imageRendering: "pixelated" }}
            />
            <svg
              ref={svgRef}
              viewBox={`0 0 ${UV_WORKSPACE_SIZE} ${UV_WORKSPACE_SIZE}`}
              className="absolute inset-0 h-full w-full touch-none"
              aria-label={`UV layout for ${textureName}`}
              onPointerMove={(event) =>
                onMoveVertex(event.clientX, event.clientY)
              }
              onPointerUp={onEndVertexDrag}
              onPointerCancel={onEndVertexDrag}
            >
              {showOtherMeshes &&
                meshes
                  .filter((mesh) => mesh.meshId !== selectedMesh?.meshId)
                  .map((mesh) => (
                    <MeshPath
                      key={`${mesh.meshId}-ghost`}
                      mesh={mesh}
                      meshIndex={meshes.findIndex(
                        (entry) => entry.meshId === mesh.meshId,
                      )}
                      isOverlapping={overlappingMeshIds.has(mesh.meshId)}
                      onSelect={onSelectMesh}
                    />
                  ))}

              {selectedMesh && (
                <>
                  <path
                    d={buildMeshPath(selectedMesh)}
                    fill="rgba(56, 189, 248, 0.16)"
                    stroke={getMeshStroke(selectedMeshIndex)}
                    strokeWidth="1.8"
                  />
                  {selectedMesh.vertices.map((vertex, index) => {
                    const isSelected = selectedVertexIndex === index;
                    return (
                      <circle
                        key={`${selectedMesh.meshId}-${index}`}
                        cx={vertex.u * UV_WORKSPACE_SIZE}
                        cy={vertex.v * UV_WORKSPACE_SIZE}
                        r={isSelected ? 5 : 3.25}
                        fill={isSelected ? "#f97316" : "#ffffff"}
                        stroke={isSelected ? "#fdba74" : "#0f172a"}
                        strokeWidth={1.2}
                        className="cursor-pointer"
                        onPointerDown={(event) =>
                          onStartVertexDrag(
                            event,
                            selectedMesh.meshId,
                            index,
                          )
                        }
                      />
                    );
                  })}
                </>
              )}
            </svg>
          </div>
        </div>
      </div>
      <p className="shrink-0 text-xs text-gray-500">
        Drag a vertex to reposition it. Coordinates are constrained to the
        texture bounds.
      </p>
    </div>
  );
}
