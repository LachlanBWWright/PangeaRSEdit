/**
 * Nanosaur 1 KonvaView - Specialized view for Nanosaur 1's tile system
 *
 * Features:
 * - Uses individual 5x5 tiles (32x32 pixels each) like Bugdom 1
 * - No fences support
 * - No liquid/water bodies support
 * - No splines support
 * - Items and terrain only
 */

import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, useState } from "react";
import { useContainerSize } from "@/hooks/useContainerSize";
import { Stage } from "react-konva";
import Konva from "konva";
import { Updater } from "use-immer";
import { ClickToAddItem, SelectedItem } from "@/data/items/itemAtoms";
import { Items } from "../subviews/Items";
import { AccessibilityMaskOverlay } from "../subviews/AccessibilityMaskOverlay";
import { IndividualTileSupertiles } from "../subviews/supertiles/IndividualTileSupertiles";
import { Tiles } from "../subviews/Tiles";
import {
  HeaderData,
  ItemData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { View } from "../viewEnum";
import { Globals } from "@/data/globals/globals";
import { TileBrushPreviewLayer } from "../subviews/tileBrushes/TileBrushPreviewLayer";
import { TileBrushCaptureLayer } from "../subviews/tileBrushes/TileBrushCaptureLayer";
import {
  tileBrushModeAtom,
  tileBrushPreviewAtom,
  selectedTileBrushIdAtom,
  tileBrushAnchorAtom,
  tileBrushesAtom,
  tileBrushActiveLayerAtom,
} from "@/data/tileBrushes/tileBrushAtoms";
import { applyTileBrush, createTileBrushFromRegion } from "@/data/tileBrushes/tileBrushApply";
import { toast } from "sonner";

export interface StageData {
  scale: number;
  x: number;
  y: number;
}

interface Nanosaur1KonvaViewProps {
  headerData: HeaderData;
  itemData: ItemData | null;
  setItemData: Updater<ItemData | null>;
  terrainData: TerrainData;
  setTerrainData: Updater<TerrainData>;
  mapImages: HTMLCanvasElement[];
  view: View;
  stage: StageData;
  setStage: Updater<StageData>;
}

export function Nanosaur1KonvaView({
  headerData,
  itemData,
  setItemData,
  terrainData,
  setTerrainData,
  mapImages,
  view,
  stage,
  setStage,
}: Nanosaur1KonvaViewProps) {
  const setSelectedItem = useSetAtom(SelectedItem);
  const clickToAddItem = useAtomValue(ClickToAddItem);
  const globals = useAtomValue(Globals);

  const tileBrushMode = useAtomValue(tileBrushModeAtom);
  const setTileBrushPreview = useSetAtom(tileBrushPreviewAtom);
  const selectedBrushId = useAtomValue(selectedTileBrushIdAtom);
  const tileBrushAnchor = useAtomValue(tileBrushAnchorAtom);
  const tileBrushes = useAtomValue(tileBrushesAtom);
  const activeLayer = useAtomValue(tileBrushActiveLayerAtom);
  const setTileBrushes = useSetAtom(tileBrushesAtom);

  const tileSize = globals.TILE_SIZE;
  const header = headerData.Hedr[1000].obj;
  const mapWidth = header.mapWidth;
  const mapHeight = header.mapHeight;

  const [captureStart, setCaptureStart] = useState<{ x: number; y: number } | null>(null);
  const [captureEnd, setCaptureEnd] = useState<{ x: number; y: number } | null>(null);

  const getTileFromEvent = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pos = e.target.getStage()?.getRelativePointerPosition();
      if (!pos) return null;
      const tileX = Math.floor(pos.x / tileSize);
      const tileY = Math.floor(pos.y / tileSize);
      if (tileX < 0 || tileY < 0 || tileX >= mapWidth || tileY >= mapHeight) return null;
      return { x: tileX, y: tileY };
    },
    [tileSize, mapWidth, mapHeight],
  );

  const handleStampClick = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      if (!selectedBrushId) return;
      const tilePos = getTileFromEvent(e);
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
    [selectedBrushId, tileBrushes, tileBrushAnchor, mapWidth, mapHeight, activeLayer, setTerrainData, getTileFromEvent],
  );

  const handleCaptureEnd = useCallback(
    (start: { x: number; y: number }, end: { x: number; y: number }) => {
      const minX = Math.min(start.x, end.x);
      const minY = Math.min(start.y, end.y);
      const width = Math.abs(end.x - start.x) + 1;
      const height = Math.abs(end.y - start.y) + 1;
      const result = createTileBrushFromRegion({
        id: crypto.randomUUID(),
        name: `Brush ${new Date().toLocaleTimeString()}`,
        game: "nanosaur1",
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
          toast.success(`Captured brush "${brush.name}" (${width}×${height})`);
        },
        (err) => toast.error(`Capture failed: ${err}`),
      );
    },
    [terrainData, activeLayer, mapWidth, mapHeight, setTileBrushes],
  );

  const [containerRef, containerSize] = useContainerSize();

  // Non-null updater for items
  const setItemDataNotNull: Updater<ItemData> = useCallback(
    (updater) => {
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
        draggable={tileBrushMode !== "stamp" && tileBrushMode !== "capture"}
        onClick={(e) => {
          if (tileBrushMode === "stamp") {
            handleStampClick(e);
            return;
          }
          if (clickToAddItem === undefined) return;
          const stageRef = e.target.getStage();

          const pos = stageRef?.getRelativePointerPosition();
          if (!pos) return;
          const x = Math.round(pos.x);
          const z = Math.round(pos.y);

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
          if (tileBrushMode === "stamp") {
            const pos = getTileFromEvent(e);
            setTileBrushPreview(pos);
          } else if (tileBrushMode === "capture") {
            const pos = getTileFromEvent(e);
            if (pos) {
              setTileBrushPreview(pos);
              if (captureStart && e.evt.buttons === 1) {
                setCaptureEnd(pos);
              }
            }
          }
        }}
        onMouseDown={(e) => {
          if (tileBrushMode === "capture") {
            const pos = getTileFromEvent(e);
            if (pos) {
              setCaptureStart(pos);
              setCaptureEnd(pos);
            }
          }
        }}
        onMouseUp={(e) => {
          if (tileBrushMode === "capture" && captureStart) {
            const pos = getTileFromEvent(e);
            const end = pos ?? captureEnd;
            if (end) {
              handleCaptureEnd(captureStart, end);
            }
            setCaptureStart(null);
            setCaptureEnd(null);
          }
        }}
        onMouseLeave={() => {
          setTileBrushPreview(null);
          if (tileBrushMode === "capture") {
            setCaptureStart(null);
            setCaptureEnd(null);
          }
        }}
        onDblClick={() => {
          setSelectedItem(undefined);
        }}
        onWheel={(e) => {
          e.evt.preventDefault();

          const scaleBy = 1.05;
          const stageRef = e.target.getStage();
          if (!stageRef) return;
          const oldScale = stageRef.scaleX();
          const pointerPosition = stageRef.getPointerPosition();
          if (!pointerPosition) return;

          const mousePointTo = {
            x: pointerPosition.x / oldScale - stageRef.x() / oldScale,
            y: pointerPosition.y / oldScale - stageRef.y() / oldScale,
          };

          const newScale =
            e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;

          setStage({
            scale: newScale,
            x: (pointerPosition.x / newScale - mousePointTo.x) * newScale,
            y: (pointerPosition.y / newScale - mousePointTo.y) * newScale,
          });
        }}
      >
        {/* Render individual tiles - Nanosaur 1 uses 5x5 tile system like Bugdom 1 */}
        {terrainData && terrainData.Layr && (
          <IndividualTileSupertiles
            headerData={headerData}
            terrainData={terrainData}
            mapImages={mapImages}
          />
        )}

        {view !== View.tiles && (
          <AccessibilityMaskOverlay
            headerData={headerData}
            terrainData={terrainData}
          />
        )}

        {view === View.tiles && (
          <Tiles
            headerData={headerData}
            terrainData={terrainData}
            setTerrainData={setTerrainData}
            isEditingTopology={true}
          />
        )}

        {/* Items - shown except when in tiles view */}
        {view !== View.tiles && itemData && (
          <Items
            headerData={headerData}
            terrainData={terrainData}
            itemData={itemData}
            setItemData={setItemDataNotNull}
          />
        )}

        {/* Tile brush preview (stamp mode) */}
        <TileBrushPreviewLayer
          tileSize={tileSize}
          mapWidth={mapWidth}
          mapHeight={mapHeight}
        />

        {/* Tile brush capture rectangle (capture mode) */}
        {tileBrushMode === "capture" && captureStart && captureEnd && (
          <TileBrushCaptureLayer
            tileSize={tileSize}
            captureStart={captureStart}
            captureEnd={captureEnd}
          />
        )}
      </Stage>
    </div>
  );
}
