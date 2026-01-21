import { ItemData } from "@/python/structSpecs/LevelTypes";
import { Layer, Rect } from "react-konva";
import { Updater } from "use-immer";
import { Item } from "./items/Item";
import { memo, useMemo } from "react";
import { selectItems } from "../../data/selectors";
import { useAtomValue } from "jotai";
import { ItemFilterState } from "../../data/items/itemFilterAtoms";
import { filterItems } from "../../data/items/itemFilterUtils";
import { Globals } from "@/data/globals/globals";

export const Items = memo(
  ({
    itemData,
    setItemData,
  }: {
    itemData: ItemData;
    setItemData: Updater<ItemData>;
  }) => {
    const filterState = useAtomValue(ItemFilterState);
    const globals = useAtomValue(Globals);
    const rawItems = selectItems({ Itms: itemData.Itms });

    const items = useMemo(() => {
      if (!rawItems) return [];
      const itemsWithIndex = rawItems.map((item, index) => ({ ...item, index }));
      return filterItems(itemsWithIndex, filterState, globals.GAME_TYPE);
    }, [rawItems, filterState, globals.GAME_TYPE]);

    if (items.length === 0) return <></>;

    return (
      <Layer>
        <Rect />
        {items.map((item) => (
          <Item
            key={item.index} // Use original index as key to ensure stability
            itemData={itemData}
            setItemData={setItemData}
            itemIdx={item.index} // Pass original index for updates
          />
        ))}
      </Layer>
    );
  },
);
