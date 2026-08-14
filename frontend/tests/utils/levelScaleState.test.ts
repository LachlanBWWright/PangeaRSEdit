import { describe, expect, it } from "vitest";
import {
  getPreservedPositionFactor,
  scaleFenceCoordinates,
  scaleItemCoordinates,
  scaleTerrainFeatureCoordinates,
  supportsLevelScale,
} from "@/editor/utils/levelScaleState";
import type { FenceData, ItemData, TerrainData } from "@/python/structSpecs/LevelTypes";
import { Game } from "@/data/globals/globals";

describe("level scale state", () => {
  it("only exposes scale for formats that persist tileSize", () => {
    expect(supportsLevelScale(Game.BUGDOM)).toBe(true);
    expect(supportsLevelScale(Game.OTTO_MATIC)).toBe(true);
    expect(supportsLevelScale(Game.BUGDOM_2)).toBe(true);
    expect(supportsLevelScale(Game.NANOSAUR_2)).toBe(true);
    expect(supportsLevelScale(Game.CRO_MAG)).toBe(true);
    expect(supportsLevelScale(Game.BILLY_FRONTIER)).toBe(true);
    expect(supportsLevelScale(Game.NANOSAUR)).toBe(false);
    expect(supportsLevelScale(Game.MIGHTY_MIKE)).toBe(false);
  });

  it("calculates the inverse coordinate factor for preserved positions", () => {
    expect(getPreservedPositionFactor(32, 64)).toBe(0.5);
    expect(getPreservedPositionFactor(0, 64)).toBeNull();
  });

  it("rescales integer item and fence coordinates", () => {
    const items: ItemData = {
      Itms: {
        1000: {
          name: "Terrain Items List",
          obj: [{ x: 101, z: 50, type: 1, flags: 0, p0: 0, p1: 0, p2: 0, p3: 0 }],
          order: 0,
        },
      },
    };
    const fences: FenceData = {
      Fenc: { 1000: { name: "Fence List", obj: [], order: 0 } },
      FnNb: { 1000: { name: "Fence Nub List", obj: [[101, 50]], order: 0 } },
    };

    scaleItemCoordinates(items, 0.5);
    scaleFenceCoordinates(fences, 0.5);

    expect(items.Itms[1000].obj[0]).toMatchObject({ x: 51, z: 25 });
    expect(fences.FnNb[1000]?.obj[0]).toEqual([51, 25]);
  });

  it("rescales checkpoint and path coordinates", () => {
    const terrain: TerrainData = {
      Atrb: { 1000: { name: "Tile Attribute Data", obj: [], order: 0 } },
      ItCo: { 1000: { name: "Terrain Items Color Array", data: "", order: 0 } },
      YCrd: { 1000: { name: "Floor&Ceiling Y Coords", obj: [], order: 0 } },
      alis: {},
      _metadata: { file_attributes: 0, junk1: 0, junk2: 0 },
      CkPt: { 1000: { name: "Checkpoint List", obj: [{ unused: 0, infoBits: 0, x1: 10, x2: 20, z1: 30, z2: 40 }], order: 0 } },
      PaPt: { 1000: { name: "Path Point List", obj: [{ x: 50, z: 60 }], order: 0 } },
    };

    scaleTerrainFeatureCoordinates(terrain, 2);

    expect(terrain.CkPt?.[1000]?.obj[0]).toMatchObject({ x1: 20, x2: 40, z1: 60, z2: 80 });
    expect(terrain.PaPt?.[1000]?.obj[0]).toEqual({ x: 100, z: 120 });
  });
});
