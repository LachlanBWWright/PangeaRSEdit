import { describe, expect, it } from "vitest";
import { BugdomGlobals } from "@/data/globals/globals";
import { DEFAULT_FILTER_STATE, FilterMode } from "@/data/items/itemFilterAtoms";
import { toFilterableItemKey } from "@/data/items/itemFilterKeys";
import {
  type FilterableItemType,
  createHideAllFilterState,
  isFilterTypeVisible,
  toSortedItemTypes,
  toggleHiddenItemType,
} from "@/editor/subviews/filters/itemFilterPanelState";

describe("itemFilterPanelState", () => {
  it("lists spline item rows separately", () => {
    const itemTypes = toSortedItemTypes(BugdomGlobals);
    expect(itemTypes.some((itemType) => itemType.kind === "item")).toBe(true);
    expect(itemTypes.some((itemType) => itemType.kind === "splineItem")).toBe(true);
  });

  it("hide-all hides both item kinds", () => {
    const allItemTypes: FilterableItemType[] = [
      { kind: "item", type: 4, key: toFilterableItemKey({ kind: "item", type: 4 }), kindLabel: "Item", label: "Item: Test", id: 4, name: "Test" },
      { kind: "splineItem", type: 4, key: toFilterableItemKey({ kind: "splineItem", type: 4 }), kindLabel: "Spline", label: "Spline: Test", id: 4, name: "Test" },
    ];
    const nextFilter = createHideAllFilterState(DEFAULT_FILTER_STATE, allItemTypes);

    expect(nextFilter.mode).toBe(FilterMode.HIDE_SELECTED);
    expect(isFilterTypeVisible(nextFilter, { kind: "item", type: 4 })).toBe(false);
    expect(isFilterTypeVisible(nextFilter, { kind: "splineItem", type: 4 })).toBe(false);
  });

  it("toggles only the selected filterable key", () => {
    const nextFilter = toggleHiddenItemType(DEFAULT_FILTER_STATE, {
      kind: "splineItem",
      type: 9,
    });

    expect(nextFilter.itemTypes[toFilterableItemKey({ kind: "splineItem", type: 9 })]).toBe(true);
    expect(nextFilter.itemTypes[toFilterableItemKey({ kind: "item", type: 9 })]).toBeUndefined();
  });
});
