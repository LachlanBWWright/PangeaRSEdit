import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "neverthrow";
import {
  MightyMikeGlobals,
  NanosaurGlobals,
  OttoGlobals,
} from "@/data/globals/globals";
import type { LevelData } from "@/python/structSpecs/LevelTypes";
import { gMightyMikePalette } from "@/utils/mightyMikePalette";
import { parseLevelDataFile } from "@/editor/loadLogic/parseLevelDataFile";
import { clearItemImageCache } from "@/utils/mightyMikeShapeImageLoader";
import { isRecord } from "@/editor/loadLogic/typeGuards";

vi.mock("@/data/level-io/levelIoWorkerClient", () => ({
  parseLevelWithWorker: vi.fn(),
}));

vi.mock("@/data/level-io/terrainImageSnapshots", () => ({
  imagePayloadsToCanvases: vi.fn(() => ok([])),
}));

vi.mock("@/editor/loadLogic/mightyMikeParseHelpers", () => ({
  loadBorderPalette: vi.fn(async () => new Uint8Array([1, 2, 3, 4])),
  getMightyMikeSceneFromPath: vi.fn(() => "jurassic"),
}));

vi.mock("@/utils/mightyMikePalette", () => ({
  gMightyMikePalette: {
    loadPaletteFromRGBA: vi.fn(),
  },
}));

vi.mock("@/utils/mightyMikeShapeImageLoader", () => ({
  clearItemImageCache: vi.fn(),
}));

const { parseLevelWithWorker } = await import("@/data/level-io/levelIoWorkerClient");

const levelData = {
  Atrb: { 1000: { name: "Tile Attribute Data", obj: [], order: 0 } },
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
        maxY: 0,
        numSplines: 0,
        numFences: 0,
        numTilePages: 0,
        numTiles: 0,
        numUniqueSupertiles: 0,
        numWaterPatches: 0,
        numCheckpoints: 0,
      },
      order: 0,
    },
  },
  STgd: { 1000: { name: "SuperTile Grid", obj: [], order: 0 } },
  ItCo: { 1000: { name: "Terrain Items Color Array", data: "", order: 0 } },
  YCrd: { 1000: { name: "Floor&Ceiling Y Coords", obj: [], order: 0 } },
  alis: {},
  _metadata: {
    file_attributes: 0,
    junk1: 0,
    junk2: 0,
  },
} satisfies LevelData;

class TestBlob extends Blob {
  async arrayBuffer(): Promise<ArrayBuffer> {
    return new Uint8Array([0, 1, 2, 3]).buffer;
  }
}

describe("parseLevelDataFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(parseLevelWithWorker).mockResolvedValue(
      ok({
        requestId: "parse-level-1",
        type: "parsed-level",
        levelData,
        mapImages: [],
        collisionImages: [],
      }),
    );
  });

  it("reloads the Mighty Mike palette and clears the sprite cache", async () => {
    const file = new TestBlob();
    const result = await parseLevelDataFile({
      file,
      gameType: MightyMikeGlobals,
      fileUrl: "https://example.test/jurassic.map-1",
    });

    expect(result.isOk()).toBe(true);
    expect(gMightyMikePalette.loadPaletteFromRGBA).toHaveBeenCalledWith(
      new Uint8Array([1, 2, 3, 4]),
    );
    expect(clearItemImageCache).toHaveBeenCalledTimes(1);
  });

  it("does not touch the Mighty Mike palette for other games", async () => {
    const file = new TestBlob();
    const result = await parseLevelDataFile({
      file,
      gameType: OttoGlobals,
    });

    expect(result.isOk()).toBe(true);
    expect(gMightyMikePalette.loadPaletteFromRGBA).not.toHaveBeenCalled();
    expect(clearItemImageCache).not.toHaveBeenCalled();
  });

  it("parses Nanosaur levels with the worker and keeps raw bytes for save roundtrips", async () => {
    const nanosaurRawBytes = new Uint8Array([9, 8, 7, 6]).buffer;
    vi.mocked(parseLevelWithWorker).mockResolvedValueOnce(
      ok({
        requestId: "parse-level-2",
        type: "parsed-level",
        levelData,
        mapImages: [],
        collisionImages: [],
        nanosaurRawBytes,
      }),
    );
    const file = new TestBlob();
    const result = await parseLevelDataFile({
      file,
      gameType: NanosaurGlobals,
      fileUrl: "https://example.test/Level1.ter",
    });

    expect(result.isOk()).toBe(true);
    expect(parseLevelWithWorker).toHaveBeenCalledWith(
      expect.objectContaining({
        globals: NanosaurGlobals,
      }),
      undefined,
    );
    if (result.isOk()) {
      expect(isRecord(result.value.levelData._metadata)).toBe(true);
      if (isRecord(result.value.levelData._metadata)) {
        expect(result.value.levelData._metadata.nanosaur1RawBytes).toBe(
          nanosaurRawBytes,
        );
      }
    }
  });
});
