import { Updater } from "use-immer";
import { ItemData } from "@/python/structSpecs/LevelTypes";
import { Group, Image as KonvaImage, Rect } from "react-konva";
import type Konva from "konva";
import { useAtomValue, useSetAtom } from "jotai";
import { useCallback, memo, useMemo } from "react";
import { Globals } from "@/data/globals/globals";
import { updateItem } from "../../../data/selectors";
import { getLiquidPatchCanvas } from "@/data/items/liquidPatchItems";
import { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import {
  ITEM_BOX_OFFSET,
  ITEM_BOX_SIZE,
  ItemTypeNumber,
} from "../shared/nodeVisuals";
import type { HoverTagInfo } from "../shared/nodeVisuals";
import {
  getDefaultItemHoverTag,
  getItemBoxPosition,
  getLiquidHoverTag,
  getLiquidPatchLayout,
} from "@/editor/subviews/items/itemRenderState";
import { useItemLiquidTexture } from "./useItemLiquidTexture";
import { LevelNumber } from "@/data/globals/levelNumber";
import { ShowItemThumbnailPreviews } from "@/data/canvasView/canvasDisplaySettingsAtoms";
import { useCanvasItemThumbnail } from "../canvasItemThumbnail";
import { selectMapItemAtom, type MapItemTarget } from "./mapItemSelection";
import { useMapItemVisualState } from "./useMapItemVisualState";
import { useMapItemEditing } from "./mapItemEditingContext";

export const Item = memo(function Item({
  itemData,
  headerData,
  terrainData,
  setItemData,
  itemIdx,
  selected,
  onHoverChange,
}: {
  itemData: ItemData;
  headerData: HeaderData;
  terrainData: TerrainData;
  setItemData: Updater<ItemData>;
  itemIdx: number;
  selected: boolean;
  onHoverChange: (tag: HoverTagInfo | null) => void;
}) {
  const item = itemData.Itms[1000].obj[itemIdx];
  const selectItem = useSetAtom(selectMapItemAtom);
  const controller = useMapItemEditing();
  const target = useMemo<MapItemTarget>(() => ({ kind: "native", index: itemIdx }), [itemIdx]);
  const visual = useMapItemVisualState(target);
  const globals = useAtomValue(Globals);
  const levelNumber = useAtomValue(LevelNumber);
  const showItemThumbnail = useAtomValue(ShowItemThumbnailPreviews);
  const itemType = item?.type ?? 0;
  const itemP0 = item?.p0 ?? 0;
  const itemP1 = item?.p1 ?? 0;
  const itemP2 = item?.p2 ?? 0;
  const itemP3 = item?.p3 ?? 0;
  const itemPosX = (item?.x ?? 0) + visual.offset.x;
  const itemPosZ = (item?.z ?? 0) + visual.offset.z;
  const liquidTexture = useItemLiquidTexture(globals, itemType, levelNumber);
  const thumbnail = useCanvasItemThumbnail({
    game: globals.GAME_TYPE,
    kind: "terrainItem",
    itemType,
    levelNum: levelNumber,
    params: { p0: itemP0, p1: itemP1, p2: itemP2, p3: itemP3 },
  });

  const handleMouseDown = useCallback(
    (event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      event.cancelBubble = true;
      selectItem({ target, additive: event.evt.shiftKey || event.evt.ctrlKey || event.evt.metaKey, forDrag: true });
    },
    [target, selectItem],
  );
  const handleDragStart = useCallback((event: Konva.KonvaEventObject<DragEvent>) => {
    event.cancelBubble = true;
    if (controller) controller.startDrag(target);
    else selectItem({ target, forDrag: true });
  }, [controller, target, selectItem]);
  const handlePlacementDrag = useCallback((event: Konva.KonvaEventObject<DragEvent>, offsetX: number, offsetZ: number, finish: boolean) => {
    event.cancelBubble = true;
    const point = { x: event.target.x() + offsetX, z: event.target.y() + offsetZ };
    if (controller) {
      if (finish) controller.finishDrag(target, point);
      else controller.previewDrag(target, point);
    } else if (finish) updateItem(setItemData, itemIdx, { x: Math.round(point.x), z: Math.round(point.z) });
  }, [controller, target, setItemData, itemIdx]);
  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      handlePlacementDrag(e, ITEM_BOX_OFFSET, ITEM_BOX_OFFSET, true);
    },
    [handlePlacementDrag],
  );
  const itemBoxPosition = getItemBoxPosition(itemPosX, itemPosZ);

  // Check if this is a liquid patch item (water, lava, honey, slime in Bugdom 1/Nanosaur 1)
  const liquidPatchLayout = useMemo(
    () =>
      getLiquidPatchLayout(
        globals,
        itemType,
        itemP0,
        itemP1,
        itemP2,
        itemP3,
        levelNumber,
        itemPosX,
        itemPosZ,
      ),
    [
      globals,
      itemType,
      itemP0,
      itemP1,
      itemP2,
      itemP3,
      levelNumber,
      itemPosX,
      itemPosZ,
    ],
  );
  const liquidPatchCanvas = useMemo(
    () =>
      liquidPatchLayout
        ? getLiquidPatchCanvas(
            globals,
            headerData,
            terrainData,
            itemType,
            itemP0,
            itemP1,
            itemP2,
            itemP3,
            itemPosX,
            itemPosZ,
            levelNumber,
            liquidTexture,
          )
        : null,
    [
      globals,
      headerData,
      terrainData,
      itemType,
      itemP0,
      itemP1,
      itemP2,
      itemP3,
      itemPosX,
      itemPosZ,
      liquidPatchLayout,
      levelNumber,
      liquidTexture,
    ],
  );

  if (item === null || item === undefined) return null;

  // Render liquid patch items as rectangles to resemble water bodies
  if (liquidPatchLayout) {
    if (!liquidPatchLayout.dimensions || !liquidPatchLayout.style) {
      return null;
    }
    const dims = liquidPatchLayout.dimensions;
    const rectX = liquidPatchLayout.rectX;
    const rectZ = liquidPatchLayout.rectZ;
    const style = liquidPatchLayout.style;

    const handleLiquidMouseOver = () => {
      onHoverChange(
        getLiquidHoverTag(
          style.name,
          rectX,
          liquidPatchCanvas ? liquidPatchCanvas.width : dims.width2D,
          item.z,
        ),
      );
    };
    const handleLiquidMouseLeave = () => {
      onHoverChange(null);
    };

    if (liquidPatchCanvas) {
      return (
        <KonvaImage
          name="map-item"
          image={liquidPatchCanvas.canvas}
          x={rectX}
          y={rectZ}
          width={liquidPatchCanvas.width}
          height={liquidPatchCanvas.height}
          stroke={visual.selected ? "#facc15" : undefined}
          strokeWidth={visual.selected ? 3 : 0}
          draggable
          onMouseOver={handleLiquidMouseOver}
          onMouseLeave={handleLiquidMouseLeave}
          onMouseDown={handleMouseDown}
          onDragStart={handleDragStart}
          onDragMove={(event) => handlePlacementDrag(event, liquidPatchCanvas.width / 2, liquidPatchCanvas.height / 2, false)}
          onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
            handlePlacementDrag(e, liquidPatchCanvas.width / 2, liquidPatchCanvas.height / 2, true);
          }}
          perfectDrawEnabled={false}
        />
      );
    }

    return (
      <>
        {/* Main liquid rectangle */}
        <Rect
          name="map-item"
          x={rectX}
          y={rectZ}
          width={dims.width2D}
          height={dims.depth2D}
          stroke={visual.selected ? "#facc15" : style.color2D}
          strokeWidth={3}
          fill={style.fill2D}
          draggable
          onMouseOver={handleLiquidMouseOver}
          onMouseLeave={handleLiquidMouseLeave}
          onMouseDown={handleMouseDown}
          onDragStart={handleDragStart}
          onDragMove={(event) => handlePlacementDrag(event, dims.width2D / 2, dims.depth2D / 2, false)}
          onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
            handlePlacementDrag(e, dims.width2D / 2, dims.depth2D / 2, true);
          }}
        />
        {/* Inner rectangle for visual effect */}
        <Rect
          x={rectX + dims.width2D * 0.15}
          y={rectZ + dims.depth2D * 0.15}
          width={dims.width2D * 0.7}
          height={dims.depth2D * 0.7}
          stroke={style.color2D}
          strokeWidth={1}
          listening={false}
        />
        {/* Center marker */}
        <Rect
          x={itemPosX - 4}
          y={itemPosZ - 4}
          width={8}
          height={8}
          fill={style.color2D}
          listening={false}
        />
      </>
    );
  }

  const handleMouseOver = () => {
    onHoverChange(
      getDefaultItemHoverTag(
        globals,
        itemType,
        itemBoxPosition.x,
        itemBoxPosition.z,
        selected,
      ),
    );
  };
  const handleMouseLeave = () => {
    onHoverChange(null);
  };

  // Default rendering for regular items
  const isSelected = visual.selected || selected;
  return (
    <Group
      name="map-item"
      x={itemBoxPosition.x}
      y={itemBoxPosition.z}
      draggable
      onMouseOver={handleMouseOver}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onDragStart={handleDragStart}
      onDragMove={(event) => handlePlacementDrag(event, ITEM_BOX_OFFSET, ITEM_BOX_OFFSET, false)}
      onDragEnd={handleDragEnd}
    >
      <Rect
        x={0}
        y={0}
        width={ITEM_BOX_SIZE}
        height={ITEM_BOX_SIZE}
        stroke={isSelected ? "#facc15" : "black"}
        strokeWidth={isSelected ? 2 : 1}
        fill={isSelected ? "red" : "blue"}
        perfectDrawEnabled={false}
      />

      {showItemThumbnail && thumbnail ? (
        <KonvaImage
          image={thumbnail.image}
          x={0}
          y={0}
          width={ITEM_BOX_SIZE}
          height={ITEM_BOX_SIZE}
          listening={false}
          perfectDrawEnabled={false}
        />
      ) : (
        <ItemTypeNumber x={0} y={0} value={item.type.toString()} fill="white" />
      )}
      {showItemThumbnail && thumbnail && (
        <Rect
          width={ITEM_BOX_SIZE}
          height={ITEM_BOX_SIZE}
          stroke="black"
          strokeWidth={1}
          listening={false}
          perfectDrawEnabled={false}
        />
      )}
    </Group>
  );
});
