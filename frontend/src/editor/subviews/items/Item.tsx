import { Updater } from "use-immer";
import { ottoMaticLevel } from "../../../python/structSpecs/ottoMaticInterface";
import { Label, Rect, Tag, Text } from "react-konva";
import { SelectedItem } from "../../../data/items/itemAtoms";
import { useAtom } from "jotai";
import { useState } from "react";
import { itemTypeNames } from "../../../data/items/ottoItemType";

export function Item({
  data,
  setData,
  itemIdx,
}: {
  data: ottoMaticLevel;
  setData: Updater<ottoMaticLevel>;
  itemIdx: number;
}) {
  const [selectedItem, setSelectedItem] = useAtom(SelectedItem);
  const item = data.Itms[1000].obj[itemIdx];
  const [hovering, setHovering] = useState(false);

  return (
    <>
      <Rect
        x={item.x}
        y={item.z}
        width={10}
        height={10}
        stroke="red"
        fill="red"
      />
      <Text
        text={item.type.toString()}
        fill="black"
        x={item.x - 2}
        y={item.z}
        onMouseOver={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
      />
      <Label opacity={1} visible={hovering} x={item.x + 15} y={item.z}>
        <Tag fill="red" />
        <Text text={itemTypeNames[item.type]} fill="black" />
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