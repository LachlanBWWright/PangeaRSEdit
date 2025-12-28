import { ItemData } from "@/python/structSpecs/LevelTypes";
import { Layer, Rect } from "react-konva";
import { Updater } from "use-immer";
import { MightyMikeItem } from "./items/MightyMikeItem";
import { memo } from "react";
import { selectItems } from "../../data/selectors";

export const MightyMikeItems = memo(
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
          <MightyMikeItem
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
