import { describe, expect, it } from "vitest";
import type { TerrainData } from "@/python/structSpecs/LevelTypes";
import { plainObjectSchema, unknownArraySchema } from "@/schemas/common";
import {
  setMightyMikeCollisionProperty,
  setMightyMikeTileLogicalIndex,
  syncMightyMikeTileValuesFromLayer,
} from "@/data/game/mightyMikeTileValueUtils";
import { applyTileBrush } from "@/data/tileBrushes/tileBrushApply";

function createTerrainData(): TerrainData {
  return {
    Atrb: {
      1000: {
        name: "Tile Attribute Data",
        obj: [],
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
        obj: [5, 6, 7, 8],
        order: 0,
      },
    },
    YCrd: {
      1000: {
        name: "Floor&Ceiling Y Coords",
        obj: [0, 0, 0, 0],
        order: 0,
      },
    },
    alis: {},
    _metadata: {
      file_attributes: 0,
      junk1: 0,
      junk2: 0,
      1000: {
        name: "Metadata",
        obj: {
          mightyMikeTileValues: [
            {
              rawValue: 0x8005,
              tileIndex: 5,
              hasCollisionMask: true,
              usePixelAccurateCollision: false,
            },
            {
              rawValue: 0x4006,
              tileIndex: 6,
              hasCollisionMask: false,
              usePixelAccurateCollision: true,
            },
            {
              rawValue: 7,
              tileIndex: 7,
              hasCollisionMask: false,
              usePixelAccurateCollision: false,
            },
            {
              rawValue: 8,
              tileIndex: 8,
              hasCollisionMask: false,
              usePixelAccurateCollision: false,
            },
          ],
        },
        order: 0,
      },
    },
  };
}

function getMightyMikeTileValues(terrainData: TerrainData): unknown[] {
  const entryResult = plainObjectSchema.safeParse(terrainData._metadata[1000]);
  if (!entryResult.success) {
    return [];
  }
  const objectResult = plainObjectSchema.safeParse(entryResult.data.obj);
  if (!objectResult.success) {
    return [];
  }
  const tileValuesResult = unknownArraySchema.safeParse(
    objectResult.data.mightyMikeTileValues,
  );
  return tileValuesResult.success ? tileValuesResult.data : [];
}

describe("mightyMikeTileValueUtils", () => {
  it("preserves collision bits when changing a tile image", () => {
    const terrainData = createTerrainData();

    setMightyMikeTileLogicalIndex(terrainData, 0, 42);

    expect(terrainData.Layr?.[1000]?.obj[0]).toBe(42);
    expect(getMightyMikeTileValues(terrainData)[0]).toMatchObject({
      rawValue: 0x802a,
      tileIndex: 42,
      hasCollisionMask: true,
      usePixelAccurateCollision: false,
    });
  });

  it("rewrites rawValue when collision settings change", () => {
    const terrainData = createTerrainData();

    setMightyMikeCollisionProperty(
      terrainData,
      1,
      "hasCollisionMask",
      true,
    );

    expect(getMightyMikeTileValues(terrainData)[1]).toMatchObject({
      rawValue: 0xc006,
      tileIndex: 6,
      hasCollisionMask: true,
      usePixelAccurateCollision: true,
    });
  });

  it("keeps Mighty Mike metadata in sync when stamping brushes", () => {
    const terrainData = createTerrainData();

    applyTileBrush({
      draft: terrainData,
      layer: 1000,
      mapWidth: 2,
      mapHeight: 2,
      targetX: 0,
      targetY: 1,
      anchor: "topLeft",
      brush: {
        id: "brush-1",
        name: "Brush 1",
        game: "mightymike",
        width: 2,
        height: 1,
        cells: [
          { tileValue: 20, enabled: true },
          { tileValue: 21, enabled: true },
        ],
      },
    });

    expect(terrainData.Layr?.[1000]?.obj).toEqual([5, 6, 20, 21]);
    const tileValues = getMightyMikeTileValues(terrainData);
    expect(tileValues[2]).toMatchObject({
      rawValue: 20,
      tileIndex: 20,
      hasCollisionMask: false,
      usePixelAccurateCollision: false,
    });
    expect(tileValues[3]).toMatchObject({
      rawValue: 21,
      tileIndex: 21,
      hasCollisionMask: false,
      usePixelAccurateCollision: false,
    });
  });

  it("rebuilds raw values after a full logical-index remap", () => {
    const terrainData = createTerrainData();
    if (terrainData.Layr?.[1000]?.obj) {
      terrainData.Layr[1000].obj = [1, 0, 3, 2];
    }

    syncMightyMikeTileValuesFromLayer(terrainData);

    const tileValues = getMightyMikeTileValues(terrainData);
    expect(tileValues[0]).toMatchObject({
      rawValue: 0x8001,
      tileIndex: 1,
      hasCollisionMask: true,
      usePixelAccurateCollision: false,
    });
    expect(tileValues[1]).toMatchObject({
      rawValue: 0x4000,
      tileIndex: 0,
      hasCollisionMask: false,
      usePixelAccurateCollision: true,
    });
  });
});
