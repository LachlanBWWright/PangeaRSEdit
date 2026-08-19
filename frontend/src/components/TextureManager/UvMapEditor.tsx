import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PointerEvent } from "react";
import { FlipHorizontal, FlipVertical, Maximize2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditorZoomControls } from "@/components/editor/EditorZoomControls";
import type { UvLayout, UvMeshLayout, UvVertex } from "@/modelEditing/uv/uvTypes";
import { applyUvTransform, fitUvToImage, snapUvToPixelGrid } from "@/modelEditing/uv/uvTransforms";
import { UvEditorCanvas } from "./UvEditorCanvas";
import { UvMeshPanel, UvVertexInspector } from "./UvEditorPanels";
import {
  applyScopedLayoutChange,
  clampUv,
  getMeshBounds,
  getOverlapRatio,
  getSteppedZoomPercent,
  getWheelZoomPercent,
  replaceVertex,
  UV_OVERLAP_THRESHOLD,
} from "./uvMapEditorState";

interface UvMapEditorProps {
  readonly textureUrl: string;
  readonly textureName: string;
  readonly uvLayout: UvLayout | null;
  readonly textureSize?: { readonly width: number; readonly height: number };
  readonly onPreviewEdit?: (updatedLayout: UvLayout) => void;
  readonly onApplyEdit?: (updatedLayout: UvLayout) => void;
}

interface DragState {
  readonly meshId: string;
  readonly vertexIndex: number;
}

function createFlipTransform(flipU: boolean, flipV: boolean) {
  return (layout: UvLayout) =>
    applyUvTransform({
      layout,
      offsetU: 0,
      offsetV: 0,
      rotationDeg: 0,
      scaleU: 1,
      scaleV: 1,
      flipU,
      flipV,
    });
}

const flipU = createFlipTransform(true, false);
const flipV = createFlipTransform(false, true);

export function UvMapEditor({
  textureUrl,
  textureName,
  uvLayout,
  textureSize,
  onPreviewEdit,
  onApplyEdit,
}: UvMapEditorProps) {
  const [draftLayout, setDraftLayout] = useState<UvLayout | null>(uvLayout);
  const [selectedMeshId, setSelectedMeshId] = useState(
    uvLayout?.meshes[0]?.meshId ?? "",
  );
  const [selectedVertexIndex, setSelectedVertexIndex] = useState<number | null>(
    uvLayout?.meshes[0]?.vertices.length ? 0 : null,
  );
  const [showOtherMeshes, setShowOtherMeshes] = useState(
    (uvLayout?.meshes.length ?? 0) > 1,
  );
  const [editSelectedOnly, setEditSelectedOnly] = useState(true);
  const [zoomPercent, setZoomPercent] = useState(100);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const zoomTargetRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const draftLayoutRef = useRef(draftLayout);

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
  const resolvedVertexIndex =
    selectedMesh &&
    selectedVertexIndex !== null &&
    selectedVertexIndex < selectedMesh.vertices.length
      ? selectedVertexIndex
      : selectedMesh?.vertices.length
        ? 0
        : null;
  const selectedVertex =
    selectedMesh && resolvedVertexIndex !== null
      ? (selectedMesh.vertices[resolvedVertexIndex] ?? null)
      : null;
  const overlappingMeshIds = useMemo(() => {
    if (!draftLayout || !selectedMesh) {
      return new Set<string>();
    }
    const selectedBounds = getMeshBounds(selectedMesh);
    return new Set(
      draftLayout.meshes
        .filter((mesh) => mesh.meshId !== selectedMesh.meshId)
        .filter(
          (mesh) =>
            getOverlapRatio(selectedBounds, getMeshBounds(mesh)) >=
            UV_OVERLAP_THRESHOLD,
        )
        .map((mesh) => mesh.meshId),
    );
  }, [draftLayout, selectedMesh]);

  const updateDraft = useCallback(
    (nextLayout: UvLayout) => {
      draftLayoutRef.current = nextLayout;
      setDraftLayout(nextLayout);
      onPreviewEdit?.(nextLayout);
    },
    [onPreviewEdit],
  );
  const selectMesh = useCallback((mesh: UvMeshLayout) => {
    setSelectedMeshId(mesh.meshId);
    setSelectedVertexIndex(mesh.vertices.length > 0 ? 0 : null);
  }, []);
  const applyLayoutChange = useCallback(
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
  const moveVertex = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      const dragState = dragStateRef.current;
      const currentLayout = draftLayoutRef.current;
      if (!svg || !dragState || !currentLayout) {
        return;
      }
      const bounds = svg.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) {
        return;
      }
      updateDraft(
        replaceVertex(currentLayout, dragState.meshId, dragState.vertexIndex, {
          u: clampUv((clientX - bounds.left) / bounds.width),
          v: clampUv((clientY - bounds.top) / bounds.height),
        }),
      );
    },
    [updateDraft],
  );
  const startVertexDrag = useCallback(
    (
      event: PointerEvent<SVGCircleElement>,
      meshId: string,
      vertexIndex: number,
    ) => {
      event.stopPropagation();
      setSelectedMeshId(meshId);
      setSelectedVertexIndex(vertexIndex);
      dragStateRef.current = { meshId, vertexIndex };
      event.currentTarget.setPointerCapture(event.pointerId);
      moveVertex(event.clientX, event.clientY);
    },
    [moveVertex],
  );
  const changeCoordinate = useCallback(
    (axis: "u" | "v", value: string) => {
      const numericValue = Number(value);
      if (
        !draftLayout ||
        !selectedMesh ||
        !selectedVertex ||
        resolvedVertexIndex === null ||
        !Number.isFinite(numericValue)
      ) {
        return;
      }
      const nextVertex: UvVertex = {
        u: axis === "u" ? clampUv(numericValue) : selectedVertex.u,
        v: axis === "v" ? clampUv(numericValue) : selectedVertex.v,
      };
      updateDraft(
        replaceVertex(
          draftLayout,
          selectedMesh.meshId,
          resolvedVertexIndex,
          nextVertex,
        ),
      );
    },
    [draftLayout, resolvedVertexIndex, selectedMesh, selectedVertex, updateDraft],
  );
  const resetPreview = useCallback(() => {
    if (!uvLayout) {
      return;
    }
    updateDraft(uvLayout);
    const firstMesh = uvLayout.meshes[0];
    setSelectedMeshId(firstMesh?.meshId ?? "");
    setSelectedVertexIndex(firstMesh?.vertices.length ? 0 : null);
  }, [updateDraft, uvLayout]);
  useEffect(() => {
    const zoomTarget = zoomTargetRef.current;
    if (!zoomTarget) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoomPercent((current) => getWheelZoomPercent(current, event.deltaY));
    };
    zoomTarget.addEventListener("wheel", handleWheel, {
      passive: false,
      capture: true,
    });
    return () =>
      zoomTarget.removeEventListener("wheel", handleWheel, { capture: true });
  }, []);

  if (!draftLayout || draftLayout.meshes.length === 0) {
    return (
      <p className="rounded border border-gray-700 bg-gray-900/60 p-4 text-sm text-gray-400">
        No UV data is available for {textureName}. This texture is not bound to
        a mesh material in the loaded model.
      </p>
    );
  }

  const setZoomByStep = (direction: 1 | -1) =>
    setZoomPercent((current) => getSteppedZoomPercent(current, direction));

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex shrink-0 flex-wrap items-center gap-2" role="toolbar" aria-label="UV editing tools">
        <EditorZoomControls
          zoomLabel={`${zoomPercent}%`}
          onZoomOut={() => setZoomByStep(-1)}
          onResetZoom={() => setZoomPercent(100)}
          onZoomIn={() => setZoomByStep(1)}
        />
        <Button size="sm" variant="outline" onClick={() => applyLayoutChange(fitUvToImage)}><Maximize2 className="h-3 w-3" /> {editSelectedOnly ? "Fit selected" : "Fit all"}</Button>
        <Button size="sm" variant="outline" onClick={() => applyLayoutChange(flipU)}><FlipHorizontal className="h-3 w-3" /> Flip U</Button>
        <Button size="sm" variant="outline" onClick={() => applyLayoutChange(flipV)}><FlipVertical className="h-3 w-3" /> Flip V</Button>
        {textureSize && <Button size="sm" variant="outline" onClick={() => applyLayoutChange((layout) => snapUvToPixelGrid(layout, textureSize.width, textureSize.height))}>Snap to pixels</Button>}
        <Button size="sm" variant="ghost" onClick={resetPreview}><RotateCcw className="h-3 w-3" /> Reset preview</Button>
      </div>
      <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[220px_minmax(0,1fr)_220px]">
        <UvMeshPanel layout={draftLayout} selectedMesh={selectedMesh} overlappingMeshIds={overlappingMeshIds} showOtherMeshes={showOtherMeshes} editSelectedOnly={editSelectedOnly} onShowOtherMeshesChange={setShowOtherMeshes} onEditSelectedOnlyChange={setEditSelectedOnly} onSelectMesh={selectMesh} />
        <UvEditorCanvas textureUrl={textureUrl} textureName={textureName} meshes={draftLayout.meshes} selectedMesh={selectedMesh} selectedVertexIndex={resolvedVertexIndex} overlappingMeshIds={overlappingMeshIds} showOtherMeshes={showOtherMeshes} zoomPercent={zoomPercent} svgRef={svgRef} zoomTargetRef={zoomTargetRef} onSelectMesh={selectMesh} onStartVertexDrag={startVertexDrag} onMoveVertex={moveVertex} onEndVertexDrag={() => { dragStateRef.current = null; }} />
        <UvVertexInspector layout={draftLayout} selectedMesh={selectedMesh} selectedVertexIndex={resolvedVertexIndex} selectedVertex={selectedVertex} canApply={onApplyEdit !== undefined} onCoordinateChange={changeCoordinate} onApply={() => onApplyEdit?.(draftLayout)} />
      </div>
    </div>
  );
}
