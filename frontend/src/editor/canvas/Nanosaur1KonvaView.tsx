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
import { useCallback } from "react";
import { useContainerSize } from "@/hooks/useContainerSize";
import { Stage } from "react-konva";
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
        draggable={true}
        onClick={(e) => {
          if (clickToAddItem === undefined) return;
          const stage = e.target.getStage();

          const pos = stage?.getRelativePointerPosition();
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
        onDblClick={() => {
          setSelectedItem(undefined);
        }}
        onWheel={(e) => {
          e.evt.preventDefault();

          const scaleBy = 1.05;
          const stage = e.target.getStage();
          if (!stage) return;
          const oldScale = stage.scaleX();
          const pointerPosition = stage.getPointerPosition();
          if (!pointerPosition) return;

          const mousePointTo = {
            x: pointerPosition.x / oldScale - stage.x() / oldScale,
            y: pointerPosition.y / oldScale - stage.y() / oldScale,
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
      </Stage>
    </div>
  );
}
