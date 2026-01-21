import React, { useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import { Globals, Game } from "../../../data/globals/globals";
import { ItemFilterState } from "../../../data/items/itemFilterAtoms";
import { categorizeItem, ItemCategory } from "../../../data/items/itemCategories";
import { ChevronRight, ChevronDown } from "lucide-react";

const CollapsibleCategory: React.FC<{
  category: ItemCategory;
  types: number[];
  filter: ItemFilterState;
  setFilter: (filter: ItemFilterState) => void;
  itemTypes: Record<number, string>;
}> = ({ category, types, filter, setFilter, itemTypes }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (types.length === 0) return null;

  return (
    <div className="border-b border-gray-700 last:border-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center w-full py-2 text-left hover:bg-gray-800 text-sm text-gray-300 transition-colors"
      >
        {isOpen ? <ChevronDown className="w-4 h-4 mr-2" /> : <ChevronRight className="w-4 h-4 mr-2" />}
        <span className="capitalize font-medium flex-grow">{category}</span>
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
            {types.length}
        </span>
      </button>

      {isOpen && (
        <div className="pl-6 pr-2 pb-2 space-y-1">
          {types.map((typeId) => {
            const isOverridden = filter.itemTypes[typeId] !== undefined;
            const isVisible = filter.itemTypes[typeId] ?? filter.categories[category];
            const name = itemTypes[typeId] ?? `Type ${typeId}`;

            return (
              <div key={typeId} className="flex items-center justify-between group">
                <label
                  className={`flex items-center gap-2 cursor-pointer select-none flex-grow min-w-0 ${isOverridden ? 'text-blue-300' : 'text-gray-400'}`}
                  title={name}
                >
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => setFilter({
                      ...filter,
                      itemTypes: {
                        ...filter.itemTypes,
                        [typeId]: e.target.checked,
                      },
                    })}
                    className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 checked:bg-blue-600 flex-shrink-0"
                  />
                  <span className="text-xs truncate">
                    {name}
                  </span>
                </label>
                {isOverridden && (
                  <button
                    onClick={() => {
                      const newTypes = { ...filter.itemTypes };
                      delete newTypes[typeId];
                      setFilter({ ...filter, itemTypes: newTypes });
                    }}
                    className="text-xs text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity px-1"
                    title="Reset to category default"
                  >
                    ↩
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const ItemTypeFilterList: React.FC<{
  filter: ItemFilterState;
  setFilter: (filter: ItemFilterState) => void;
  game: Game;
}> = ({ filter, setFilter, game }) => {
  const globals = useAtomValue(Globals);
  const itemTypes = globals.ITEM_TYPES;

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<ItemCategory, number[]> = {
      enemy: [],
      powerup: [],
      environmental: [],
      trigger: [],
      player: [],
      unknown: [],
    };

    for (const [typeId] of Object.entries(itemTypes)) {
      const id = Number(typeId);
      const category = categorizeItem(game, id);
      groups[category].push(id);
    }

    return groups;
  }, [itemTypes, game]);

  return (
    <div className="max-h-64 overflow-y-auto pr-1 custom-scrollbar">
       {Object.entries(grouped).map(([category, types]) => (
         <CollapsibleCategory
            key={category}
            category={category as ItemCategory}
            types={types}
            filter={filter}
            setFilter={setFilter}
            itemTypes={itemTypes}
         />
       ))}
    </div>
  );
};
