import { ItemData } from "../../python/structSpecs/ottoMaticLevelData";
import { Layer, Rect } from "react-konva";
import { Updater } from "use-immer";
import { Item } from "./items/Item";
import { memo } from "react";
import { selectItems } from "../../data/selectors";

export const Items = memo(
  ({
    itemData,
    setItemData,
  }: {
    itemData: ItemData;
    setItemData: Updater<ItemData>;
  }) => {
    const items = selectItems({ Itms: itemData.Itms });

    if (items.length === 0) return <></>;

    return (
      <Layer>
        <Rect />
        {items.map((_, itemIdx) => (
          <Item
            key={itemIdx}
            itemData={itemData}
            setItemData={setItemData}
            itemIdx={itemIdx}
          />
        ))}
      </Layer>
    );
  },
);
