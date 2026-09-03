/**
 * Mighty Mike KonvaView - Specialized view for Mighty Mike's 2D tile system
 *
 * Features:
 * - Uses 2D tilemaps (32x32 pixel tiles)
 * - No fences support
 * - No liquid/water bodies support
 * - No splines support
 * - No supertiles (direct tile mapping)
 * - Items and 2D tile grid only
 */

import { useAtomValue, useSetAtom } from "jotai";
import { useMemo, useCallback, useState } from "react";
import { useContainerSize } from "@/hooks/useContainerSize";
import { Stage } from "react-konva";
import {
  MapResizeEdgeControls,
  type MapResizeDirection,
} from "./MapResizeEdgeControls";
import { Updater } from "use-immer";
import { ClickToAddItem, SelectedItem } from "@/data/items/itemAtoms";
import { MightyMikeItems } from "../subviews/MightyMikeItems";
import { HoverTagOverlayLayer } from "../subviews/shared/HoverTagOverlayLayer";
import { MightyMikeSupertiles } from "../subviews/supertiles/MightyMikeSupertiles";
import { TileBrushCaptureLayer } from "../subviews/tileBrushes/TileBrushCaptureLayer";
import {
  HeaderData,
  ItemData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { TileBrushPreviewLayer } from "../subviews/tileBrushes/TileBrushPreviewLayer";
import {
  getTileBrushModeAtom,
  tileBrushPreviewAtom,
  mightyMikeSelectedTileBrushIdAtom,
  getTileBrushAnchorAtom,
  tileBrushesAtom,
  tileBrushActiveLayerAtom,
} from "@/data/tileBrushes/tileBrushAtoms";
import { TILE_SIZE } from "../subviews/supertiles/mightyMikeSupertilesHelpers";
import {
  applyTileBrush,
  createTileBrushFromRegion,
} from "@/data/tileBrushes/tileBrushApply";
import type Konva from "konva";
import { toast } from "sonner";
import { CustomScriptPlacements } from "../subviews/CustomScriptPlacements";
import { useCustomObjectPlacement } from "../subviews/scripts/useCustomObjectPlacement";
import { computeWheelZoomStage, isPointerWithinMap } from "./konvaViewState";

export interface StageData {
  scale: number;
  x: number;
  y: number;
}

interface MightyMikeKonvaViewProps {
  headerData: HeaderData;
  itemData: ItemData | null;
  setItemData: Updater<ItemData | null>;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  mapImages: HTMLCanvasElement[];
  stage: StageData;
  setStage: Updater<StageData>;
  onResize: (direction: MapResizeDirection, amount: number) => Promise<void>;
}

export function MightyMikeKonvaView({
  headerData,
  itemData,
  setItemData,
  terrainData,
  setTerrainData,
  mapImages,
  stage,
  setStage,
  onResize,
}: MightyMikeKonvaViewProps) {
  const setSelectedItem = useSetAtom(SelectedItem);
  const clickToAddItem = useAtomValue(ClickToAddItem);
  const customObjectPlacement = useCustomObjectPlacement();
  const tileBrushMode = useAtomValue(getTileBrushModeAtom("mightymike"));
  const setTileBrushMode = useSetAtom(getTileBrushModeAtom("mightymike"));
  const setTileBrushPreview = useSetAtom(tileBrushPreviewAtom);
  const selectedBrushId = useAtomValue(mightyMikeSelectedTileBrushIdAtom);
  const setSelectedBrushId = useSetAtom(mightyMikeSelectedTileBrushIdAtom);
  const tileBrushAnchor = useAtomValue(getTileBrushAnchorAtom("mightymike"));
  const tileBrushes = useAtomValue(tileBrushesAtom);
  const activeLayer = useAtomValue(tileBrushActiveLayerAtom);
  const setTileBrushes = useSetAtom(tileBrushesAtom);

  const header = headerData.Hedr[1000].obj;
  const mapWidth = header.mapWidth;
  const layr = terrainData.Layr?.[1000]?.obj ?? [];
  const mapHeight = Math.ceil(layr.length / mapWidth);
  const isPaintingCanvasMode =
    tileBrushMode === "stamp" || tileBrushMode === "capture";
  const [captureStart, setCaptureStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [captureEnd, setCaptureEnd] = useState<{ x: number; y: number } | null>(
    null,
  );

  const getMapTileFromStageEvent = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pos = e.target.getStage()?.getRelativePointerPosition();
      if (!pos) return null;
      const tileX = Math.floor(pos.x / TILE_SIZE);
      const tileY = Math.floor(pos.y / TILE_SIZE);
      if (tileX < 0 || tileY < 0 || tileX >= mapWidth || tileY >= mapHeight)
        return null;
      return { x: tileX, y: tileY };
    },
    [mapWidth, mapHeight],
  );

  const handleStageBrushStamp = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (tileBrushMode !== "stamp" || !selectedBrushId) return;
      const tilePos = getMapTileFromStageEvent(e);
      if (!tilePos) return;
      const brush = tileBrushes.find((b) => b.id === selectedBrushId);
      if (!brush) return;
      setTerrainData((draft) => {
        applyTileBrush({
          draft,
          layer: activeLayer,
          mapWidth,
          mapHeight,
          targetX: tilePos.x,
          targetY: tilePos.y,
          brush,
          anchor: tileBrushAnchor,
        });
      });
    },
    [
      tileBrushMode,
      selectedBrushId,
      tileBrushes,
      tileBrushAnchor,
      activeLayer,
      mapWidth,
      mapHeight,
      setTerrainData,
      getMapTileFromStageEvent,
    ],
  );

  const handleCaptureEnd = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      const minX = Math.min(start.x, end.x);
      const minY = Math.min(start.y, end.y);
      const width = Math.abs(end.x - start.x) + 1;
      const height = Math.abs(end.y - start.y) + 1;
      const result = createTileBrushFromRegion({
        id: crypto.randomUUID(),
        name: `Stamp ${new Date().toLocaleTimeString()}`,
        game: "mightymike",
        terrainData,
        layer: activeLayer,
        mapWidth,
        mapHeight,
        startX: minX,
        startY: minY,
        width,
        height,
      });
      result.match(
        (brush) => {
          setTileBrushes((prev) => [...prev, brush]);
          setSelectedBrushId(brush.id);
          setTileBrushMode("stamp");
          toast.success(`Captured stamp (${width}×${height})`);
        },
        (error) => toast.error(`Capture failed: ${error}`),
      );
    },
    [
      terrainData,
      activeLayer,
      mapWidth,
      mapHeight,
      setTileBrushes,
      setSelectedBrushId,
      setTileBrushMode,
    ],
  );

  const [containerRef, containerSize] = useContainerSize();

  // Non-null updater for items
  const setItemDataNotNull: Updater<ItemData> = useMemo(
    () => (updater) => {
      setItemData((current) => {
        if (!current) return current;
        return typeof updater === "function" ? updater(current) : updater;
      });
    },
    [setItemData],
  );

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <Stage
        width={containerSize.width}
        height={containerSize.height}
        scaleX={stage.scale}
        scaleY={stage.scale}
        x={stage.x}
        y={stage.y}
        draggable
        onDragStart={(e) => {
          if (
            isPaintingCanvasMode &&
            isPointerWithinMap(e, TILE_SIZE, mapWidth, mapHeight)
          ) {
            e.target.getStage()?.stopDrag();
          }
        }}
        onMouseDown={(e) => {
          if (tileBrushMode !== "capture") {
            return;
          }
          const tilePos = getMapTileFromStageEvent(e);
          if (!tilePos) {
            return;
          }
          setCaptureStart(tilePos);
          setCaptureEnd(tilePos);
        }}
        onMouseUp={(e) => {
          if (tileBrushMode !== "capture" || !captureStart) {
            return;
          }
          const tilePos =
            getMapTileFromStageEvent(e) ?? captureEnd ?? captureStart;
          handleCaptureEnd(captureStart, tilePos);
          setCaptureStart(null);
          setCaptureEnd(null);
        }}
        onClick={(e) => {
          if (tileBrushMode === "stamp") {
            handleStageBrushStamp(e);
            return;
          }
          if (tileBrushMode === "capture") {
            return;
          }
          const stageRef = e.target.getStage();

          const pos = stageRef?.getRelativePointerPosition();
          if (!pos) return;
          const x = Math.round(pos.x);
          const z = Math.round(pos.y);

          if (customObjectPlacement.objectId !== null) {
            customObjectPlacement.placeAt(
              x,
              headerData.Hedr[1000].obj.minY ?? 0,
              z,
            );
            return;
          }
          if (clickToAddItem === undefined) return;

          setItemDataNotNull((itemData) => {
            itemData.Itms[1000].obj.push({
              x: x,
              z: z,
              type: clickToAddItem,
              flags: 0,
              p0: 0,
              p1: 0,
              p2: 0,
              p3: 0,
            });
          });
        }}
        onMouseMove={(e) => {
          if (tileBrushMode === "capture" && captureStart) {
            const pos = getMapTileFromStageEvent(e);
            if (pos) {
              setCaptureEnd(pos);
            }
            return;
          }
          if (tileBrushMode === "stamp") {
            const pos = getMapTileFromStageEvent(e);
            setTileBrushPreview(pos);
          }
        }}
        onMouseLeave={() => {
          setTileBrushPreview(null);
          if (tileBrushMode === "capture" && captureStart) {
            setCaptureEnd(captureStart);
          }
        }}
        onDblClick={() => {
          setSelectedItem(undefined);
        }}
        onWheel={(e) => {
          const nextStage = computeWheelZoomStage(e);
          if (nextStage) setStage(nextStage);
        }}
      >
        {/* Render 2D tile grid - Mighty Mike uses simple tile mapping, always visible */}
        {terrainData?.Layr && mapImages.length > 0 && (
          <MightyMikeSupertiles
            headerData={headerData}
            terrainData={terrainData}
            setTerrainData={setTerrainData}
            mapImages={mapImages}
          />
        )}

        {/* Items - always shown */}
        {itemData && (
          <MightyMikeItems
            itemData={itemData}
            setItemData={setItemDataNotNull}
          />
        )}

        <CustomScriptPlacements />

        {/* Tile brush stamp preview */}
        <TileBrushPreviewLayer
          game="mightymike"
          tileSize={TILE_SIZE}
          mapWidth={mapWidth}
          mapHeight={mapHeight}
        />
        {captureStart && captureEnd && (
          <TileBrushCaptureLayer
            tileSize={TILE_SIZE}
            captureStart={captureStart}
            captureEnd={captureEnd}
          />
        )}
        {/* Hover tag overlay — always rendered last so name tags appear above all layers */}
        <HoverTagOverlayLayer />
        <MapResizeEdgeControls
          mapWidth={mapWidth}
          mapHeight={mapHeight}
          tileSize={TILE_SIZE}
          tilesPerUnit={1}
          onResize={onResize}
        />
      </Stage>
    </div>
  );
}
