import React, { useMemo, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  itemFilterStateAtom,
  DEFAULT_FILTER_STATE,
} from "@/data/items/itemFilterAtoms";
import { Globals } from "@/data/globals/globals";
import type { ItemData, SplineData } from "@/python/structSpecs/LevelTypes";
import {
  countItemAppearances,
  createHideAllFilterState,
  filterItemTypesBySearch,
  isFilterTypeVisible,
  toSortedItemTypes,
  toggleHiddenItemType,
} from "@/editor/subviews/filters/itemFilterPanelState";

interface ItemFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  itemData: ItemData;
  splineData: SplineData | null;
}

/**
 * Item filter panel showing per-type toggles for all item types in the current game.
 * Replaces the old category-based filter with individual item visibility controls.
 */
export const ItemFilterPanel: React.FC<ItemFilterPanelProps> = ({
  isOpen,
  onClose,
  itemData,
  splineData,
}) => {
  const [filter, setFilter] = useAtom(itemFilterStateAtom);
  const globals = useAtomValue(Globals);
  const [search, setSearch] = useState("");

  const allItemTypes = useMemo(() => {
    return toSortedItemTypes(globals);
  }, [globals]);

  const filteredTypes = useMemo(() => {
    return filterItemTypesBySearch(allItemTypes, search);
  }, [allItemTypes, search]);

  const itemAppearanceCounts = useMemo(
    () => countItemAppearances(itemData, splineData),
    [itemData, splineData],
  );

  const isTypeVisible = (itemType: (typeof allItemTypes)[number]): boolean => {
    return isFilterTypeVisible(filter, itemType);
  };

  const toggleType = (itemType: (typeof allItemTypes)[number]) => {
    setFilter(toggleHiddenItemType(filter, itemType));
  };

  const showAll = () => setFilter(DEFAULT_FILTER_STATE);

  const hideAll = () => {
    setFilter(createHideAllFilterState(filter, allItemTypes));
  };

  const visibleCount = allItemTypes.filter((itemType) =>
    isTypeVisible(itemType),
  ).length;

  if (!isOpen) return null;

  return (
    <div className="absolute top-full right-0 mt-1 w-72 bg-gray-900/97 rounded-lg shadow-2xl z-50 border border-gray-700 flex flex-col max-h-[min(80vh,420px)]">
      {/* Header */}
      <div className="flex justify-between items-center px-3 py-2 border-b border-gray-700 flex-none">
        <span className="text-sm font-semibold text-white">
          Item Visibility ({visibleCount}/{allItemTypes.length})
        </span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-7 w-7 text-gray-400"
          aria-label="Close filter panel"
        >
          ✕
        </Button>
      </div>

      {/* Search + Toggle-all row */}
      <div className="px-3 py-2 border-b border-gray-700 flex-none space-y-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search item types…"
          className="w-full bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            onClick={showAll}
            className="flex-1"
          >
            Show All
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={hideAll}
            className="flex-1"
          >
            Hide All
          </Button>
        </div>
      </div>

      {/* Per-type toggle list */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {filteredTypes.length === 0 ? (
          <p className="text-gray-500 text-xs text-center py-3">
            No items match
          </p>
        ) : (
          filteredTypes.map((itemType) => {
            const visible = isTypeVisible(itemType);
            return (
              <label
                key={itemType.key}
                className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-800 transition-colors"
              >
                <Checkbox
                  checked={visible}
                  onCheckedChange={() => toggleType(itemType)}
                  className="h-3.5 w-3.5 cursor-pointer"
                />
                <span
                  className={`text-xs truncate ${visible ? "text-white" : "text-gray-500 line-through"}`}
                >
                  {itemType.label}
                </span>
                <span className="ml-auto text-xs text-gray-600 flex-none">
                  {itemAppearanceCounts.get(itemType.key) ?? 0}
                </span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
};
