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
import { useMemo, useCallback } from "react";
import { useContainerSize } from "@/hooks/useContainerSize";
import { Stage } from "react-konva";
import { Updater } from "use-immer";
import { ClickToAddItem, SelectedItem } from "@/data/items/itemAtoms";
import { ShowMightyMikeCollisionOverlay } from "@/data/game/gameAtoms";
import { MightyMikeItems } from "../subviews/MightyMikeItems";
import { MightyMikeSupertiles } from "../subviews/supertiles/MightyMikeSupertiles";
import {
  HeaderData,
  ItemData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { View } from "../viewEnum";
import { TileBrushPreviewLayer } from "../subviews/tileBrushes/TileBrushPreviewLayer";
import { tileBrushModeAtom, tileBrushPreviewAtom, selectedTileBrushIdAtom, tileBrushAnchorAtom, tileBrushesAtom } from "@/data/tileBrushes/tileBrushAtoms";
import { TILE_SIZE } from "../subviews/supertiles/mightyMikeSupertilesHelpers";
import { applyTileBrush } from "@/data/tileBrushes/tileBrushApply";
import type Konva from "konva";

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
  view: View;
  stage: StageData;
  setStage: Updater<StageData>;
}

export function MightyMikeKonvaView({
  headerData,
  itemData,
  setItemData,
  terrainData,
  setTerrainData,
  mapImages,
  view,
  stage,
  setStage,
}: MightyMikeKonvaViewProps) {
  const setSelectedItem = useSetAtom(SelectedItem);
  const clickToAddItem = useAtomValue(ClickToAddItem);
  const showCollisionOverlay = useAtomValue(ShowMightyMikeCollisionOverlay);
  const tileBrushMode = useAtomValue(tileBrushModeAtom);
  const setTileBrushPreview = useSetAtom(tileBrushPreviewAtom);
  const selectedBrushId = useAtomValue(selectedTileBrushIdAtom);
  const tileBrushAnchor = useAtomValue(tileBrushAnchorAtom);
  const tileBrushes = useAtomValue(tileBrushesAtom);

  const header = headerData.Hedr[1000].obj;
  const mapWidth = header.mapWidth;
  const layr = terrainData.Layr?.[1000]?.obj ?? [];
  const mapHeight = Math.ceil(layr.length / mapWidth);

  const getMapTileFromStageEvent = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      const pos = e.target.getStage()?.getRelativePointerPosition();
      if (!pos) return null;
      const tileX = Math.floor(pos.x / TILE_SIZE);
      const tileY = Math.floor(pos.y / TILE_SIZE);
      if (tileX < 0 || tileY < 0 || tileX >= mapWidth || tileY >= mapHeight) return null;
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
          layer: 1000,
          mapWidth,
          mapHeight,
          targetX: tilePos.x,
          targetY: tilePos.y,
          brush,
          anchor: tileBrushAnchor,
        });
      });
    },
    [tileBrushMode, selectedBrushId, tileBrushes, tileBrushAnchor, mapWidth, mapHeight, setTerrainData, getMapTileFromStageEvent],
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
        draggable={tileBrushMode !== "stamp"}
        onClick={(e) => {
          if (tileBrushMode === "stamp") {
            handleStageBrushStamp(e);
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
            const pos = getMapTileFromStageEvent(e);
            setTileBrushPreview(pos);
          }
        }}
        onMouseLeave={() => setTileBrushPreview(null)}
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
        {/* Render 2D tile grid - Mighty Mike uses simple tile mapping, always visible */}
        {terrainData?.Layr && mapImages.length > 0 && (
          <MightyMikeSupertiles
            headerData={headerData}
            terrainData={terrainData}
            setTerrainData={setTerrainData}
            mapImages={mapImages}
            showCollisionOverlay={showCollisionOverlay}
            view={view}
          />
        )}

        {/* Items - always shown */}
        {itemData && (
          <MightyMikeItems
            itemData={itemData}
            setItemData={setItemDataNotNull}
          />
        )}

        {/* Tile brush stamp preview */}
        <TileBrushPreviewLayer
          tileSize={TILE_SIZE}
          mapWidth={mapWidth}
          mapHeight={mapHeight}
        />
      </Stage>
    </div>
  );
}
