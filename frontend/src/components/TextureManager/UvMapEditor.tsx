import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  FlipHorizontal,
  FlipVertical,
  Maximize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type {
  UvLayout,
  UvMeshLayout,
  UvVertex,
} from "@/modelEditing/uv/uvTypes";
import {
  applyUvTransform,
  fitUvToImage,
  snapUvToPixelGrid,
} from "@/modelEditing/uv/uvTransforms";

interface UvMapEditorProps {
  textureUrl: string;
  textureName: string;
  uvLayout: UvLayout | null;
  textureSize?: { width: number; height: number };
  onPreviewEdit?: (updatedLayout: UvLayout) => void;
  onApplyEdit?: (updatedLayout: UvLayout) => void;
}

const DISPLAY_SIZE = 1024;
const ZOOM_LEVELS = [50, 75, 100, 150, 200, 300, 400, 600, 800] as const;
const WHEEL_ZOOM_FACTOR = 1.1;
const OVERLAP_THRESHOLD = 0.7;

interface UvBounds {
  readonly minU: number;
  readonly maxU: number;
  readonly minV: number;
  readonly maxV: number;
  readonly area: number;
}

function clampUv(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function clampZoomPercent(value: number): number {
  return Math.min(800, Math.max(50, value));
}

function getSteppedZoomPercent(currentZoom: number, direction: 1 | -1): number {
  const currentIndex = ZOOM_LEVELS.indexOf(
    ZOOM_LEVELS.find((level) => level >= currentZoom) ?? 100,
  );
  const nextIndex = Math.min(
    ZOOM_LEVELS.length - 1,
    Math.max(0, currentIndex + direction),
  );
  return ZOOM_LEVELS[nextIndex] ?? currentZoom;
}

function getWheelZoomPercent(currentZoom: number, deltaY: number): number {
  const direction = deltaY > 0 ? -1 : 1;
  const nextZoom =
    direction > 0
      ? currentZoom * WHEEL_ZOOM_FACTOR
      : currentZoom / WHEEL_ZOOM_FACTOR;
  return Math.round(clampZoomPercent(nextZoom));
}

function getMeshStroke(index: number): string {
  const colors = [
    "rgba(56, 189, 248, 0.95)",
    "rgba(244, 114, 182, 0.95)",
    "rgba(34, 197, 94, 0.95)",
    "rgba(251, 191, 36, 0.95)",
    "rgba(168, 85, 247, 0.95)",
    "rgba(248, 113, 113, 0.95)",
  ] as const;
  return colors[index % colors.length] ?? colors[0];
}

function getMeshBounds(mesh: UvMeshLayout): UvBounds {
  if (mesh.vertices.length === 0) {
    return { minU: 0, maxU: 0, minV: 0, maxV: 0, area: 0 };
  }

  let minU = Infinity;
  let maxU = -Infinity;
  let minV = Infinity;
  let maxV = -Infinity;
  for (const vertex of mesh.vertices) {
    minU = Math.min(minU, vertex.u);
    maxU = Math.max(maxU, vertex.u);
    minV = Math.min(minV, vertex.v);
    maxV = Math.max(maxV, vertex.v);
  }

  return {
    minU,
    maxU,
    minV,
    maxV,
    area: Math.max(0, maxU - minU) * Math.max(0, maxV - minV),
  };
}

function getOverlapRatio(a: UvBounds, b: UvBounds): number {
  const overlapWidth = Math.max(
    0,
    Math.min(a.maxU, b.maxU) - Math.max(a.minU, b.minU),
  );
  const overlapHeight = Math.max(
    0,
    Math.min(a.maxV, b.maxV) - Math.max(a.minV, b.minV),
  );
  const smallerArea = Math.min(a.area, b.area);
  if (smallerArea <= 0) {
    return 0;
  }

  return (overlapWidth * overlapHeight) / smallerArea;
}

function buildMeshPath(
  mesh: UvMeshLayout,
  displayWidth: number,
  displayHeight: number,
): string {
  return mesh.faces
    .map((face) => {
      const [i0, i1, i2] = face.vertexIndices;
      const v0 = mesh.vertices[i0];
      const v1 = mesh.vertices[i1];
      const v2 = mesh.vertices[i2];
      if (!v0 || !v1 || !v2) {
        return "";
      }

      return [
        `M ${(v0.u * displayWidth).toFixed(1)} ${(v0.v * displayHeight).toFixed(1)}`,
        `L ${(v1.u * displayWidth).toFixed(1)} ${(v1.v * displayHeight).toFixed(1)}`,
        `L ${(v2.u * displayWidth).toFixed(1)} ${(v2.v * displayHeight).toFixed(1)}`,
        "Z",
      ].join(" ");
    })
    .filter((segment) => segment.length > 0)
    .join(" ");
}

function replaceVertex(
  layout: UvLayout,
  meshId: string,
  vertexIndex: number,
  nextVertex: UvVertex,
): UvLayout {
  return {
    ...layout,
    meshes: layout.meshes.map((mesh) => {
      if (mesh.meshId !== meshId) {
        return mesh;
      }

      return {
        ...mesh,
        vertices: mesh.vertices.map((vertex, index) =>
          index === vertexIndex ? nextVertex : vertex,
        ),
      };
    }),
  };
}

function applyScopedLayoutChange(
  layout: UvLayout,
  selectedMeshId: string,
  editSelectedOnly: boolean,
  mapper: (layout: UvLayout) => UvLayout,
): UvLayout {
  if (!editSelectedOnly) {
    return mapper(layout);
  }

  const selectedMesh = layout.meshes.find(
    (mesh) => mesh.meshId === selectedMeshId,
  );
  if (!selectedMesh) {
    return layout;
  }

  const scopedResult = mapper({ ...layout, meshes: [selectedMesh] });
  const nextSelectedMesh = scopedResult.meshes[0];
  if (!nextSelectedMesh) {
    return layout;
  }

  return {
    ...layout,
    meshes: layout.meshes.map((mesh) =>
      mesh.meshId === selectedMeshId ? nextSelectedMesh : mesh,
    ),
  };
}

export function UvMapEditor({
  textureUrl,
  textureName,
  uvLayout,
  textureSize,
  onPreviewEdit,
  onApplyEdit,
}: UvMapEditorProps) {
  const [draftLayout, setDraftLayout] = useState<UvLayout | null>(
    () => uvLayout,
  );
  const [selectedMeshId, setSelectedMeshId] = useState<string>(
    () => uvLayout?.meshes[0]?.meshId ?? "",
  );
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(
    () => (uvLayout?.meshes[0]?.vertices.length ? 0 : null),
  );
  const [showOtherMeshes, setShowOtherMeshes] = useState(
    () => (uvLayout?.meshes.length ?? 0) > 1,
  );
  const [editSelectedOnly, setEditSelectedOnly] = useState(true);
  const [zoomPercent, setZoomPercent] = useState(100);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const canvasScrollRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ meshId: string; vertexIndex: number } | null>(
    null,
  );

  const selectedMesh = useMemo(() => {
    if (!draftLayout) {
      return null;
    }

    return (
      draftLayout.meshes.find((mesh) => mesh.meshId === selectedMeshId) ??
      draftLayout.meshes[0] ??
      null
    );
  }, [draftLayout, selectedMeshId]);

  const resolvedSelectedVertexIndex =
    selectedMesh &&
    selectedVertexIndex !== null &&
    selectedVertexIndex < selectedMesh.vertices.length
      ? selectedVertexIndex
      : selectedMesh && selectedMesh.vertices.length > 0
        ? 0
        : null;
  const selectedVertex =
    selectedMesh && resolvedSelectedVertexIndex !== null
      ? (selectedMesh.vertices[resolvedSelectedVertexIndex] ?? null)
      : null;
  const selectedMeshIndex = useMemo(() => {
    if (!draftLayout || !selectedMesh) {
      return 0;
    }

    return Math.max(
      0,
      draftLayout.meshes.findIndex(
        (mesh) => mesh.meshId === selectedMesh.meshId,
      ),
    );
  }, [draftLayout, selectedMesh]);
  const overlappingMeshes = useMemo(() => {
    if (!draftLayout || !selectedMesh) {
      return [];
    }

    const selectedBounds = getMeshBounds(selectedMesh);
    return draftLayout.meshes
      .filter((mesh) => mesh.meshId !== selectedMesh.meshId)
      .map((mesh) => ({
        mesh,
        ratio: getOverlapRatio(selectedBounds, getMeshBounds(mesh)),
      }))
      .filter((entry) => entry.ratio >= OVERLAP_THRESHOLD);
  }, [draftLayout, selectedMesh]);
  const zoomScale = zoomPercent / 100;

  const updateDraft = useCallback(
    (nextLayout: UvLayout) => {
      setDraftLayout(nextLayout);
      onPreviewEdit?.(nextLayout);
    },
    [onPreviewEdit],
  );

  const getUvFromPointer = useCallback(
    (clientX: number, clientY: number): UvVertex | null => {
      const svgElement = svgRef.current;
      if (!svgElement) {
        return null;
      }

      const bounds = svgElement.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) {
        return null;
      }

      return {
        u: clampUv((clientX - bounds.left) / bounds.width),
        v: clampUv((clientY - bounds.top) / bounds.height),
      };
    },
    [],
  );

  const applyPointerPosition = useCallback(
    (clientX: number, clientY: number) => {
      if (!draftLayout || !dragStateRef.current) {
        return;
      }

      const nextVertex = getUvFromPointer(clientX, clientY);
      if (!nextVertex) {
        return;
      }

      updateDraft(
        replaceVertex(
          draftLayout,
          dragStateRef.current.meshId,
          dragStateRef.current.vertexIndex,
          nextVertex,
        ),
      );
    },
    [draftLayout, getUvFromPointer, updateDraft],
  );

  const handleReset = useCallback(() => {
    if (!uvLayout) {
      return;
    }

    setDraftLayout(uvLayout);
    setSelectedMeshId(uvLayout.meshes[0]?.meshId ?? "");
    setSelectedVertexIndex(uvLayout.meshes[0]?.vertices.length ? 0 : null);
    onPreviewEdit?.(uvLayout);
  }, [onPreviewEdit, uvLayout]);

  const applyWholeLayout = useCallback(
    (mapper: (layout: UvLayout) => UvLayout) => {
      if (!draftLayout) {
        return;
      }

      updateDraft(
        applyScopedLayoutChange(
          draftLayout,
          selectedMesh?.meshId ?? "",
          editSelectedOnly,
          mapper,
        ),
      );
    },
    [draftLayout, editSelectedOnly, selectedMesh?.meshId, updateDraft],
  );

  const handleApply = useCallback(() => {
    if (!draftLayout || !onApplyEdit) {
      return;
    }

    onApplyEdit(draftLayout);
  }, [draftLayout, onApplyEdit]);

  const setZoomByStep = useCallback((direction: 1 | -1) => {
    setZoomPercent((currentZoom) =>
      getSteppedZoomPercent(currentZoom, direction),
    );
  }, []);

  const resetZoom = useCallback(() => {
    setZoomPercent(100);
  }, []);

  useEffect(() => {
    const container = canvasScrollRef.current;
    if (!container) {
      return;
    }

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoomPercent((currentZoom) =>
        getWheelZoomPercent(currentZoom, event.deltaY),
      );
    };

    container.addEventListener("wheel", handleWheel, {
      passive: false,
      capture: true,
    });

    return () => {
      container.removeEventListener("wheel", handleWheel, {
        capture: true,
      });
    };
  }, []);

  const handleVertexCoordinateChange = useCallback(
    (axis: "u" | "v", value: string) => {
      if (
        !draftLayout ||
        !selectedMesh ||
        resolvedSelectedVertexIndex === null
      ) {
        return;
      }

      const numericValue = Number(value);
      if (!Number.isFinite(numericValue)) {
        return;
      }

      updateDraft(
        replaceVertex(
          draftLayout,
          selectedMesh.meshId,
          resolvedSelectedVertexIndex,
          {
            u: axis === "u" ? clampUv(numericValue) : (selectedVertex?.u ?? 0),
            v: axis === "v" ? clampUv(numericValue) : (selectedVertex?.v ?? 0),
          },
        ),
      );
    },
    [
      draftLayout,
      resolvedSelectedVertexIndex,
      selectedMesh,
      selectedVertex?.u,
      selectedVertex?.v,
      updateDraft,
    ],
  );

  if (!draftLayout || draftLayout.meshes.length === 0) {
    return (
      <div className="rounded border border-gray-700 bg-gray-900/60 p-4 text-sm text-gray-400">
        No UV data is available for {textureName}. This texture is not bound to
        any mesh material in the loaded model.
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="justify-start gap-1"
          onClick={() => setZoomByStep(-1)}
        >
          <ZoomOut className="w-3 h-3" /> Zoom Out
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="min-w-20"
          onClick={resetZoom}
        >
          {zoomPercent}%
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="justify-start gap-1"
          onClick={() => setZoomByStep(1)}
        >
          <ZoomIn className="w-3 h-3" /> Zoom In
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="justify-start gap-1"
          onClick={() => applyWholeLayout((layout) => fitUvToImage(layout))}
        >
          <Maximize2 className="w-3 h-3" />
          {editSelectedOnly ? "Fit Selected" : "Fit All"}
        </Button>
        <Button
          size="sm"
          className="justify-start gap-1"
          variant="outline"
          onClick={() =>
            applyWholeLayout((layout) =>
              applyUvTransform({
                layout,
                offsetU: 0,
                offsetV: 0,
                rotationDeg: 0,
                scaleU: 1,
                scaleV: 1,
                flipU: true,
                flipV: false,
              }),
            )
          }
        >
          <FlipHorizontal className="w-3 h-3" /> Flip U
        </Button>
        <Button
          size="sm"
          className="justify-start gap-1"
          variant="outline"
          onClick={() =>
            applyWholeLayout((layout) =>
              applyUvTransform({
                layout,
                offsetU: 0,
                offsetV: 0,
                rotationDeg: 0,
                scaleU: 1,
                scaleV: 1,
                flipU: false,
                flipV: true,
              }),
            )
          }
        >
          <FlipVertical className="w-3 h-3" /> Flip V
        </Button>
        {textureSize && (
          <Button
            size="sm"
            variant="outline"
            className="justify-start gap-1"
            onClick={() =>
              applyWholeLayout((layout) =>
                snapUvToPixelGrid(
                  layout,
                  textureSize.width,
                  textureSize.height,
                ),
              )
            }
          >
            Snap to Grid
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          className="gap-1"
          onClick={handleReset}
        >
          <RotateCcw className="w-3 h-3" /> Reset Preview
        </Button>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[220px_minmax(0,1fr)_220px]">
        <div className="flex min-h-0 flex-col gap-3 rounded border border-gray-700 bg-gray-900/60 p-3">
          <div className="space-y-1">
            <Label className="text-xs text-gray-400">Texture Material</Label>
            <p className="text-sm text-gray-100">
              {draftLayout.materialName ?? "Unknown"}
            </p>
          </div>
          <div className="flex items-center justify-between">
            <Label
              htmlFor="show-other-meshes"
              className="text-xs text-gray-400"
            >
              Show Other Meshes
            </Label>
          <Switch
            id="show-other-meshes"
            checked={showOtherMeshes}
            onCheckedChange={setShowOtherMeshes}
          />
        </div>
        <div className="flex items-center justify-between rounded border border-gray-700 bg-gray-950/50 px-2 py-1.5">
          <Label htmlFor="edit-selected-only" className="text-xs text-gray-400">
            Edit Selected Only
          </Label>
          <Switch
            id="edit-selected-only"
            checked={editSelectedOnly}
            onCheckedChange={setEditSelectedOnly}
          />
        </div>
        {overlappingMeshes.length > 0 && (
          <div className="rounded border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-100">
            {overlappingMeshes.length} overlapping track
            {overlappingMeshes.length === 1 ? "" : "s"} near the selected UVs.
          </div>
        )}
          <div className="space-y-2">
            <Label className="text-xs text-gray-400">Mesh Tracks</Label>
            <div className="max-h-[32vh] space-y-1 overflow-y-auto rounded border border-gray-700 bg-gray-950/50 p-1 xl:max-h-none">
              {draftLayout.meshes.map((mesh, meshIndex) => {
                const isSelected = mesh.meshId === selectedMesh?.meshId;
                const isOverlapping = overlappingMeshes.some(
                  (entry) => entry.mesh.meshId === mesh.meshId,
                );
                return (
                  <button
                    key={mesh.meshId}
                    type="button"
                    className={`w-full rounded-md border px-2 py-2 text-left transition ${
                      isSelected
                        ? "border-sky-500 bg-sky-500/10"
                        : "border-transparent bg-gray-900/70 hover:border-gray-700 hover:bg-gray-900"
                    }`}
                    onClick={() => {
                      setSelectedMeshId(mesh.meshId);
                      setSelectedVertexIndex(
                        mesh.vertices.length > 0 ? 0 : null,
                      );
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: getMeshStroke(meshIndex) }}
                      />
                      <div className="truncate text-sm text-gray-100">
                        {mesh.meshName}
                      </div>
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-gray-400">
                      <span>{mesh.vertices.length} vertices</span>
                      <span>
                        {isOverlapping ? "overlap" : `${mesh.faces.length} faces`}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex min-h-0 flex-1 flex-col rounded border border-gray-700 bg-gray-900/60 p-3">
            <div className="mb-3 flex shrink-0 items-center justify-between text-xs text-gray-400">
              <span>Zoom and scroll to inspect shared UV islands closely.</span>
              <span>{DISPLAY_SIZE} px workspace</span>
            </div>
            <div
              ref={canvasScrollRef}
              className="relative min-h-[260px] flex-1 overflow-auto rounded border border-gray-700 bg-checkered custom-scrollbar"
            >
              <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-lg border border-gray-700 bg-gray-800/90 p-1.5 shadow-xl">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-gray-300 hover:bg-gray-700"
                  onClick={() => setZoomByStep(-1)}
                  title="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-[11px] font-medium text-gray-300 hover:bg-gray-700"
                  onClick={resetZoom}
                  title="Reset zoom"
                >
                  {zoomPercent}%
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-gray-300 hover:bg-gray-700"
                  onClick={() => setZoomByStep(1)}
                  title="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              <div
                className="relative"
                style={{
                  width: `${DISPLAY_SIZE * zoomScale}px`,
                  height: `${DISPLAY_SIZE * zoomScale}px`,
                }}
              >
                <img
                  src={textureUrl}
                  alt={`${textureName} UV map`}
                  className="absolute inset-0 h-full w-full object-contain"
                  style={{ imageRendering: "pixelated" }}
                />
                <svg
                  ref={svgRef}
                  viewBox={`0 0 ${DISPLAY_SIZE} ${DISPLAY_SIZE}`}
                  className="absolute inset-0 h-full w-full"
                  onPointerMove={(event) =>
                    applyPointerPosition(event.clientX, event.clientY)
                  }
                  onPointerUp={() => {
                    dragStateRef.current = null;
                  }}
                  onPointerLeave={() => {
                    dragStateRef.current = null;
                  }}
                >
                  {showOtherMeshes &&
                    draftLayout.meshes
                      .filter((mesh) => mesh.meshId !== selectedMesh?.meshId)
                      .map((mesh) => {
                        const meshIndex = draftLayout.meshes.findIndex(
                          (entry) => entry.meshId === mesh.meshId,
                        );
                        const isOverlapping = overlappingMeshes.some(
                          (entry) => entry.mesh.meshId === mesh.meshId,
                        );
                        return (
                          <path
                            key={`${mesh.meshId}-ghost`}
                            d={buildMeshPath(mesh, DISPLAY_SIZE, DISPLAY_SIZE)}
                            fill={
                              isOverlapping
                                ? "rgba(251, 191, 36, 0.08)"
                                : "none"
                            }
                            stroke={getMeshStroke(meshIndex)}
                            strokeWidth={isOverlapping ? "1.4" : "0.85"}
                            opacity={isOverlapping ? 0.95 : 0.45}
                            className="cursor-pointer"
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              setSelectedMeshId(mesh.meshId);
                              setSelectedVertexIndex(
                                mesh.vertices.length > 0 ? 0 : null,
                              );
                            }}
                          />
                        );
                      })}

                  {selectedMesh && (
                    <>
                      <path
                        d={buildMeshPath(
                          selectedMesh,
                          DISPLAY_SIZE,
                          DISPLAY_SIZE,
                        )}
                        fill="rgba(56, 189, 248, 0.16)"
                        stroke={getMeshStroke(selectedMeshIndex)}
                        strokeWidth="1.8"
                      />
                      {selectedMesh.vertices.map((vertex, index) => {
                        const isSelected =
                          resolvedSelectedVertexIndex === index;
                        return (
                          <circle
                            key={`${selectedMesh.meshId}-${index}`}
                            cx={vertex.u * DISPLAY_SIZE}
                            cy={vertex.v * DISPLAY_SIZE}
                            r={isSelected ? 5 : 3.25}
                            fill={isSelected ? "#f97316" : "#ffffff"}
                            stroke={isSelected ? "#fdba74" : "#0f172a"}
                            strokeWidth={1.2}
                            className="cursor-pointer"
                            onPointerDown={(event) => {
                              event.stopPropagation();
                              setSelectedMeshId(selectedMesh.meshId);
                              setSelectedVertexIndex(index);
                              dragStateRef.current = {
                                meshId: selectedMesh.meshId,
                                vertexIndex: index,
                              };
                              event.currentTarget.setPointerCapture(
                                event.pointerId,
                              );
                              applyPointerPosition(
                                event.clientX,
                                event.clientY,
                              );
                            }}
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
            Drag a point to move it. Use the zoom controls above and scroll the
            workspace when you need to pan across a dense shared texture.
          </p>
        </div>

        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded border border-gray-700 bg-gray-900/60 p-3">
          <div className="space-y-1">
            <Label className="text-xs text-gray-400">Selected Mesh</Label>
            <p className="text-sm text-gray-100">
              {selectedMesh?.meshName ?? "None"}
            </p>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-gray-400">Selected Vertex</Label>
            <p className="text-sm text-gray-100">
              {resolvedSelectedVertexIndex !== null
                ? `#${resolvedSelectedVertexIndex}`
                : "Pick a vertex"}
            </p>
          </div>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-xs text-gray-400">U</Label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.001}
                value={selectedVertex?.u.toFixed(3) ?? ""}
                disabled={!selectedVertex}
                onChange={(event) =>
                  handleVertexCoordinateChange("u", event.target.value)
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-gray-400">V</Label>
              <Input
                type="number"
                min={0}
                max={1}
                step={0.001}
                value={selectedVertex?.v.toFixed(3) ?? ""}
                disabled={!selectedVertex}
                onChange={(event) =>
                  handleVertexCoordinateChange("v", event.target.value)
                }
              />
            </div>
          </div>
          <div className="rounded border border-gray-700 bg-gray-950/60 p-2 text-xs text-gray-400">
            <div className="flex justify-between">
              <span>Meshes</span>
              <span>{draftLayout.meshes.length}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>Total faces</span>
              <span>
                {draftLayout.meshes.reduce(
                  (sum, mesh) => sum + mesh.faces.length,
                  0,
                )}
              </span>
            </div>
          </div>
          <Button size="sm" onClick={handleApply} disabled={!onApplyEdit}>
            Apply UV Edits
          </Button>
        </div>
      </div>
    </div>
  );
}
