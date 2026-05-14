import { describe, expect, it } from "vitest";
import { extractSafeItemTypes } from "@/data/items/extractSafeItemTypes";

describe("extractSafeItemTypes", () => {
  it("collects regular item types from Itms", () => {
    const result = extractSafeItemTypes({
      Itms: {
        1000: {
          name: "Terrain Items List",
          order: 1000,
          obj: [
            { x: 0, z: 0, type: 1, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 },
            { x: 0, z: 0, type: 2, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 },
            { x: 0, z: 0, type: 1, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 },
          ],
        },
      },
    });

    expect([...result.itemTypes]).toEqual([1, 2]);
  });

  it("collects spline item types across all SpIt buckets", () => {
    const result = extractSafeItemTypes({
      SpIt: {
        1000: {
          name: "Spline Item List",
          order: 1000,
          obj: [{ type: 3, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0, placement: 0 }],
        },
        1005: {
          name: "Spline Item List",
          order: 1005,
          obj: [
            { type: 4, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0, placement: 0 },
            { type: 5, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0, placement: 0 },
          ],
        },
      },
    });

    expect([...result.splineItemTypes]).toEqual([3, 4, 5]);
  });
});
