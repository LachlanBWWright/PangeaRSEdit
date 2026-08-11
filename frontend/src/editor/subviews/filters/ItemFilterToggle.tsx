import React, { useState } from "react";
import { useAtomValue } from "jotai";
import { itemFilterStateAtom, FilterMode } from "@/data/items/itemFilterAtoms";
import { ItemFilterPanel } from "./ItemFilterPanel";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Toggle button that opens/closes the item filter panel.
 * The panel opens below-right, aligned with the button's right edge.
 */
export const ItemFilterToggle: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const filter = useAtomValue(itemFilterStateAtom);

  const isFiltering = filter.mode !== FilterMode.SHOW_ALL;

  return (
    <div className="relative">
      <Button
        type="button"
        size="icon"
        variant="selectable"
        aria-pressed={isFiltering}
        onClick={() => setIsOpen(!isOpen)}
        title="Item Visibility Filters"
        aria-label="Toggle item filters"
      >
        <Filter className="w-5 h-5 text-white" />
        {isFiltering && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full" />
        )}
      </Button>

      <ItemFilterPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
};
