import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "neverthrow";
import { NanosaurGlobals } from "@/data/globals/globals";
import { getTrtTextureUrl, openFile } from "@/editor/loadLogic/openFile";
import type { LevelData } from "@/python/structSpecs/LevelTypes";

vi.mock("sonner", () => ({
  toast: {
    loading: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/editor/loadLogic/parseLevelDataFile", () => ({
  parseLevelDataFile: vi.fn(),
}));

vi.mock("@/data/processors/classicProprocessor", () => ({
  parseNanosaurTerrainTextures: vi.fn(() => [new Uint16Array(32 * 32)]),
  createCanvasFromTile: vi.fn(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    return canvas;
  }),
}));

const { parseLevelDataFile } = await import("@/editor/loadLogic/parseLevelDataFile");
const { parseNanosaurTerrainTextures, createCanvasFromTile } = await import(
  "@/data/processors/classicProprocessor"
);

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
  YCrd: {
    1000: { name: "Floor&Ceiling Y Coords", obj: [], order: 0 },
  },
  alis: {},
  _metadata: {
    file_attributes: 0,
    junk1: 0,
    junk2: 0,
  },
} satisfies LevelData;

function createFetchResponse(bytes: Uint8Array) {
  const blobBytes = new Uint8Array(bytes.byteLength);
  blobBytes.set(bytes);
  return {
    ok: true,
    blob: async () => new Blob([blobBytes]),
  };
}

class TestFile extends Blob {
  name: string;

  constructor(parts: BlobPart[], name: string) {
    super(parts);
    this.name = name;
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    return await new Response(this).arrayBuffer();
  }
}

describe("openFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("File", TestFile);
    vi.mocked(parseLevelDataFile).mockResolvedValue(
      ok({
        levelData,
        mapImages: [],
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(createFetchResponse(new Uint8Array([1, 2, 3, 4])))
        .mockResolvedValueOnce(
          createFetchResponse(new Uint8Array([0, 0, 0, 1, 0, 1, 0, 2])),
        ),
    );
  });

  it("reuses Level1.trt for the Nanosaur extreme terrain", () => {
    expect(getTrtTextureUrl("assets/nanosaur/terrain/Level1Pro.ter")).toBe(
      "assets/nanosaur/terrain/Level1.trt",
    );
  });

  it("keeps standard terrain texture names unchanged", () => {
    expect(getTrtTextureUrl("assets/nanosaur/terrain/Level1.ter")).toBe(
      "assets/nanosaur/terrain/Level1.trt",
    );
  });

  it("loads and decodes the TRT companion file when opening Nanosaur levels", async () => {
    const setGlobals = vi.fn();
    const setMapFile = vi.fn();
    const setMapImagesFile = vi.fn();
    const setMapImages = vi.fn();
    const setData = vi.fn();

    await openFile({
      url: "assets/nanosaur/terrain/Level1Pro.ter",
      gameType: NanosaurGlobals,
      setGlobals,
      setMapFile,
      setMapImagesFile,
      setMapImages,
      setData,
    });

    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "assets/nanosaur/terrain/Level1Pro.ter",
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "assets/nanosaur/terrain/Level1.trt",
    );
    expect(parseLevelDataFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fileUrl: "assets/nanosaur/terrain/Level1Pro.ter",
        gameType: NanosaurGlobals,
      }),
    );
    expect(parseNanosaurTerrainTextures).toHaveBeenCalledTimes(1);
    expect(createCanvasFromTile).toHaveBeenCalledTimes(1);
    expect(setGlobals).toHaveBeenCalledWith(NanosaurGlobals);
    expect(setMapImagesFile).toHaveBeenCalledWith(expect.any(File));
    expect(setMapImages).toHaveBeenCalledWith([expect.any(HTMLCanvasElement)]);
    expect(setData).toHaveBeenCalledTimes(1);
  });
});
