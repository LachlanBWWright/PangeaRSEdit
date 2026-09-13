import { describe, expect, it } from "vitest";
import { BugdomGlobals } from "@/data/globals/globals";
import { DEFAULT_FILTER_STATE, FilterMode } from "@/data/items/itemFilterAtoms";
import { toFilterableItemKey } from "@/data/items/itemFilterKeys";
import {
  type FilterableItemType,
  countItemAppearances,
  createHideAllFilterState,
  isFilterTypeVisible,
  toSortedItemTypes,
  toggleHiddenItemType,
} from "@/editor/subviews/filters/itemFilterPanelState";

const createItemData = (types: number[]) => ({
  Itms: {
    1000: {
      name: "Terrain Items List" as const,
      obj: types.map((type) => ({
        x: 0,
        z: 0,
        type,
        flags: 0,
        p0: 0,
        p1: 0,
        p2: 0,
        p3: 0,
      })),
      order: 0,
    },
  },
});

const createSplineData = (types: number[]) => ({
  SpNb: {},
  SpPt: {},
  SpIt: {
    1000: {
      name: "Spline Item List" as const,
      obj: types.map((type) => ({
        flags: 0,
        p0: 0,
        p1: 0,
        p2: 0,
        p3: 0,
        placement: 0,
        type,
      })),
      order: 0,
    },
  },
  Spln: { 1000: { name: "Spline List" as const, obj: [], order: 0 } },
});

describe("itemFilterPanelState", () => {
  it("lists spline item rows separately", () => {
    const itemTypes = toSortedItemTypes(BugdomGlobals);
    expect(itemTypes.some((itemType) => itemType.kind === "item")).toBe(true);
    expect(itemTypes.some((itemType) => itemType.kind === "splineItem")).toBe(true);
  });

  it("counts appearances by item kind", () => {
    const counts = countItemAppearances(
      createItemData([4, 4, 9]),
      createSplineData([4, 4]),
    );

    expect(counts.get(toFilterableItemKey({ kind: "item", type: 4 }))).toBe(2);
    expect(counts.get(toFilterableItemKey({ kind: "item", type: 9 }))).toBe(1);
    expect(counts.get(toFilterableItemKey({ kind: "splineItem", type: 4 }))).toBe(2);
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
