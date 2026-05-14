import { describe, it, expect } from "vitest";
import {
  getVisibleFilterableItemKeys,
  isItemVisible,
  isSplineItemVisible,
  itemMatchesSearch,
  getVisibleItemTypes,
  countItemsByCategory,
  createDefaultFilter,
  applyFilterPreset,
} from "@/data/items/itemFilterUtils";
import { FilterMode, type ItemFilterState, DEFAULT_FILTER_STATE } from "@/data/items/itemFilterAtoms";
import { ItemCategory } from "@/data/items/itemCategories";
import { toFilterableItemKey } from "@/data/items/itemFilterKeys";

// Mock item type name lookup
const mockGetTypeName = (itemType: number): string | undefined => {
  const names: Record<number, string> = {
    1: "Enemy_Squooshy",
    2: "Enemy_BrainAlien",
    3: "PowerupPod",
    4: "HealthPack",
    5: "StartCoords",
    6: "Checkpoint",
    7: "Tree_Oak",
    8: "Rock",
    9: "UnknownItem",
  };
  return names[itemType];
};

describe("Item Filter Utils", () => {
  describe("isItemVisible", () => {
    it("should show all items when mode is SHOW_ALL", () => {
      const filter: ItemFilterState = {
        ...DEFAULT_FILTER_STATE,
        mode: FilterMode.SHOW_ALL,
      };

      expect(isItemVisible(1, filter)).toBe(true);
      expect(isItemVisible(3, filter)).toBe(true);
      expect(isItemVisible(999, filter)).toBe(true);
    });

    it("should show only selected item types in SHOW_SELECTED mode", () => {
      const filter: ItemFilterState = {
        ...DEFAULT_FILTER_STATE,
        mode: FilterMode.SHOW_SELECTED,
        itemTypes: {
          [toFilterableItemKey({ kind: "item", type: 1 })]: true,
          [toFilterableItemKey({ kind: "item", type: 2 })]: true,
        },
      };

      expect(isItemVisible(1, filter)).toBe(true); // explicitly shown
      expect(isItemVisible(2, filter)).toBe(true); // explicitly shown
      expect(isItemVisible(3, filter)).toBe(false); // not in itemTypes, defaults hidden
      expect(isItemVisible(7, filter)).toBe(false); // not in itemTypes, defaults hidden
    });

    it("should hide selected item types in HIDE_SELECTED mode", () => {
      const filter: ItemFilterState = {
        ...DEFAULT_FILTER_STATE,
        mode: FilterMode.HIDE_SELECTED,
        itemTypes: {
          [toFilterableItemKey({ kind: "item", type: 1 })]: true,
          [toFilterableItemKey({ kind: "item", type: 2 })]: true,
        },
      };

      expect(isItemVisible(1, filter)).toBe(false); // explicitly hidden
      expect(isItemVisible(3, filter)).toBe(true); // not in itemTypes, defaults visible
    });

    it("should respect item type overrides", () => {
      const filter: ItemFilterState = {
        ...DEFAULT_FILTER_STATE,
        mode: FilterMode.SHOW_SELECTED,
        itemTypes: {
          [toFilterableItemKey({ kind: "item", type: 1 })]: true,
          [toFilterableItemKey({ kind: "item", type: 3 })]: true,
        },
      };

      expect(isItemVisible(1, filter)).toBe(true); // explicitly shown
      expect(isItemVisible(3, filter)).toBe(true); // explicitly shown by override
      expect(isItemVisible(4, filter)).toBe(false); // not in itemTypes, defaults hidden
    });
  });

  describe("itemMatchesSearch", () => {
    it("should return false when no search query is active", () => {
      const filter: ItemFilterState = {
        ...DEFAULT_FILTER_STATE,
        searchQuery: "",
      };

      expect(itemMatchesSearch(1, filter, mockGetTypeName)).toBe(false);
    });

    it("should return true when item name matches search query", () => {
      const filter: ItemFilterState = {
        ...DEFAULT_FILTER_STATE,
        searchQuery: "squooshy",
      };

      expect(itemMatchesSearch(1, filter, mockGetTypeName)).toBe(true);
      expect(itemMatchesSearch(2, filter, mockGetTypeName)).toBe(false);
    });

    it("should be case insensitive", () => {
      const filter: ItemFilterState = {
        ...DEFAULT_FILTER_STATE,
        searchQuery: "ENEMY",
      };

      expect(itemMatchesSearch(1, filter, mockGetTypeName)).toBe(true);
      expect(itemMatchesSearch(2, filter, mockGetTypeName)).toBe(true);
    });
  });

  describe("getVisibleItemTypes", () => {
    it("should return all types when mode is SHOW_ALL", () => {
      const filter: ItemFilterState = {
        ...DEFAULT_FILTER_STATE,
        mode: FilterMode.SHOW_ALL,
      };
      const allTypes = [1, 2, 3, 4, 5];

      expect(getVisibleItemTypes(allTypes, filter)).toEqual(allTypes);
    });

    it("should filter types based on item type toggles", () => {
      const filter: ItemFilterState = {
        ...DEFAULT_FILTER_STATE,
        mode: FilterMode.SHOW_SELECTED,
        itemTypes: {
          [toFilterableItemKey({ kind: "item", type: 1 })]: true,
          [toFilterableItemKey({ kind: "item", type: 2 })]: true,
        },
      };
      const allTypes = [1, 2, 3, 4, 5, 7];

      const visible = getVisibleItemTypes(allTypes, filter);
      expect(visible).toContain(1); // explicitly shown
      expect(visible).toContain(2); // explicitly shown
      expect(visible).not.toContain(3); // defaults hidden
      expect(visible).not.toContain(7); // defaults hidden
    });
  });

  describe("spline item filter keys", () => {
    it("keeps regular and spline type keys separate", () => {
      const filter: ItemFilterState = {
        ...DEFAULT_FILTER_STATE,
        mode: FilterMode.HIDE_SELECTED,
        itemTypes: {
          [toFilterableItemKey({ kind: "item", type: 12 })]: true,
        },
      };

      expect(isItemVisible(12, filter)).toBe(false);
      expect(isSplineItemVisible(12, filter)).toBe(true);
    });

    it("returns visible keys for both item kinds", () => {
      const filter: ItemFilterState = {
        ...DEFAULT_FILTER_STATE,
        mode: FilterMode.HIDE_SELECTED,
        itemTypes: {
          [toFilterableItemKey({ kind: "splineItem", type: 7 })]: true,
        },
      };

      expect(
        getVisibleFilterableItemKeys(
          [
            { kind: "item", type: 7 },
            { kind: "splineItem", type: 7 },
          ],
          filter,
        ),
      ).toEqual([toFilterableItemKey({ kind: "item", type: 7 })]);
    });
  });

  describe("countItemsByCategory", () => {
    it("should count items by category", () => {
      const items = [
        { type: 1 }, // Enemy
        { type: 2 }, // Enemy
        { type: 3 }, // Powerup
        { type: 7 }, // Environmental
        { type: 999 }, // Unknown
      ];

      const counts = countItemsByCategory(items, mockGetTypeName);
      expect(counts[ItemCategory.ENEMY]).toBe(2);
      expect(counts[ItemCategory.POWERUP]).toBe(1);
      expect(counts[ItemCategory.ENVIRONMENTAL]).toBe(1);
      expect(counts[ItemCategory.UNKNOWN]).toBe(1);
    });
  });

  describe("createDefaultFilter", () => {
    it("should create a filter with SHOW_ALL mode", () => {
      const filter = createDefaultFilter();
      expect(filter.mode).toBe(FilterMode.SHOW_ALL);
    });

    it("should have all categories enabled", () => {
      const filter = createDefaultFilter();
      expect(filter.categories[ItemCategory.ENEMY]).toBe(true);
      expect(filter.categories[ItemCategory.POWERUP]).toBe(true);
      expect(filter.categories[ItemCategory.ENVIRONMENTAL]).toBe(true);
    });
  });

  describe("applyFilterPreset", () => {
    it("should merge preset with current filter", () => {
      const currentFilter = createDefaultFilter();
      const presetState = {
        mode: FilterMode.SHOW_SELECTED,
        categories: {
          [ItemCategory.ENEMY]: true,
          [ItemCategory.POWERUP]: false,
          [ItemCategory.ENVIRONMENTAL]: false,
          [ItemCategory.TRIGGER]: false,
          [ItemCategory.PLAYER]: false,
          [ItemCategory.UNKNOWN]: false,
        },
      };

      const result = applyFilterPreset(currentFilter, presetState);
      expect(result.mode).toBe(FilterMode.SHOW_SELECTED);
      expect(result.categories[ItemCategory.ENEMY]).toBe(true);
      expect(result.categories[ItemCategory.POWERUP]).toBe(false);
    });
  });
});
