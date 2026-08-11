import { describe, expect, it } from "vitest";
import type { TerrainData } from "@/python/structSpecs/LevelTypes";
import {
  decodeBugdomVertexColors,
  packRgb565,
  paintBugdomVertexColors,
  unpackRgb565,
} from "@/data/terrain/bugdomVertexColors";

function terrainWithColors(data: string): TerrainData {
  return {
    Atrb: { 1000: { name: "Tile Attribute Data", obj: [], order: 0 } },
    ItCo: { 1000: { name: "Terrain Items Color Array", data: "", order: 0 } },
    YCrd: { 1000: { name: "Floor&Ceiling Y Coords", obj: [], order: 0 } },
    Vcol: {
      1000: { name: "Floor&Ceiling Vertex Colors", data, order: 0 },
    },
    alis: {},
    _metadata: { file_attributes: 0, junk1: 0, junk2: 0 },
  };
}

describe("Bugdom terrain vertex colors", () => {
  it("decodes big-endian RGB565 using the game's channel scaling", () => {
    const result = decodeBugdomVertexColors("f80007e0001fffff", 4);

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value).toEqual([
      { r: 31 / 32, g: 0, b: 0 },
      { r: 0, g: 63 / 64, b: 0 },
      { r: 0, g: 0, b: 31 / 32 },
      { r: 31 / 32, g: 63 / 64, b: 31 / 32 },
    ]);
  });

  it("rejects malformed and incorrectly sized resources", () => {
    expect(decodeBugdomVertexColors("zzzz", 1).isErr()).toBe(true);
    expect(decodeBugdomVertexColors("ffff", 2).isErr()).toBe(true);
  });

  it("packs colors into RGB565", () => {
    expect(packRgb565({ r: 1, g: 0, b: 0 })).toBe(0xf800);
    expect(unpackRgb565(0x07e0)).toEqual({ r: 0, g: 63 / 64, b: 0 });
  });

  it("paints a circular vertex brush and preserves other vertices", () => {
    const result = paintBugdomVertexColors({
      terrainData: terrainWithColors("000000000000000000000000000000000000"),
      layerKey: 1000,
      mapWidth: 2,
      mapHeight: 2,
      centerColumn: 1,
      centerRow: 1,
      radius: 0,
      color: { r: 1, g: 1, b: 1 },
    });

    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value).toBe("0000000000000000ffff0000000000000000");
  });
});
