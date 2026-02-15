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
          obj: [{ x: 160, z: 224, type: 1, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 }],
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
        1000: { obj: [{ flags: 0, p0: 0, p1: 0, p2: 0, p3: 0, placement: 0, type: 1 }], order: 0 },
      },
      Spln: {
        1000: {
          name: "Spline List",
          obj: [{ bbBottom: 0, bbLeft: 0, bbRight: 0, bbTop: 0, numItems: 1, numNubs: 1, numPoints: 1 }],
          order: 0,
        },
      },
    },
    terrainData: {
      Atrb: {
        1000: {
          name: "Tile Attribute Data",
          obj: new Array(100).fill(null).map(() => ({ flags: 0, p0: 0, p1: 0 })),
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
          obj: new Array(4).fill(null).map(() => ({ isEmpty: false, superTileId: 1 })),
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
  it("keeps item, fence, spline, and liquid coordinates unchanged for all resize directions", () => {
    const cases: {
      direction: "top" | "bottom" | "left" | "right";
      width: number;
      height: number;
    }[] = [
      { direction: "left", width: 15, height: 10 },
      { direction: "right", width: 15, height: 10 },
      { direction: "top", width: 10, height: 15 },
      { direction: "bottom", width: 10, height: 15 },
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
      expect(resized.headerData?.Hedr[1000].obj.mapHeight).toBe(testCase.height);
      expect(resized.terrainData?.Layr?.[1000].obj.length).toBe(
        testCase.width * testCase.height,
      );
      expect(resized.terrainData?.YCrd[1000].obj.length).toBe(
        (testCase.width + 1) * (testCase.height + 1),
      );
      expect(resized.itemData?.Itms[1000].obj[0]?.x).toBe(160);
      expect(resized.itemData?.Itms[1000].obj[0]?.z).toBe(224);
      expect(resized.fenceData?.FnNb[1000]?.obj[0]).toEqual([50, 50]);
      expect(resized.splineData?.SpNb[1000]?.obj[0]).toEqual({
        x: 200,
        z: 300,
      });
      expect(resized.liquidData?.Liqd[1000]?.obj[0]?.hotSpotX).toBe(320);
      expect(resized.liquidData?.Liqd[1000]?.obj[0]?.hotSpotZ).toBe(480);
    }
  });

  it("filters item out-of-bounds warnings while keeping item coordinates", () => {
    const fixture = createAtomicFixture();
    const firstItem = fixture.itemData?.Itms[1000].obj[0];
    if (firstItem) {
      firstItem.x = 224;
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

    expect(result.value.warnings).toEqual([]);
    expect(result.value.data.itemData?.Itms[1000].obj[0]?.x).toBe(224);
  });
});
