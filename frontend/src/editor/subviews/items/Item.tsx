import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
import { Label, Rect, Tag, Text } from "react-konva";
import { SelectedItem } from "../../../data/items/itemAtoms";
import { useSetAtom } from "jotai";
import { useState } from "react";
import { itemTypeNames } from "../../../data/items/ottoItemType";

const ITEM_BOX_SIZE = 12;
const ITEM_BOX_OFFSET = ITEM_BOX_SIZE / 2;

export function Item({
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

  if (item === null || item === undefined) return <></>;

  return (
    <>
      <Rect
        x={item.x - ITEM_BOX_OFFSET}
        y={item.z - ITEM_BOX_OFFSET}
        width={ITEM_BOX_SIZE}
        height={ITEM_BOX_SIZE}
        stroke="red"
        fill="red"
        draggable
        onMouseOver={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onMouseDown={() => setSelectedItem(itemIdx)}
        onDragStart={() => setSelectedItem(itemIdx)}
        onDragEnd={(e) => {
          setData((data) => {
            data.Itms[1000].obj[itemIdx].x = Math.round(
              e.target.x() + ITEM_BOX_OFFSET,
            );
            data.Itms[1000].obj[itemIdx].z = Math.round(
              e.target.y() + ITEM_BOX_OFFSET,
            );
          });
        }}
      />

      <Text
        text={item.type.toString()}
        fill="black"
        visible={!hovering}
        fontSize={8}
        x={item.x - ITEM_BOX_OFFSET}
        y={item.z - ITEM_BOX_OFFSET}
        draggable
        onMouseOver={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      />

      <Label opacity={1} visible={hovering} x={item.x + 15} y={item.z}>
        <Tag fill="red" />
        <Text text={itemTypeNames[item.type]} fontSize={8} fill="black" />
      </Label>
    </>
  );
}

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
