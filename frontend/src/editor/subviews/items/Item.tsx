import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
import { Label, Rect, Tag, Text } from "react-konva";
import type Konva from "konva";
import { SelectedItem } from "../../../data/items/itemAtoms";
import { useAtomValue, useSetAtom } from "jotai";
import { useState, useCallback, memo } from "react";
import { Globals } from "@/data/globals/globals";
import { getItemName } from "@/data/items/getItemNames";
import { selectItem, updateItem } from "../../../data/selectors";

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
  const item = selectItem(data, itemIdx);
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
      updateItem(setData, itemIdx, {
        x: Math.round(e.target.x() + ITEM_BOX_OFFSET),
        z: Math.round(e.target.y() + ITEM_BOX_OFFSET),
      });
    },
    [itemIdx, setData],
  );
  
  if (item === null || item === undefined) return null;

  const itemX = item.x - ITEM_BOX_OFFSET;
  const itemZ = item.z - ITEM_BOX_OFFSET;
  const itemName = getItemName(globals, item.type);

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
export function getColour(index: number) {
  switch (index % 5) {
    case 0:
      return "#339933";
    case 1:
      return "#3399ff";
    case 2:
      return "#993399";
    case 3:
      return "#ff9933";
    case 4:
    default:
      return "#ff3399";
  }
}
