import React from "react";
import { useAtom } from "jotai";
import {
  itemFilterStateAtom,
  FilterMode,
  FILTER_PRESETS,
  ItemFilterState,
  FilterPreset,
} from "@/data/items/itemFilterAtoms";
import {
  ItemCategory,
  getCategoryDisplayName,
  getAllCategories,
} from "@/data/items/itemCategories";

interface ItemFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<ItemCategory, string> = {
  [ItemCategory.ENEMY]: "bg-red-500",
  [ItemCategory.POWERUP]: "bg-green-500",
  [ItemCategory.ENVIRONMENTAL]: "bg-blue-500",
  [ItemCategory.TRIGGER]: "bg-yellow-500",
  [ItemCategory.PLAYER]: "bg-purple-500",
  [ItemCategory.UNKNOWN]: "bg-gray-500",
};

/**
 * Main filter panel component with category checkboxes and presets
 */
export const ItemFilterPanel: React.FC<ItemFilterPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [filter, setFilter] = useAtom(itemFilterStateAtom);

  const defaultState: ItemFilterState = {
    mode: FilterMode.SHOW_ALL,
    categories: Object.fromEntries(
      getAllCategories().map(c => [c, true])
    ) as Record<ItemCategory, boolean>,
    itemTypes: {},
    searchQuery: "",
    highlightedTypes: [],
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-4 right-16 w-80 bg-gray-900/95 rounded-lg shadow-xl z-50 border border-gray-700 max-h-[80vh] overflow-y-auto">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Item Filters</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close filter panel"
          >
            ✕
          </button>
        </div>

        {/* Filter Mode Selection */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Filter Mode</label>
          <select
            value={filter.mode}
            onChange={(e) =>
              setFilter({
                ...filter,
                mode: e.target.value as FilterMode,
              })
            }
            className="w-full bg-gray-800 text-white rounded p-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
          >
            <option value={FilterMode.SHOW_ALL}>Show All Items</option>
            <option value={FilterMode.SHOW_SELECTED}>Show Selected Only</option>
            <option value={FilterMode.HIDE_SELECTED}>Hide Selected</option>
          </select>
        </div>

        {/* Quick Presets */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Quick Presets</label>
          <div className="flex flex-wrap gap-2">
            {FILTER_PRESETS.map((preset: FilterPreset) => (
              <button
                key={preset.name}
                onClick={() => setFilter({ ...filter, ...preset.state })}
                className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                title={preset.description}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Category Checkboxes */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">Categories</label>
          <div className="space-y-2">
            {getAllCategories().map((category) => (
              <label
                key={category}
                className="flex items-center gap-2 cursor-pointer hover:bg-gray-800 p-1 rounded"
              >
                <input
                  type="checkbox"
                  checked={filter.categories[category]}
                  onChange={(e) =>
                    setFilter({
                      ...filter,
                      categories: {
                        ...filter.categories,
                        [category]: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded border-gray-600 focus:ring-blue-500"
                />
                <span
                  className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[category]}`}
                />
                <span className="text-white capitalize">
                  {getCategoryDisplayName(category)}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="mb-4">
          <label className="block text-sm text-gray-400 mb-2">
            Search Items
          </label>
          <input
            type="text"
            value={filter.searchQuery}
            onChange={(e) =>
              setFilter({ ...filter, searchQuery: e.target.value })
            }
            placeholder="Search by name..."
            className="w-full bg-gray-800 text-white rounded p-2 border border-gray-600 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {/* Reset Button */}
        <button
          onClick={() => setFilter(defaultState)}
          className="w-full py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};
