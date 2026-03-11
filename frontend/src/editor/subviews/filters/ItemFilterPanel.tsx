import React, { useMemo, useState } from "react";
import { useAtom, useAtomValue } from "jotai";
import { itemFilterStateAtom, FilterMode, DEFAULT_FILTER_STATE } from "@/data/items/itemFilterAtoms";
import { Globals } from "@/data/globals/globals";

interface ItemFilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Item filter panel showing per-type toggles for all item types in the current game.
 * Replaces the old category-based filter with individual item visibility controls.
 */
export const ItemFilterPanel: React.FC<ItemFilterPanelProps> = ({ isOpen, onClose }) => {
  const [filter, setFilter] = useAtom(itemFilterStateAtom);
  const globals = useAtomValue(Globals);
  const [search, setSearch] = useState("");

  const allItemTypes = useMemo(() => {
    const types = globals.ITEM_TYPES;
    return Object.entries(types)
      .map(([id, name]) => ({ id: Number(id), name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [globals.ITEM_TYPES]);

  const filteredTypes = useMemo(() => {
    if (!search.trim()) return allItemTypes;
    const q = search.toLowerCase();
    return allItemTypes.filter((t) => t.name.toLowerCase().includes(q));
  }, [allItemTypes, search]);

  const isTypeVisible = (id: number): boolean => {
    if (filter.mode === FilterMode.SHOW_ALL) return true;
    if (filter.mode === FilterMode.HIDE_SELECTED) return !filter.itemTypes[id];
    return !!filter.itemTypes[id];
  };

  const toggleType = (id: number) => {
    const currentlyVisible = isTypeVisible(id);
    if (currentlyVisible) {
      // Hide this type
      const newItemTypes = { ...filter.itemTypes, [id]: true as const };
      setFilter({
        ...filter,
        mode: FilterMode.HIDE_SELECTED,
        itemTypes: newItemTypes,
      });
    } else {
      // Show this type — remove from hidden set using omit pattern
      const newItemTypes = Object.fromEntries(
        Object.entries(filter.itemTypes).filter(([k]) => Number(k) !== id),
      ) as Record<number, boolean | undefined>;
      const hasHidden = Object.values(newItemTypes).some(Boolean);
      setFilter({
        ...filter,
        mode: hasHidden ? FilterMode.HIDE_SELECTED : FilterMode.SHOW_ALL,
        itemTypes: newItemTypes,
      });
    }
  };

  const showAll = () => setFilter(DEFAULT_FILTER_STATE);

  const hideAll = () => {
    const allHidden: Record<number, boolean | undefined> = {};
    allItemTypes.forEach(({ id }) => {
      allHidden[id] = true;
    });
    setFilter({ ...filter, mode: FilterMode.HIDE_SELECTED, itemTypes: allHidden });
  };

  const visibleCount = allItemTypes.filter((t) => isTypeVisible(t.id)).length;

  if (!isOpen) return null;

  return (
    <div className="absolute top-full right-0 mt-1 w-72 bg-gray-900/97 rounded-lg shadow-2xl z-50 border border-gray-700 flex flex-col max-h-[min(80vh,420px)]">
      {/* Header */}
      <div className="flex justify-between items-center px-3 py-2 border-b border-gray-700 flex-none">
        <span className="text-sm font-semibold text-white">
          Item Visibility ({visibleCount}/{allItemTypes.length})
        </span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-white transition-colors text-lg leading-none"
          aria-label="Close filter panel"
        >
          ✕
        </button>
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
          <button
            onClick={showAll}
            className="flex-1 py-1 text-xs bg-blue-700 hover:bg-blue-600 text-white rounded transition-colors"
          >
            Show All
          </button>
          <button
            onClick={hideAll}
            className="flex-1 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
          >
            Hide All
          </button>
        </div>
      </div>

      {/* Per-type toggle list */}
      <div className="flex-1 overflow-y-auto px-1 py-1">
        {filteredTypes.length === 0 ? (
          <p className="text-gray-500 text-xs text-center py-3">No items match</p>
        ) : (
          filteredTypes.map(({ id, name }) => {
            const visible = isTypeVisible(id);
            return (
              <label
                key={id}
                className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-gray-800 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={visible}
                  onChange={() => toggleType(id)}
                  className="w-3.5 h-3.5 accent-blue-500 cursor-pointer"
                />
                <span className={`text-xs truncate ${visible ? "text-white" : "text-gray-500 line-through"}`}>
                  {name}
                </span>
                <span className="ml-auto text-xs text-gray-600 flex-none">{id}</span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
};
