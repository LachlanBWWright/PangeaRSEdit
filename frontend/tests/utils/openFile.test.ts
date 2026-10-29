import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok, okAsync } from "neverthrow";
import { NanosaurGlobals } from "@/data/globals/globals";
import { getTrtTextureUrl, openFile } from "@/editor/loadLogic/openFile";
import type { LevelData } from "@/python/structSpecs/LevelTypes";
import { resetAssets } from "@/assets/assetState";

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

vi.mock("@/data/level-io/nanosaurTerrainWorkerClient", () => ({
  parseNanosaurTerrainWithWorker: vi.fn(() =>
    Promise.resolve(
      ok([
        {
          width: 32,
          height: 32,
          rgbaBytes: new ArrayBuffer(32 * 32 * 4),
        },
      ]),
    ),
  ),
}));

const { parseLevelDataFile } = await import("@/editor/loadLogic/parseLevelDataFile");
const { parseNanosaurTerrainWithWorker } = await import(
  "@/data/level-io/nanosaurTerrainWorkerClient"
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
  return new Response(blobBytes);
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
  it("keeps the current level untouched when its texture companion is missing", async () => {
    const setGlobals = vi.fn();
    const setMapFile = vi.fn();
    const setData = vi.fn();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(createFetchResponse(new Uint8Array([1])))
      .mockResolvedValueOnce(new Response(null, { status: 404 })));
    await openFile({ url: "assets/nanosaur/terrain/Level1.ter", gameType: NanosaurGlobals,
      setGlobals, setMapFile, setData, setMapImages: vi.fn(), setMapImagesFile: vi.fn() });
    expect(setGlobals).not.toHaveBeenCalled();
    expect(setMapFile).not.toHaveBeenCalled();
    expect(setData).not.toHaveBeenCalled();
  });

  it("discards an in-flight level load after its asset source changes", async () => {
    const setData = vi.fn();
    vi.mocked(parseNanosaurTerrainWithWorker).mockImplementationOnce(() => {
      resetAssets();
      return okAsync([{ width: 32, height: 32, rgbaBytes: new ArrayBuffer(32 * 32 * 4) }]);
    });
    await openFile({ url: "assets/nanosaur/terrain/Level1.ter", gameType: NanosaurGlobals,
      setGlobals: vi.fn(), setMapFile: vi.fn(), setData, setMapImages: vi.fn(), setMapImagesFile: vi.fn() });
    expect(setData).not.toHaveBeenCalled();
  });
  beforeEach(() => {
    resetAssets();
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
      expect.stringMatching(/^assets\/nanosaur\/terrain\/Level1Pro\.ter\?assetRevision=\d+$/),
      { cache: "no-store" },
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      expect.stringMatching(/^assets\/nanosaur\/terrain\/Level1\.trt\?assetRevision=\d+$/),
      { cache: "no-store" },
    );
    expect(parseLevelDataFile).toHaveBeenCalledWith(
      expect.objectContaining({
        fileUrl: "assets/nanosaur/terrain/Level1Pro.ter",
        gameType: NanosaurGlobals,
      }),
    );
    expect(parseNanosaurTerrainWithWorker).toHaveBeenCalledTimes(1);
    expect(setGlobals).toHaveBeenCalledWith(NanosaurGlobals);
    expect(setMapImagesFile).toHaveBeenCalledWith(expect.any(File));
    expect(setMapImages).toHaveBeenCalledWith([expect.any(HTMLCanvasElement)]);
    expect(setData).toHaveBeenCalledTimes(1);
  });
});
