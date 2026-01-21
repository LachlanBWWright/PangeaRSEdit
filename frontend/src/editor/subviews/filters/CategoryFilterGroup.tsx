import React from "react";
import { ItemFilterState } from "../../../data/items/itemFilterAtoms";
import { ItemCategory } from "../../../data/items/itemCategories";

const CATEGORY_COLORS: Record<ItemCategory, string> = {
  enemy: "bg-red-600",
  powerup: "bg-green-600",
  environmental: "bg-blue-600",
  trigger: "bg-yellow-600",
  player: "bg-purple-600",
  unknown: "bg-gray-600",
};

export const CategoryFilterGroup: React.FC<{
  filter: ItemFilterState;
  setFilter: (filter: ItemFilterState) => void;
}> = ({ filter, setFilter }) => {
  const categories: ItemCategory[] = [
    "enemy", "powerup", "environmental", "trigger", "player", "unknown"
  ];

  return (
    <div className="space-y-2">
      {categories.map((category) => (
        <label key={category} className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={filter.categories[category]}
            onChange={(e) => setFilter({
              ...filter,
              categories: {
                ...filter.categories,
                [category]: e.target.checked,
              },
            })}
            className="w-4 h-4 rounded border-gray-500 bg-gray-700 checked:bg-blue-600"
          />
          <span className={`w-3 h-3 rounded-full ${CATEGORY_COLORS[category]}`} />
          <span className="text-white capitalize">{category}</span>
        </label>
      ))}
    </div>
  );
};
