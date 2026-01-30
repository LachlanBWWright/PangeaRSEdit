import { Updater } from "use-immer";
<<<<<<< HEAD
import { ItemData } from "@/python/structSpecs/LevelTypes";
=======
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
>>>>>>> origin/main
import { Label, Rect, Tag, Text } from "react-konva";
import type Konva from "konva";
import { SelectedItem } from "../../../data/items/itemAtoms";
import { useAtomValue, useSetAtom } from "jotai";
import { useState, useCallback, memo } from "react";
import { Globals } from "@/data/globals/globals";
import { getItemName } from "@/data/items/getItemNames";
<<<<<<< HEAD
import { selectItem, updateItem } from "../../../data/selectors";
import { getLiquidPatchStyle, getLiquidPatchDimensions } from "@/data/items/liquidPatchItems";
=======
>>>>>>> origin/main

const ITEM_BOX_SIZE = 12;
const ITEM_BOX_OFFSET = ITEM_BOX_SIZE / 2;

export const Item = memo(function Item({
  data,
  setData,
  itemIdx,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
  itemIdx: number;
}) {
  const setSelectedItem = useSetAtom(SelectedItem);
  const item = data.Itms[1000].obj[itemIdx];
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
      setData((data) => {
        data.Itms[1000].obj[itemIdx].x = Math.round(
          e.target.x() + ITEM_BOX_OFFSET,
        );
        data.Itms[1000].obj[itemIdx].z = Math.round(
          e.target.y() + ITEM_BOX_OFFSET,
        );
      });
    },
    [itemIdx, setData],
  );
  if (item === null || item === undefined) return null;

  const itemX = item.x - ITEM_BOX_OFFSET;
  const itemZ = item.z - ITEM_BOX_OFFSET;
  const itemName = getItemName(globals, item.type);

  // Check if this is a liquid patch item (water, lava, honey, slime in Bugdom 1/Nanosaur 1)
  const liquidPatchStyle = getLiquidPatchStyle(globals, item.type);

  // Render liquid patch items as rectangles to resemble water bodies
  if (liquidPatchStyle) {
    // Calculate dimensions based on item parameters
    const dims = getLiquidPatchDimensions(
      globals,
      item.type,
      item.p0,
      item.p1,
      item.p2,
      item.p3
    );

    // Position is centered on the item coordinates
    const rectX = item.x - dims.width2D / 2;
    const rectZ = item.z - dims.depth2D / 2;

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
          <Label opacity={1} x={item.x + dims.width2D / 2 + 5} y={item.z}>
            <Tag fill={liquidPatchStyle.color2D} />
            <Text text={liquidPatchStyle.name} fontSize={10} fill="white" />
          </Label>
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
      />

      <Text
        text={item.type.toString()}
        fill="black"
        visible={!hovering}
        fontSize={8}
        x={itemX}
        y={itemZ}
        draggable
        onMouseOver={handleMouseOver}
        onMouseLeave={handleMouseLeave}
      />

      {hovering && (
        <Label opacity={1} x={item.x + 15} y={item.z}>
          <Tag fill="red" />
          <Text text={itemName} fontSize={8} fill="black" />
        </Label>
      )}
    </>
  );
});

// Color function renamed to follow naming conventions
// getColour moved to ./itemUtils
