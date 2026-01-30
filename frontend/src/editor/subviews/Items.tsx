import { ItemData } from "@/python/structSpecs/LevelTypes";
import { Layer, Rect } from "react-konva";
import { Updater } from "use-immer";
import { Item } from "./items/Item";
import { memo } from "react";

export const Items = memo(
  ({
    itemData,
    setItemData,
  }: {
    itemData: ItemData;
    setItemData: Updater<ItemData>;
  }) => {
    if (!itemData.Itms) return <></>;

    return (
      <Layer>
        <Rect />
        {itemData.Itms[1000].obj.map((_, itemIdx) => (
          <Item key={itemIdx} itemData={itemData} setItemData={setItemData} itemIdx={itemIdx} />
        ))}
      </Layer>
    );
  },
);
