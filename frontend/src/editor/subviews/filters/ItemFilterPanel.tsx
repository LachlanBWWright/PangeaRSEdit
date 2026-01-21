import React from "react";
import { useAtom, useAtomValue } from "jotai";
import { ItemFilterState, FilterMode, FilterPresets, DEFAULT_FILTER_STATE } from "../../../data/items/itemFilterAtoms";
import { Globals } from "../../../data/globals/globals";
import { CategoryFilterGroup } from "./CategoryFilterGroup";
import { ItemTypeFilterList } from "./ItemTypeFilterList";
import { X } from "lucide-react";

interface ItemFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ItemFilterPanel: React.FC<ItemFilterPanelProps> = ({
  isOpen,
  onClose,
}) => {
  const [filter, setFilter] = useAtom(ItemFilterState);
  const globals = useAtomValue(Globals);

  if (!isOpen) return null;

  return (
    <div className="absolute top-12 right-4 w-80 bg-gray-900/95 backdrop-blur-sm rounded-lg shadow-2xl z-50 border border-gray-700 max-h-[calc(100vh-100px)] flex flex-col">
      <div className="p-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">Item Filters</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Mode Selection */}
        <div className="mb-4">
          <label className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Filter Mode</label>
          <select
            value={filter.mode}
            onChange={(e) => setFilter({
              ...filter,
              mode: e.target.value as FilterMode,
            })}
            className="w-full bg-gray-800 text-white text-sm rounded p-2 border border-gray-700 focus:border-blue-500 focus:outline-none"
          >
            <option value={FilterMode.SHOW_ALL}>Show All Items</option>
            <option value={FilterMode.SHOW_SELECTED}>Show Selected Only</option>
            <option value={FilterMode.HIDE_SELECTED}>Hide Selected</option>
          </select>
        </div>

        {/* Quick Presets */}
        <div className="mb-2">
          <label className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Quick Presets</label>
          <div className="flex flex-wrap gap-2">
            {FilterPresets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => setFilter({ ...filter, ...preset.state })}
                className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 text-gray-200 rounded transition-colors"
                title={preset.description}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 overflow-y-auto flex-grow custom-scrollbar">
        {/* Category Checkboxes */}
        <div className="mb-6">
          <label className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Categories</label>
          <CategoryFilterGroup filter={filter} setFilter={setFilter} />
        </div>

        {/* Search */}
        <div className="mb-4">
          <label className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Search Items</label>
          <input
            type="text"
            value={filter.searchQuery}
            onChange={(e) => setFilter({ ...filter, searchQuery: e.target.value })}
            placeholder="Search by name..."
            className="w-full bg-gray-800 text-white text-sm rounded p-2 border border-gray-700 focus:border-blue-500 focus:outline-none placeholder-gray-500"
          />
        </div>

        {/* Specific Item Types */}
        <div className="mb-2">
           <label className="block text-xs uppercase tracking-wider text-gray-500 font-bold mb-2">Item Types</label>
           <ItemTypeFilterList filter={filter} setFilter={setFilter} game={globals.GAME_TYPE} />
        </div>
      </div>

      <div className="p-4 border-t border-gray-800 flex-shrink-0">
        {/* Reset Button */}
        <button
          onClick={() => setFilter(DEFAULT_FILTER_STATE)}
          className="w-full py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded border border-gray-700 transition-colors"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};
