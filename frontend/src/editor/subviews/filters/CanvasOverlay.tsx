import React from "react";
import { ItemFilterToggle } from "./ItemFilterToggle";
import { FilterStatusBar } from "./FilterStatusBar";
import { TerrainItem } from "../../../python/structSpecs/LevelTypes";
import { useFilterShortcuts } from "../../../hooks/useFilterShortcuts";

export const CanvasOverlay: React.FC<{
  itemData: { Itms: Record<number, { obj: TerrainItem[] }> } | null;
}> = ({ itemData }) => {
  useFilterShortcuts();

  const items = itemData?.Itms?.[1000]?.obj ?? [];
  const totalItems = items.length;

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      <div className="absolute top-4 right-4 pointer-events-auto">
        <ItemFilterToggle />
      </div>
      <div className="absolute bottom-4 left-0 right-0 pointer-events-auto flex justify-center">
        <FilterStatusBar totalItems={totalItems} items={items} />
      </div>
    </div>
  );
};
