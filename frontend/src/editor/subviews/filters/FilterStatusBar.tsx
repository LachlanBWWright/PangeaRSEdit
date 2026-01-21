import React from "react";
import { useAtomValue } from "jotai";
import { ItemFilterState, FilterMode } from "../../../data/items/itemFilterAtoms";
import { filterItems } from "../../../data/items/itemFilterUtils";
import { Globals } from "../../../data/globals/globals";
import { TerrainItem } from "../../../python/structSpecs/LevelTypes";

export const FilterStatusBar: React.FC<{ totalItems: number; items: TerrainItem[] }> = ({
  totalItems,
  items,
}) => {
  const filter = useAtomValue(ItemFilterState);
  const globals = useAtomValue(Globals);

  if (filter.mode === FilterMode.SHOW_ALL) {
    return null;  // Don't show when not filtering
  }

  const visibleItems = filterItems(items, filter, globals.GAME_TYPE);
  const hiddenCount = totalItems - visibleItems.length;

  return (
    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2
                    bg-gray-900/90 text-white px-4 py-2 rounded-full text-sm z-40
                    border border-gray-700 shadow-lg backdrop-blur-sm pointer-events-none">
      Showing {visibleItems.length} of {totalItems} items
      {hiddenCount > 0 && (
        <span className="text-gray-400 ml-2">
          ({hiddenCount} hidden)
        </span>
      )}
    </div>
  );
};
