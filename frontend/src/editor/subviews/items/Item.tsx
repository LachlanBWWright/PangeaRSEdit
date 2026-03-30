import { Updater } from "use-immer";
import { ItemData } from "@/python/structSpecs/LevelTypes";
import { Image as KonvaImage, Rect } from "react-konva";
import type Konva from "konva";
import { SelectedItem } from "../../../data/items/itemAtoms";
import { useAtomValue, useSetAtom } from "jotai";
import { useState, useCallback, memo, useMemo } from "react";
import { Globals } from "@/data/globals/globals";
import { getItemName } from "@/data/items/getItemNames";
import { updateItem } from "../../../data/selectors";
import {
  getLiquidPatchStyle,
  getLiquidPatchDimensions,
  getLiquidPatchCanvas,
} from "@/data/items/liquidPatchItems";
import { HeaderData, TerrainData } from "@/python/structSpecs/LevelTypes";
import {
  HoverNameTag,
  ITEM_BOX_OFFSET,
  ITEM_BOX_SIZE,
  ITEM_TAG_GAP,
  ItemTypeNumber,
} from "../shared/nodeVisuals";

export const Item = memo(function Item({
  itemData,
  headerData,
  terrainData,
  setItemData,
  itemIdx,
}: {
  itemData: ItemData;
  headerData: HeaderData;
  terrainData: TerrainData;
  setItemData: Updater<ItemData>;
  itemIdx: number;
}) {
  const setSelectedItem = useSetAtom(SelectedItem);
  const item = itemData.Itms[1000].obj[itemIdx];
  const itemForRender = item ?? {
    x: 0,
    z: 0,
    type: 0,
    p0: 0,
    p1: 0,
    p2: 0,
    p3: 0,
  };
  const [hovering, setHovering] = useState(false);
  const globals = useAtomValue(Globals);

  const handleMouseOver = useCallback(() => setHovering(true), []);
  const handleMouseLeave = useCallback(() => setHovering(false), []);
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
  const itemX = itemForRender.x - ITEM_BOX_OFFSET;
  const itemZ = itemForRender.z - ITEM_BOX_OFFSET;
  const itemName = getItemName(globals, itemForRender.type);

  // Check if this is a liquid patch item (water, lava, honey, slime in Bugdom 1/Nanosaur 1)
  const liquidPatchStyle = getLiquidPatchStyle(globals, itemForRender.type);
  const liquidPatchDimensions = useMemo(
    () =>
      liquidPatchStyle
        ? getLiquidPatchDimensions(
            globals,
            itemForRender.type,
            itemForRender.p0,
            itemForRender.p1,
            itemForRender.p2,
            itemForRender.p3,
          )
        : null,
    [
      globals,
      itemForRender.type,
      itemForRender.p0,
      itemForRender.p1,
      itemForRender.p2,
      itemForRender.p3,
      liquidPatchStyle,
    ],
  );
  const liquidPatchCanvas = useMemo(
    () =>
      liquidPatchStyle
        ? getLiquidPatchCanvas(
            globals,
            headerData,
            terrainData,
            itemForRender.type,
            itemForRender.p0,
            itemForRender.p1,
            itemForRender.p2,
            itemForRender.p3,
            itemForRender.x,
            itemForRender.z,
          )
        : null,
    [
      globals,
      headerData,
      terrainData,
      itemForRender.type,
      itemForRender.p0,
      itemForRender.p1,
      itemForRender.p2,
      itemForRender.p3,
      itemForRender.x,
      itemForRender.z,
      liquidPatchStyle,
    ],
  );

  if (item === null || item === undefined) return null;

  // Render liquid patch items as rectangles to resemble water bodies
  if (liquidPatchStyle) {
    if (!liquidPatchDimensions) {
      return null;
    }
    const dims = liquidPatchDimensions;

    // Position is centered on the item coordinates
    const rectX = itemForRender.x - dims.width2D / 2;
    const rectZ = itemForRender.z - dims.depth2D / 2;

    if (liquidPatchCanvas) {
      return (
        <>
          <KonvaImage
            image={liquidPatchCanvas.canvas}
            x={rectX}
            y={rectZ}
            width={liquidPatchCanvas.width}
            height={liquidPatchCanvas.height}
            draggable
            onMouseOver={handleMouseOver}
            onMouseLeave={handleMouseLeave}
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
          {hovering && (
            <HoverNameTag
              x={rectX + liquidPatchCanvas.width + ITEM_TAG_GAP}
              y={item.z - ITEM_BOX_OFFSET}
              text={liquidPatchStyle.name}
              fill={liquidPatchStyle.color2D}
              textColor="white"
            />
          )}
        </>
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
          stroke={liquidPatchStyle.color2D}
          strokeWidth={3}
          fill={liquidPatchStyle.fill2D}
          draggable
          onMouseOver={handleMouseOver}
          onMouseLeave={handleMouseLeave}
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
          stroke={liquidPatchStyle.color2D}
          strokeWidth={1}
          listening={false}
        />
        {/* Center marker */}
        <Rect
          x={item.x - 4}
          y={item.z - 4}
          width={8}
          height={8}
          fill={liquidPatchStyle.color2D}
          listening={false}
        />
        {hovering && (
          <HoverNameTag
            x={rectX + dims.width2D + ITEM_TAG_GAP}
            y={item.z - ITEM_BOX_OFFSET}
            text={liquidPatchStyle.name}
            fill={liquidPatchStyle.color2D}
            textColor="white"
          />
        )}
      </>
    );
  }

  // Default rendering for regular items
  return (
    <>
      <Rect
        x={itemX}
        y={itemZ}
        width={ITEM_BOX_SIZE}
        height={ITEM_BOX_SIZE}
        stroke="red"
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
         x={itemX}
         y={itemZ}
          value={item.type.toString()}
          fill="black"
        />
      )}

      {hovering && (
        <HoverNameTag
          x={itemX + ITEM_BOX_SIZE + ITEM_TAG_GAP}
          y={itemZ}
          text={itemName}
          fill="red"
          textColor="black"
        />
      )}
    </>
  );
});
