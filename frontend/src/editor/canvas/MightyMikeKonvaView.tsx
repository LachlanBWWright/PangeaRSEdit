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
import { useRef, useCallback } from "react";
import { Stage } from "react-konva";
import { Updater } from "use-immer";
import { ClickToAddItem, SelectedItem } from "@/data/items/itemAtoms";
import { Items } from "../subviews/Items";
import { Tiles } from "../subviews/Tiles";
import {
  HeaderData,
  ItemData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { View } from "../viewEnum";

export type StageData = {
  scale: number;
  x: number;
  y: number;
};

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

  const stageRef = useRef<HTMLDivElement>(null);

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
    <Stage
      width={stageRef.current?.offsetWidth ?? 3000}
      height={stageRef.current?.offsetHeight ?? 2000}
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
      {/* Mighty Mike uses 2D tiles - render them as background layer */}
      {/* Mighty Mike has no tile attributes or topology, just direct tile rendering */}
      {/* The Layr data contains tile indices that reference the tileset */}
      {/* TODO: Render tileset images once image loader is implemented */}
      
      {/* Items - shown in all views */}
      {itemData && (
        <Items itemData={itemData} setItemData={setItemDataNotNull} />
      )}
    </Stage>
  );
}
