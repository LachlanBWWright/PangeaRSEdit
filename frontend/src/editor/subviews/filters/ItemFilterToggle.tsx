import React, { useState } from "react";
import { useAtomValue } from "jotai";
import { itemFilterStateAtom, FilterMode } from "@/data/items/itemFilterAtoms";
import { ItemFilterPanel } from "./ItemFilterPanel";
import { Filter } from "lucide-react";

/**
 * Toggle button that opens/closes the item filter panel
 * Shows a visual indicator when filtering is active
 */
export const ItemFilterToggle: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const filter = useAtomValue(itemFilterStateAtom);
  
  const isFiltering = filter.mode !== FilterMode.SHOW_ALL;
  
  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded transition-colors ${
          isFiltering ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-700 hover:bg-gray-600'
        }`}
        title="Item Filters"
        aria-label="Toggle item filters"
      >
        <Filter className="w-5 h-5 text-white" />
        {isFiltering && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
        )}
      </button>
      
      <ItemFilterPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
