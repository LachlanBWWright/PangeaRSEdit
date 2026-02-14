import { describe, expect, it, vi } from "vitest";
import { prepareDownloadData } from "./introPromptUtils";
import { BugdomGlobals } from "@/data/globals/globals";
import type { LevelData } from "@/python/structSpecs/LevelTypes";

vi.mock("../../data/processors/ottoPreprocessor", () => ({
  ottoPreprocessor: vi.fn(),
}));

describe("prepareDownloadData", () => {
  it("sanitizes non-cloneable tileset image data before cloning", () => {
    const sample: LevelData = {
      Hedr: {
        1000: {
          name: "Header",
          obj: {
            version: 1,
            numItems: 0,
            mapWidth: 1,
            mapHeight: 1,
            tileSize: 32,
            minY: 0,
            maxY: 100,
            numSplines: 0,
            numFences: 0,
            numTilePages: 1,
            numTiles: 1,
            numUniqueSupertiles: 1,
            numWaterPatches: 0,
            numCheckpoints: 0,
          },
          order: 0,
        },
      },
      Atrb: { 1000: { name: "Tile Attribute Data", obj: [], order: 0 } },
      ItCo: { 1000: { name: "Terrain Items Color Array", data: "", order: 0 } },
      STgd: { 1000: { name: "SuperTile Grid", obj: [], order: 0 } },
      YCrd: { 1000: { name: "Floor&Ceiling Y Coords", obj: [], order: 0 } },
      _metadata: { file_attributes: 0, junk1: 0, junk2: 0 },
    };
    Reflect.set(sample, "tileset", {
      tileImages: [{ getContext: () => null }],
      numTileDefinitions: 1,
    });

    expect(() => prepareDownloadData(sample, BugdomGlobals)).not.toThrow();
  });
});
