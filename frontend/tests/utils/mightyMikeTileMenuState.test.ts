import { describe, expect, test } from "vitest";
import {
  ensureUniqueTileAttributeIndex,
  updateTileAttributeForSelectedTile,
} from "@/editor/subviews/mightymike/mightyMikeTileMenuState";
import type { TerrainData } from "@/python/structSpecs/LevelTypes";

function createTerrainData(): TerrainData {
  return {
    Atrb: {
      1000: {
        name: "Tile Attribute Data",
        obj: [
          { flags: 1, p0: 10, p1: 11 },
          { flags: 2, p0: 20, p1: 21 },
        ],
        order: 6,
      },
    },
    Xlat: {
      1000: {
        name: "Tile Index Translation Table",
        obj: [{ idx: 4 }, { idx: 7 }],
        order: 7,
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
        obj: [0, 0, 1],
        order: 1,
      },
    },
    YCrd: {
      1000: {
        name: "Floor&Ceiling Y Coords",
        obj: [0, 0, 0],
        order: 2,
      },
    },
    alis: {
      1000: {
        name: "Texture Page Picture Alias",
        data: "",
        order: 3,
      },
    },
    _metadata: {
      file_attributes: 0,
      junk1: 0,
      junk2: 0,
      1000: {
        obj: {
          mightyMikeTileValues: [
            {
              rawValue: 0,
              tileIndex: 0,
              hasCollisionMask: false,
              usePixelAccurateCollision: false,
            },
            {
              rawValue: 0,
              tileIndex: 0,
              hasCollisionMask: false,
              usePixelAccurateCollision: false,
            },
            {
              rawValue: 0,
              tileIndex: 1,
              hasCollisionMask: false,
              usePixelAccurateCollision: false,
            },
          ],
        },
      },
    },
    tileset: {
      tileAttributes: [
        { flags: 1, p0: 10, p1: 11, p2: 0, p3: 0, p4: 0 },
        { flags: 2, p0: 20, p1: 21, p2: 0, p3: 0, p4: 0 },
      ],
      xlateTable: [4, 7],
    },
  };
}

describe("Mighty Mike tile attribute editing", () => {
  test("splits a shared logical tile before editing behavior", () => {
    const terrainData = createTerrainData();

    const nextIndex = ensureUniqueTileAttributeIndex(terrainData, 0);

    expect(nextIndex).toBe(2);
    expect(terrainData.Layr?.[1000]?.obj).toEqual([2, 0, 1]);
    expect(terrainData.Xlat?.[1000]?.obj[2]).toEqual({ idx: 4 });
    expect(terrainData._metadata[1000]).toEqual(
      expect.objectContaining({
        obj: expect.objectContaining({
          mightyMikeTileValues: expect.arrayContaining([
            expect.objectContaining({ tileIndex: 2 }),
          ]),
        }),
      }),
    );
  });

  test("updates only the touched tile after splitting a shared entry", () => {
    const terrainData = createTerrainData();

    updateTileAttributeForSelectedTile(terrainData, 0, "flags", 9);

    expect(terrainData.Layr?.[1000]?.obj).toEqual([2, 0, 1]);
    expect(terrainData.Atrb[1000].obj[0]).toEqual({ flags: 1, p0: 10, p1: 11 });
    expect(terrainData.Atrb[1000].obj[2]).toEqual(
      expect.objectContaining({ flags: 9, p0: 10, p1: 11 }),
    );
    expect(terrainData.tileset).toEqual(
      expect.objectContaining({
        tileAttributes: expect.arrayContaining([
          expect.objectContaining({ flags: 9, p0: 10, p1: 11 }),
        ]),
      }),
    );
  });
});
