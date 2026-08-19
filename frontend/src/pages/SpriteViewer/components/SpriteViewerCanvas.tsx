import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, MouseEvent, RefObject, SetStateAction } from "react";
import { Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { EditorZoomControls } from "@/components/editor/EditorZoomControls";
import { getSteppedZoom, getWheelZoom } from "@/components/editor/editorZoomState";
import type { ShapeFrame } from "@/parsers/mightyMikeShapesParser";
import { editShapeFramePixel, type SpritePixelEdit } from "../utils/spritePixelEditing";
import { getSpritePixelIndex, renderImageCanvas, renderSpriteCanvas } from "../utils/spriteRendering";
import type { DisplayOptions } from "./DisplayOptionsPanel";
import type { Palette } from "../utils/paletteUtils";
import type { EditMode, LoadedData, SpriteRenderParams } from "../types";

interface SpriteViewerCanvasProps {
  readonly loadedData: LoadedData;
  readonly onLoadedDataChange: Dispatch<SetStateAction<LoadedData>>;
  readonly selectedShapeIndex: number;
  readonly selectedFrameIndex: number;
  readonly selectedTileIndex: number | undefined;
  readonly currentPalette: Palette;
  readonly displayOptions: DisplayOptions;
  readonly onDisplayOptionsChange: Dispatch<SetStateAction<DisplayOptions>>;
  readonly editMode: EditMode;
  readonly selectedPaletteColorIndex: number;
  readonly onPaletteColorChange: (index: number) => void;
}

export function SpriteViewerCanvas({
  loadedData,
  onLoadedDataChange,
  selectedShapeIndex,
  selectedFrameIndex,
  selectedTileIndex,
  currentPalette,
  displayOptions,
  onDisplayOptionsChange,
  editMode,
  selectedPaletteColorIndex,
  onPaletteColorChange,
}: SpriteViewerCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const renderParamsRef = useRef<SpriteRenderParams | null>(null);
  const isPaintingRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const panOffsetStartRef = useRef({ x: 0, y: 0 });
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !loadedData) return;
    if (loadedData.type === "sprites") {
      const shape = loadedData.data.shapes[selectedShapeIndex];
      const frame = shape?.frames[selectedFrameIndex];
      if (!frame) return;
      const rendered = renderSpriteCanvas({
        canvas,
        frame,
        colors: currentPalette.colors,
        options: displayOptions,
        onRenderParams: (params) => {
          renderParamsRef.current = params;
        },
      });
      if (!rendered) toast.error("Failed to render frame");
      return;
    }
    const sourceCanvas =
      loadedData.type === "tga"
        ? loadedData.data
        : loadedData.data.tileImages[selectedTileIndex ?? -1] ?? loadedData.gridCanvas;
    renderImageCanvas(canvas, sourceCanvas, displayOptions);
  }, [
    currentPalette.colors,
    displayOptions,
    loadedData,
    selectedFrameIndex,
    selectedShapeIndex,
    selectedTileIndex,
  ]);

  useEffect(() => {
    render();
  }, [render]);

  const editPixelAtCanvasPos = useCallback(
    (canvasX: number, canvasY: number) => {
      const params = renderParamsRef.current;
      if (!params || loadedData?.type !== "sprites") return;
      const pixelIndex = getSpritePixelIndex(params, canvasX, canvasY);
      if (pixelIndex === null) return;
      const shape = loadedData.data.shapes[selectedShapeIndex];
      const frame = shape?.frames[selectedFrameIndex];
      if (!shape || !frame) return;
      if (editMode === "eyedropper") {
        const colorIndex = frame.pixels[pixelIndex];
        if (colorIndex !== undefined) {
          onPaletteColorChange(colorIndex);
          toast.success(`Picked color index ${colorIndex}`);
        }
        return;
      }
      const edit: SpritePixelEdit =
        editMode === "erase"
          ? { mode: "erase" }
          : { mode: "paint", paletteIndex: selectedPaletteColorIndex };
      const newFrame: ShapeFrame = editShapeFramePixel(frame, pixelIndex, edit);
      const newFrames = [...shape.frames];
      newFrames[selectedFrameIndex] = newFrame;
      const newShapes = [...loadedData.data.shapes];
      newShapes[selectedShapeIndex] = { ...shape, frames: newFrames };
      onLoadedDataChange({
        ...loadedData,
        data: { ...loadedData.data, shapes: newShapes },
      });
    },
    [
      editMode,
      loadedData,
      onLoadedDataChange,
      onPaletteColorChange,
      selectedFrameIndex,
      selectedPaletteColorIndex,
      selectedShapeIndex,
    ],
  );

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      if (event.deltaY === 0) return;
      onDisplayOptionsChange((previous) => ({
        ...previous,
        zoomLevel: getWheelZoom(previous.zoomLevel, event.deltaY, 1.25, {
          min: 0.25,
          max: 16,
        }),
      }));
    },
    [onDisplayOptionsChange],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, {
      passive: false,
      capture: true,
    });
    return () => canvas.removeEventListener("wheel", handleWheel, { capture: true });
  }, [handleWheel]);

  const handleCanvasMouseDown = (event: MouseEvent<HTMLCanvasElement>) => {
    if (editMode === "view" || event.button !== 0 || event.altKey) return;
    isPaintingRef.current = true;
    editPixelAtCanvasPos(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
  };

  const handleCanvasMouseMove = (event: MouseEvent<HTMLCanvasElement>) => {
    if (!isPaintingRef.current || editMode === "view" || editMode === "eyedropper") return;
    editPixelAtCanvasPos(event.nativeEvent.offsetX, event.nativeEvent.offsetY);
  };

  const handleCanvasMouseUp = () => {
    isPaintingRef.current = false;
  };

  const handleViewportMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (event.button !== 1 && !(event.button === 0 && event.altKey)) return;
    event.preventDefault();
    isPanningRef.current = true;
    setIsPanning(true);
    panStartRef.current = { x: event.clientX, y: event.clientY };
    panOffsetStartRef.current = { ...panOffset };
  };

  const handleViewportMouseMove = (event: MouseEvent<HTMLDivElement>) => {
    const start = panStartRef.current;
    if (!isPanningRef.current || !start) return;
    setPanOffset({
      x: panOffsetStartRef.current.x + event.clientX - start.x,
      y: panOffsetStartRef.current.y + event.clientY - start.y,
    });
  };

  const handleViewportMouseUp = () => {
    isPanningRef.current = false;
    setIsPanning(false);
    panStartRef.current = null;
  };

  const changeZoom = (direction: -1 | 1) => {
    onDisplayOptionsChange((previous) => ({
      ...previous,
      zoomLevel: getSteppedZoom(previous.zoomLevel, direction, 1.25, {
        min: 0.25,
        max: 16,
      }),
    }));
  };

  const loadedTypeLabel = getLoadedTypeLabel(loadedData);
  const viewportCursor = getViewportCursor(isPanning, editMode);

  return (
    <ResizableViewport
      loadedData={loadedData}
      loadedTypeLabel={loadedTypeLabel}
      displayOptions={displayOptions}
      viewportCursor={viewportCursor}
      panOffset={panOffset}
      canvasRef={canvasRef}
      onZoomOut={() => changeZoom(-1)}
      onZoomIn={() => changeZoom(1)}
      onResetZoom={() =>
        onDisplayOptionsChange((previous) => ({ ...previous, zoomLevel: 1 }))
      }
      onViewportMouseDown={handleViewportMouseDown}
      onViewportMouseMove={handleViewportMouseMove}
      onViewportMouseUp={handleViewportMouseUp}
      onCanvasMouseDown={handleCanvasMouseDown}
      onCanvasMouseMove={handleCanvasMouseMove}
      onCanvasMouseUp={handleCanvasMouseUp}
    />
  );
}

interface ResizableViewportProps {
  readonly loadedData: LoadedData;
  readonly loadedTypeLabel: string;
  readonly displayOptions: DisplayOptions;
  readonly viewportCursor: string;
  readonly panOffset: { x: number; y: number };
  readonly canvasRef: RefObject<HTMLCanvasElement | null>;
  readonly onZoomOut: () => void;
  readonly onZoomIn: () => void;
  readonly onResetZoom: () => void;
  readonly onViewportMouseDown: (event: MouseEvent<HTMLDivElement>) => void;
  readonly onViewportMouseMove: (event: MouseEvent<HTMLDivElement>) => void;
  readonly onViewportMouseUp: () => void;
  readonly onCanvasMouseDown: (event: MouseEvent<HTMLCanvasElement>) => void;
  readonly onCanvasMouseMove: (event: MouseEvent<HTMLCanvasElement>) => void;
  readonly onCanvasMouseUp: () => void;
}

function ResizableViewport({
  loadedData,
  loadedTypeLabel,
  displayOptions,
  viewportCursor,
  panOffset,
  canvasRef,
  onZoomOut,
  onZoomIn,
  onResetZoom,
  onViewportMouseDown,
  onViewportMouseMove,
  onViewportMouseUp,
  onCanvasMouseDown,
  onCanvasMouseMove,
  onCanvasMouseUp,
}: ResizableViewportProps) {
  return (
    <div className="h-full relative overflow-hidden rounded-lg bg-gray-800 flex flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-gray-800 px-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-100">
            {loadedData?.filename ?? "Sprite Editor"}
          </p>
          <p className="text-xs text-gray-500">
            {loadedTypeLabel} | {displayOptions.zoomLevel.toFixed(1)}x
          </p>
        </div>
        <EditorZoomControls
          zoomLabel={`${displayOptions.zoomLevel.toFixed(1)}x`}
          onZoomOut={onZoomOut}
          onResetZoom={onResetZoom}
          onZoomIn={onZoomIn}
        />
      </div>
      {loadedData ? (
        <div
          className="flex-1 overflow-auto"
          style={{ cursor: viewportCursor }}
          onMouseDown={onViewportMouseDown}
          onMouseMove={onViewportMouseMove}
          onMouseUp={onViewportMouseUp}
          onMouseLeave={onViewportMouseUp}
        >
          <div
            className="flex items-center justify-center p-8 min-w-full min-h-full"
            style={{ transform: `translate(${panOffset.x}px, ${panOffset.y}px)` }}
          >
            <canvas
              ref={canvasRef}
              style={{ imageRendering: "pixelated" }}
              onMouseDown={onCanvasMouseDown}
              onMouseMove={onCanvasMouseMove}
              onMouseUp={onCanvasMouseUp}
              onMouseLeave={onCanvasMouseUp}
            />
          </div>
        </div>
      ) : (
        <EmptyViewport />
      )}
    </div>
  );
}

function EmptyViewport() {
  return (
    <div className="flex items-center justify-center h-full text-gray-400">
      <div className="text-center">
        <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-700 flex items-center justify-center">
          <Maximize2 className="w-12 h-12" />
        </div>
        <h3 className="text-xl font-semibold mb-2">No Content Loaded</h3>
        <p className="text-sm">Load a file to view sprites, images, or tilesets</p>
      </div>
    </div>
  );
}

function getLoadedTypeLabel(loadedData: LoadedData): string {
  if (loadedData?.type === "sprites") return "Sprites";
  if (loadedData?.type === "tileset") return "Tileset";
  if (loadedData?.type === "tga") return "Texture";
  return "No file";
}

function getViewportCursor(isPanning: boolean, editMode: EditMode): string {
  if (isPanning) return "grabbing";
  if (editMode === "paint" || editMode === "eyedropper") return "crosshair";
  if (editMode === "erase") return "cell";
  return "default";
}
