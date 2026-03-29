import { HeaderData, ItemData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { Layer, Rect } from "react-konva";
import { Updater } from "use-immer";
import { Item } from "./items/Item";
import { memo, useMemo } from "react";
import { useAtomValue } from "jotai";
import { itemFilterStateAtom } from "@/data/items/itemFilterAtoms";
import { isItemVisible } from "@/data/items/itemFilterUtils";

export const Items = memo(
  ({
    headerData,
    terrainData,
    itemData,
    setItemData,
  }: {
    headerData: HeaderData;
    terrainData: TerrainData;
    itemData: ItemData;
    setItemData: Updater<ItemData>;
  }) => {
    const filterState = useAtomValue(itemFilterStateAtom);

    // Compute which item indices should be visible based on filter
    const visibleItemIndices = useMemo(() => {
      if (!itemData.Itms) return [];
      
      const items = itemData.Itms[1000].obj;
      const indices: number[] = [];
      
      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        if (item && isItemVisible(item.type, filterState)) {
          indices.push(idx);
        }
      }
      
      return indices;
    }, [itemData.Itms, filterState]);

    if (!itemData.Itms) return <></>;

    return (
      <Layer>
        <Rect />
        {visibleItemIndices.map((itemIdx) => (
          <Item
            key={itemIdx}
            headerData={headerData}
            terrainData={terrainData}
            itemData={itemData}
            setItemData={setItemData}
            itemIdx={itemIdx}
          />
        ))}
      </Layer>
    );
  },
);
