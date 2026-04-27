import { describe, expect, it } from "vitest";
import { BugdomGlobals } from "@/data/globals/globals";
import { applySupertileResizeToAtomicData } from "./levelResizeHandlers";
import type { AtomicLevelData } from "@/data/utils/levelDataUtils";

function createAtomicFixture(): AtomicLevelData {
  return {
    headerData: {
      Hedr: {
        1000: {
          name: "Header",
          obj: {
            version: 1,
            numItems: 1,
            mapWidth: 10,
            mapHeight: 10,
            tileSize: 32,
            minY: 0,
            maxY: 255,
            numSplines: 1,
            numFences: 1,
            numTilePages: 1,
            numTiles: 1,
            numUniqueSupertiles: 1,
            numWaterPatches: 1,
            numCheckpoints: 0,
          },
          order: 0,
        },
      },
    },
    itemData: {
      Itms: {
        1000: {
          name: "Terrain Items List",
          obj: [
            { x: 160, z: 224, type: 1, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 },
          ],
          order: 0,
        },
      },
    },
    liquidData: {
      Liqd: {
        1000: {
          name: "Water List",
          obj: [
            {
              bBoxBottom: 0,
              bBoxLeft: 0,
              bBoxRight: 10,
              bBoxTop: 10,
              flags: 0,
              height: 16,
              hotSpotX: 320,
              hotSpotZ: 480,
              numNubs: 2,
              reserved: 0,
              type: 0,
              nubs: [
                [0, 0],
                [100, 100],
              ],
            },
          ],
          order: 0,
        },
      },
    },
    fenceData: {
      Fenc: {
        1000: {
          name: "Fence List",
          obj: [
            {
              fenceType: 0,
              numNubs: 2,
              junkNubListPtr: 0,
              bbTop: 0,
              bbBottom: 0,
              bbLeft: 0,
              bbRight: 0,
            },
          ],
          order: 0,
        },
      },
      FnNb: {
        1000: {
          name: "Fence Nub List",
          obj: [
            [50, 50],
            [100, 100],
          ],
          order: 0,
        },
      },
    },
    splineData: {
      SpNb: {
        1000: { obj: [{ x: 200, z: 300 }], order: 0 },
      },
      SpPt: {
        1000: { obj: [{ x: 200, z: 300 }], order: 0 },
      },
      SpIt: {
        1000: {
          obj: [
            { flags: 0, p0: 0, p1: 0, p2: 0, p3: 0, placement: 0, type: 1 },
          ],
          order: 0,
        },
      },
      Spln: {
        1000: {
          name: "Spline List",
          obj: [
            {
              bbBottom: 0,
              bbLeft: 0,
              bbRight: 0,
              bbTop: 0,
              numItems: 1,
              numNubs: 1,
              numPoints: 1,
            },
          ],
          order: 0,
        },
      },
    },
    terrainData: {
      Atrb: {
        1000: {
          name: "Tile Attribute Data",
          obj: new Array(100)
            .fill(null)
            .map(() => ({ flags: 0, p0: 0, p1: 0 })),
          order: 0,
        },
      },
      ItCo: {
        1000: {
          name: "Terrain Items Color Array",
          data: "",
          order: 0,
        },
      },
      Layr: {
        1000: {
          name: "Terrain Layer Matrix",
          obj: new Array(100).fill(0),
          order: 0,
        },
      },
      STgd: {
        1000: {
          name: "SuperTile Grid",
          obj: new Array(4)
            .fill(null)
            .map(() => ({ isEmpty: false, superTileId: 1 })),
          order: 0,
        },
      },
      YCrd: {
        1000: {
          name: "Floor&Ceiling Y Coords",
          obj: new Array(121).fill(0),
          order: 0,
        },
      },
      alis: {
        1000: {
          name: "Texture Page Picture Alias",
          data: "",
          order: 0,
        },
      },
      _metadata: {
        file_attributes: 0,
        junk1: 0,
        junk2: 0,
      },
    },
  };
}

describe("applySupertileResizeToAtomicData", () => {
  it("adjusts item, fence, spline, and liquid coordinates when top/left rows are added", () => {
    // One supertile operation should shift entities by one world-cell step.
    const offset = BugdomGlobals.TILE_INGAME_SIZE;

    const cases: {
      direction: "top" | "bottom" | "left" | "right";
      width: number;
      height: number;
      expectedItemX: number;
      expectedItemZ: number;
      expectedFenceNub: [number, number];
      expectedSplineNub: { x: number; z: number };
      expectedLiquidHotSpotX: number;
      expectedLiquidHotSpotZ: number;
      expectedFenceBBoxLeft: number;
      expectedFenceBBoxTop: number;
      expectedSplineBBoxLeft: number;
      expectedSplineBBoxTop: number;
      expectedLiquidBBoxLeft: number;
      expectedLiquidBBoxTop: number;
    }[] = [
      {
        direction: "left",
        width: 15,
        height: 10,
        expectedItemX: 160 + offset,
        expectedItemZ: 224,
        expectedFenceNub: [50 + offset, 50],
        expectedSplineNub: { x: 200 + offset, z: 300 },
        expectedLiquidHotSpotX: 320 + offset,
        expectedLiquidHotSpotZ: 480,
        expectedFenceBBoxLeft: offset,
        expectedFenceBBoxTop: 0,
        expectedSplineBBoxLeft: offset,
        expectedSplineBBoxTop: 0,
        expectedLiquidBBoxLeft: offset,
        expectedLiquidBBoxTop: 10,
      },
      {
        direction: "right",
        width: 15,
        height: 10,
        expectedItemX: 160,
        expectedItemZ: 224,
        expectedFenceNub: [50, 50],
        expectedSplineNub: { x: 200, z: 300 },
        expectedLiquidHotSpotX: 320,
        expectedLiquidHotSpotZ: 480,
        expectedFenceBBoxLeft: 0,
        expectedFenceBBoxTop: 0,
        expectedSplineBBoxLeft: 0,
        expectedSplineBBoxTop: 0,
        expectedLiquidBBoxLeft: 0,
        expectedLiquidBBoxTop: 10,
      },
      {
        direction: "top",
        width: 10,
        height: 15,
        expectedItemX: 160,
        expectedItemZ: 224 + offset,
        expectedFenceNub: [50, 50 + offset],
        expectedSplineNub: { x: 200, z: 300 + offset },
        expectedLiquidHotSpotX: 320,
        expectedLiquidHotSpotZ: 480 + offset,
        expectedFenceBBoxLeft: 0,
        expectedFenceBBoxTop: offset,
        expectedSplineBBoxLeft: 0,
        expectedSplineBBoxTop: offset,
        expectedLiquidBBoxLeft: 0,
        expectedLiquidBBoxTop: 10 + offset,
      },
      {
        direction: "bottom",
        width: 10,
        height: 15,
        expectedItemX: 160,
        expectedItemZ: 224,
        expectedFenceNub: [50, 50],
        expectedSplineNub: { x: 200, z: 300 },
        expectedLiquidHotSpotX: 320,
        expectedLiquidHotSpotZ: 480,
        expectedFenceBBoxLeft: 0,
        expectedFenceBBoxTop: 0,
        expectedSplineBBoxLeft: 0,
        expectedSplineBBoxTop: 0,
        expectedLiquidBBoxLeft: 0,
        expectedLiquidBBoxTop: 10,
      },
    ];

    for (const testCase of cases) {
      const fixture = createAtomicFixture();
      const result = applySupertileResizeToAtomicData(fixture, BugdomGlobals, {
        direction: testCase.direction,
        tileCount: BugdomGlobals.TILES_PER_SUPERTILE,
        defaultHeight: 0,
      });

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        continue;
      }

      const resized = result.value.data;
      expect(resized.headerData?.Hedr[1000].obj.mapWidth).toBe(testCase.width);
      expect(resized.headerData?.Hedr[1000].obj.mapHeight).toBe(
        testCase.height,
      );
      expect(resized.terrainData?.Layr?.[1000].obj.length).toBe(
        testCase.width * testCase.height,
      );
      expect(resized.terrainData?.YCrd[1000].obj.length).toBe(
        (testCase.width + 1) * (testCase.height + 1),
      );
      expect(resized.itemData?.Itms[1000].obj[0]?.x).toBe(
        testCase.expectedItemX,
      );
      expect(resized.itemData?.Itms[1000].obj[0]?.z).toBe(
        testCase.expectedItemZ,
      );
      expect(resized.fenceData?.FnNb[1000]?.obj[0]).toEqual(
        testCase.expectedFenceNub,
      );
      expect(resized.splineData?.SpNb[1000]?.obj[0]).toEqual(
        testCase.expectedSplineNub,
      );
      expect(resized.liquidData?.Liqd[1000]?.obj[0]?.hotSpotX).toBe(
        testCase.expectedLiquidHotSpotX,
      );
      expect(resized.liquidData?.Liqd[1000]?.obj[0]?.hotSpotZ).toBe(
        testCase.expectedLiquidHotSpotZ,
      );
      expect(resized.fenceData?.Fenc[1000]?.obj[0]?.bbLeft).toBe(
        testCase.expectedFenceBBoxLeft,
      );
      expect(resized.fenceData?.Fenc[1000]?.obj[0]?.bbTop).toBe(
        testCase.expectedFenceBBoxTop,
      );
      expect(resized.splineData?.Spln[1000]?.obj[0]?.bbLeft).toBe(
        testCase.expectedSplineBBoxLeft,
      );
      expect(resized.splineData?.Spln[1000]?.obj[0]?.bbTop).toBe(
        testCase.expectedSplineBBoxTop,
      );
      expect(resized.liquidData?.Liqd[1000]?.obj[0]?.bBoxLeft).toBe(
        testCase.expectedLiquidBBoxLeft,
      );
      expect(resized.liquidData?.Liqd[1000]?.obj[0]?.bBoxTop).toBe(
        testCase.expectedLiquidBBoxTop,
      );
    }
  });

  it("adjusts item, fence, spline, and liquid coordinates when top/left rows are removed", () => {
    const offset = -BugdomGlobals.TILE_INGAME_SIZE;
    const tileDelta = -BugdomGlobals.TILES_PER_SUPERTILE;

    const cases: {
      direction: "top" | "left";
      expectedItemX: number;
      expectedItemZ: number;
      expectedFenceNub: [number, number];
      expectedSplineNub: { x: number; z: number };
      expectedLiquidHotSpotX: number;
      expectedLiquidHotSpotZ: number;
    }[] = [
      {
        direction: "left",
        expectedItemX: 160 + offset,
        expectedItemZ: 224,
        expectedFenceNub: [50 + offset, 50],
        expectedSplineNub: { x: 200 + offset, z: 300 },
        expectedLiquidHotSpotX: 320 + offset,
        expectedLiquidHotSpotZ: 480,
      },
      {
        direction: "top",
        expectedItemX: 160,
        expectedItemZ: 224 + offset,
        expectedFenceNub: [50, 50 + offset],
        expectedSplineNub: { x: 200, z: 300 + offset },
        expectedLiquidHotSpotX: 320,
        expectedLiquidHotSpotZ: 480 + offset,
      },
    ];

    for (const testCase of cases) {
      const fixture = createAtomicFixture();
      const result = applySupertileResizeToAtomicData(fixture, BugdomGlobals, {
        direction: testCase.direction,
        tileCount: tileDelta,
        defaultHeight: 0,
      });

      expect(result.isOk()).toBe(true);
      if (result.isErr()) {
        continue;
      }

      const resized = result.value.data;
      expect(resized.itemData?.Itms[1000].obj[0]?.x).toBe(
        testCase.expectedItemX,
      );
      expect(resized.itemData?.Itms[1000].obj[0]?.z).toBe(
        testCase.expectedItemZ,
      );
      expect(resized.fenceData?.FnNb[1000]?.obj[0]).toEqual(
        testCase.expectedFenceNub,
      );
      expect(resized.splineData?.SpNb[1000]?.obj[0]).toEqual(
        testCase.expectedSplineNub,
      );
      expect(resized.liquidData?.Liqd[1000]?.obj[0]?.hotSpotX).toBe(
        testCase.expectedLiquidHotSpotX,
      );
      expect(resized.liquidData?.Liqd[1000]?.obj[0]?.hotSpotZ).toBe(
        testCase.expectedLiquidHotSpotZ,
      );
    }
  });

  it("filters item out-of-bounds warnings and removes items that fall outside the new bounds", () => {
    const fixture = createAtomicFixture();
    const firstItem = fixture.itemData?.Itms[1000].obj[0];
    // Remove one supertile (5 tiles) from the left. offsetXUnits = -160.
    // new item x = 100 - 160 = -60 → out of bounds → removed.
    if (firstItem) {
      firstItem.x = 100;
    }

    const result = applySupertileResizeToAtomicData(fixture, BugdomGlobals, {
      direction: "left",
      tileCount: -BugdomGlobals.TILES_PER_SUPERTILE,
      defaultHeight: 0,
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) {
      return;
    }

    // Warning should be filtered even though an item was removed
    expect(result.value.warnings).toEqual([]);
    // Item went out of bounds → removed from result
    expect(result.value.data.itemData?.Itms[1000].obj).toHaveLength(0);
  });
});
