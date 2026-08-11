import { describe, expect, it } from "vitest";
import { regenerateDerivedLevelData } from "@/data/saveMap/regenerateDerivedLevelData";
import type { LevelData } from "@/python/structSpecs/LevelTypes";

function makeLevel(): LevelData {
  return {
    Hedr: { 1000: { name: "Header", order: 0, obj: {
      version: 1, numItems: 99, mapWidth: 8, mapHeight: 8,
      numTilePages: 1, numTiles: 1, tileSize: 16, minY: 0, maxY: 1,
      numSplines: 99, numFences: 99, numUniqueSupertiles: 1,
      numWaterPatches: 99, numCheckpoints: 99,
    } } },
    Atrb: { 1000: { name: "Tile Attribute Data", obj: [], order: 0 } },
    ItCo: { 1000: { name: "Terrain Items Color Array", data: "", order: 0 } },
    YCrd: { 1000: { name: "Floor&Ceiling Y Coords", obj: [], order: 0 } },
    STgd: { 1000: { name: "SuperTile Grid", obj: [], order: 0 } },
    alis: {},
    _metadata: { file_attributes: 0, junk1: 0, junk2: 0 },
    Itms: { 1000: { name: "Terrain Items List", obj: [], order: 0 } },
    Fenc: { 1000: { name: "Fence List", order: 0, obj: [{
      fenceType: 0, numNubs: 0, junkNubListPtr: 0,
      bbTop: 0, bbLeft: 0, bbBottom: 0, bbRight: 0,
    }] } },
    FnNb: { 1000: { name: "Fence Nub List", order: 0, obj: [[5, 9], [1, 3]] } },
  };
}

describe("regenerateDerivedLevelData", () => {
  it("synchronizes header counts and fence bounds", () => {
    const level = makeLevel();
    regenerateDerivedLevelData(level);
    expect(level.Hedr[1000].obj).toMatchObject({
      numItems: 0, numSplines: 0, numFences: 1,
      numWaterPatches: 0, numCheckpoints: 0,
    });
    expect(level.Fenc?.[1000].obj[0]).toMatchObject({
      numNubs: 2, bbLeft: 1, bbRight: 5, bbTop: 3, bbBottom: 9,
    });
  });
});
