import { ItemData } from "@/python/structSpecs/LevelTypes";
import { Layer, Rect } from "react-konva";
import { Updater } from "use-immer";
import { Item } from "./items/Item";
import { memo, useMemo, useCallback } from "react";
import { useAtomValue } from "jotai";
import { Globals } from "@/data/globals/globals";
import { itemFilterStateAtom } from "@/data/items/itemFilterAtoms";
import { isItemVisible } from "@/data/items/itemFilterUtils";

export const Items = memo(
  ({
    itemData,
    setItemData,
  }: {
    itemData: ItemData;
    setItemData: Updater<ItemData>;
  }) => {
    const globals = useAtomValue(Globals);
    const filterState = useAtomValue(itemFilterStateAtom);

    // Create a function to get item type names from globals
    const getTypeName = useCallback(
      (itemType: number) => globals.ITEM_TYPES[itemType],
      [globals.ITEM_TYPES]
    );

    // Compute which item indices should be visible based on filter
    const visibleItemIndices = useMemo(() => {
      if (!itemData.Itms) return [];
      
      const items = itemData.Itms[1000].obj;
      const indices: number[] = [];
      
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        if (item && isItemVisible(item.type, filterState, getTypeName)) {
          indices.push(idx);
        }
      }
      
      return indices;
    }, [itemData.Itms, filterState, getTypeName]);

    if (!itemData.Itms) return <></>;

    return (
      <Layer>
        <Rect />
        {visibleItemIndices.map((itemIdx) => (
          <Item key={itemIdx} itemData={itemData} setItemData={setItemData} itemIdx={itemIdx} />
        ))}
      </Layer>
    );
  },
);
