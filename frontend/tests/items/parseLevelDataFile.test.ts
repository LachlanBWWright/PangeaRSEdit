import { beforeEach, describe, expect, it, vi } from "vitest";
import { ok } from "neverthrow";
import { MightyMikeGlobals, OttoGlobals } from "@/data/globals/globals";
import { gMightyMikePalette } from "@/utils/mightyMikePalette";
import { parseLevelDataFile } from "@/editor/loadLogic/parseLevelDataFile";
import { clearItemImageCache } from "@/utils/mightyMikeShapeImageLoader";

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
  Hedr: { 1000: { obj: { mapWidth: 1, mapHeight: 1 } } },
  STgd: { 1000: { obj: [] } },
  ItCo: { 1000: { obj: [] } },
  YCrd: { 1000: { obj: [] } },
  _metadata: {},
};

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
});
