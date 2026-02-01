import React from "react";
import { useAtomValue } from "jotai";
import { itemFilterStateAtom, FilterMode } from "@/data/items/itemFilterAtoms";
import { isItemVisible } from "@/data/items/itemFilterUtils";
import { Globals } from "@/data/globals/globals";
import type { TerrainItem } from "@/python/structSpecs/LevelTypes";

interface FilterStatusBarProps {
  items: TerrainItem[];
}

/**
 * Status bar that shows how many items are visible vs hidden
 * Only displays when filtering is active
 */
export const FilterStatusBar: React.FC<FilterStatusBarProps> = ({ items }) => {
  const filter = useAtomValue(itemFilterStateAtom);
  const globals = useAtomValue(Globals);

  if (filter.mode === FilterMode.SHOW_ALL) {
    return null; // Don't show when not filtering
  }

  // Create a lookup function for item type names
  const getTypeName = (itemType: number): string | undefined => {
    const itemTypes = globals.ITEM_TYPES;
    return itemTypes ? itemTypes[itemType] : undefined;
  };

  const visibleItems = items.filter(item => 
    isItemVisible(item.type, filter, getTypeName)
  );
  const totalCount = items.length;
  const hiddenCount = totalCount - visibleItems.length;

  return (
    <div
      className="absolute bottom-4 left-1/2 transform -translate-x-1/2 
                    bg-gray-900/90 text-white px-4 py-2 rounded-full text-sm z-40
                    shadow-lg border border-gray-700"
    >
      Showing {visibleItems.length} of {totalCount} items
      {hiddenCount > 0 && (
        <span className="text-gray-400 ml-2">({hiddenCount} hidden)</span>
      )}
    </div>
  );
};
