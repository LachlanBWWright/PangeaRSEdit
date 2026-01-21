import React, { useState } from "react";
import { useAtomValue } from "jotai";
import { ItemFilterState, FilterMode } from "../../../data/items/itemFilterAtoms";
import { ItemFilterPanel } from "./ItemFilterPanel";
import { Filter } from "lucide-react";

export const ItemFilterToggle: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const filter = useAtomValue(ItemFilterState);

  const isFiltering = filter.mode !== FilterMode.SHOW_ALL;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`p-2 rounded shadow-md transition-colors border ${
          isFiltering
            ? 'bg-blue-600 border-blue-400 hover:bg-blue-500'
            : 'bg-gray-800 border-gray-600 hover:bg-gray-700'
        }`}
        title="Item Filters"
      >
        <Filter className="w-5 h-5 text-white" />
        {isFiltering && (
          <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-gray-900 translate-x-1/2 -translate-y-1/2" />
        )}
      </button>

      <ItemFilterPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
