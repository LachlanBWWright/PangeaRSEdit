import { Updater } from "use-immer";
import { ItemData } from "@/python/structSpecs/LevelTypes";
import { Image as KonvaImage, Rect } from "react-konva";
import type Konva from "konva";
import { SelectedItem } from "../../../data/items/itemAtoms";
import { useAtomValue, useSetAtom } from "jotai";
import { useState, useCallback, memo, useMemo } from "react";
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

export const Item = memo(function Item({
  itemData,
  headerData,
  terrainData,
  setItemData,
  itemIdx,
  onHoverChange,
}: {
  itemData: ItemData;
  headerData: HeaderData;
  terrainData: TerrainData;
  setItemData: Updater<ItemData>;
  itemIdx: number;
  onHoverChange: (tag: HoverTagInfo | null) => void;
}) {
  const item = itemData.Itms[1000].obj[itemIdx];
  const setSelectedItem = useSetAtom(SelectedItem);
  const [hovering, setHovering] = useState(false);
  const globals = useAtomValue(Globals);
  const itemType = item?.type ?? 0;
  const itemP0 = item?.p0 ?? 0;
  const itemP1 = item?.p1 ?? 0;
  const itemP2 = item?.p2 ?? 0;
  const itemP3 = item?.p3 ?? 0;
  const itemPosX = item?.x ?? 0;
  const itemPosZ = item?.z ?? 0;

  const handleMouseDown = useCallback(
    () => setSelectedItem(itemIdx),
    [itemIdx, setSelectedItem],
  );
  const handleDragEnd = useCallback(
    (e: Konva.KonvaEventObject<DragEvent>) => {
      setItemData((data) => {
        const item = data.Itms[1000].obj[itemIdx];
        if (item) {
          item.x = Math.round(e.target.x() + ITEM_BOX_OFFSET);
          item.z = Math.round(e.target.y() + ITEM_BOX_OFFSET);
        }
      });
    },
    [itemIdx, setItemData],
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
        itemPosX,
        itemPosZ,
      ),
    [globals, itemType, itemP0, itemP1, itemP2, itemP3, itemPosX, itemPosZ],
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
      setHovering(true);
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
      setHovering(false);
      onHoverChange(null);
    };

    if (liquidPatchCanvas) {
      return (
        <KonvaImage
          image={liquidPatchCanvas.canvas}
          x={rectX}
          y={rectZ}
          width={liquidPatchCanvas.width}
          height={liquidPatchCanvas.height}
          draggable
          onMouseOver={handleLiquidMouseOver}
          onMouseLeave={handleLiquidMouseLeave}
          onMouseDown={handleMouseDown}
          onDragStart={handleMouseDown}
          onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
            updateItem(setItemData, itemIdx, {
              x: Math.round(e.target.x() + liquidPatchCanvas.width / 2),
              z: Math.round(e.target.y() + liquidPatchCanvas.height / 2),
            });
          }}
          perfectDrawEnabled={false}
        />
      );
    }

    return (
      <>
        {/* Main liquid rectangle */}
        <Rect
          x={rectX}
          y={rectZ}
          width={dims.width2D}
          height={dims.depth2D}
          stroke={style.color2D}
          strokeWidth={3}
          fill={style.fill2D}
          draggable
          onMouseOver={handleLiquidMouseOver}
          onMouseLeave={handleLiquidMouseLeave}
          onMouseDown={handleMouseDown}
          onDragStart={handleMouseDown}
          onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
            updateItem(setItemData, itemIdx, {
              x: Math.round(e.target.x() + dims.width2D / 2),
              z: Math.round(e.target.y() + dims.depth2D / 2),
            });
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
          x={item.x - 4}
          y={item.z - 4}
          width={8}
          height={8}
          fill={style.color2D}
          listening={false}
        />
      </>
    );
  }

  const handleMouseOver = () => {
    setHovering(true);
    onHoverChange(
      getDefaultItemHoverTag(
        globals,
        itemType,
        itemBoxPosition.x,
        itemBoxPosition.z,
      ),
    );
  };
  const handleMouseLeave = () => {
    setHovering(false);
    onHoverChange(null);
  };

  // Default rendering for regular items
  return (
    <>
      <Rect
        x={itemBoxPosition.x}
        y={itemBoxPosition.z}
        width={ITEM_BOX_SIZE}
        height={ITEM_BOX_SIZE}
        stroke="black"
        strokeWidth={1}
        fill="red"
        draggable
        onMouseOver={handleMouseOver}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onDragStart={handleMouseDown}
        onDragEnd={handleDragEnd}
        perfectDrawEnabled={false}
      />

      {!hovering && (
        <ItemTypeNumber
          x={itemBoxPosition.x}
          y={itemBoxPosition.z}
          value={item.type.toString()}
          fill="black"
        />
      )}
    </>
  );
});
