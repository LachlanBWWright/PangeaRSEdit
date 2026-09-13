import { ok, okAsync } from "neverthrow";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createBlankLevel } from "@/data/levelTemplates";
import { OttoGlobals } from "@/data/globals/globals";
import { levelOutputCache } from "@/data/level-io/levelOutputCache";
import { combineLevelData } from "@/data/utils/levelDataUtils";
import {
  buildPreviewTerrainBlobs,
  saveMap,
} from "@/data/saveMap/saveMap";
import type { LevelIoImagePayload } from "@/data/level-io/levelIoTypes";
import {
  preparePreviewWithWorker,
  serializeDownloadWithWorker,
} from "@/data/level-io/levelIoWorkerClient";

const featureFlagState = vi.hoisted(() => ({ levelOutputCache: false }));

vi.mock("@/config/featureFlags", () => ({
  getFeatureFlags: vi.fn(() => ({
    levelOutputCache: featureFlagState.levelOutputCache,
    levelValidation: false,
  })),
  setFeatureFlags: vi.fn((flags: { levelOutputCache: boolean }) => {
    featureFlagState.levelOutputCache = flags.levelOutputCache;
    return ok(undefined);
  }),
}));

vi.mock("@/data/level-io/terrainImageSnapshots", () => ({
  snapshotCanvasImages: vi.fn(() =>
    ok<readonly LevelIoImagePayload[], string>([
      { width: 1, height: 1, rgbaBytes: new Uint8Array([1, 2, 3, 4]).buffer },
    ]),
  ),
}));

vi.mock("@/data/level-io/levelIoWorkerClient", () => ({
  preparePreviewWithWorker: vi.fn(),
  serializeDownloadWithWorker: vi.fn(),
}));

function blankOttoLevel() {
  const result = createBlankLevel(OttoGlobals.GAME_TYPE, {
    width: 64,
    height: 64,
  });
  return result.match(
    (value) => {
      const combined = combineLevelData(value);
      return combined.match(
        (level) => level,
        (error) => expect.fail(error),
      );
    },
    (error) => expect.fail(error),
  );
}

function enableCache(enabled: boolean): void {
  featureFlagState.levelOutputCache = enabled;
}

afterEach(() => {
  levelOutputCache.clear();
  enableCache(false);
  vi.clearAllMocks();
});

describe("save map output caching", () => {
  it("reuses preview output without invoking the worker again", async () => {
    enableCache(true);
    vi.mocked(preparePreviewWithWorker).mockReturnValue(
      okAsync({
        type: "prepared-preview",
        requestId: "preview-1",
        dataBytes: new Uint8Array([2]),
        rsrcBytes: new Uint8Array([1]),
        textureBytes: null,
      }),
    );

    const first = await buildPreviewTerrainBlobs(
      blankOttoLevel(),
      OttoGlobals,
      [document.createElement("canvas")],
    );
    const second = await buildPreviewTerrainBlobs(
      blankOttoLevel(),
      OttoGlobals,
      [document.createElement("canvas")],
    );

    expect(first).toEqual({
      dataBytes: new Uint8Array([2]),
      rsrcBytes: new Uint8Array([1]),
      textureBytes: null,
    });
    expect(second).toEqual(first);
    expect(preparePreviewWithWorker).toHaveBeenCalledTimes(1);
  });

  it("reuses download files without invoking serialization again", async () => {
    enableCache(true);
    vi.mocked(serializeDownloadWithWorker).mockReturnValue(
      okAsync({
        type: "serialized-download",
        requestId: "download-1",
        files: [
          { filename: "EarthFarm.ter.rsrc", extension: ".ter.rsrc", bytes: new Uint8Array([1]) },
          { filename: "EarthFarm.ter", extension: ".ter", bytes: new Uint8Array([2]) },
        ],
      }),
    );
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);
    const toast = vi.fn();
    const mapFile = new File([new Uint8Array([0])], "EarthFarm.ter");

    await saveMap({
      mapFile,
      mapImagesFile: undefined,
      mapImages: [document.createElement("canvas")],
      data: blankOttoLevel(),
      globals: OttoGlobals,
      toast,
    });
    await saveMap({
      mapFile,
      mapImagesFile: undefined,
      mapImages: [document.createElement("canvas")],
      data: blankOttoLevel(),
      globals: OttoGlobals,
      toast,
    });

    expect(serializeDownloadWithWorker).toHaveBeenCalledTimes(1);
    expect(toast).toHaveBeenLastCalledWith({ title: "Map Downloaded!" });
  });

  it("keeps the worker path when the cache flag is disabled", async () => {
    enableCache(false);
    vi.mocked(preparePreviewWithWorker).mockReturnValue(
      okAsync({
        type: "prepared-preview",
        requestId: "preview-1",
        dataBytes: null,
        rsrcBytes: new Uint8Array([1]),
        textureBytes: null,
      }),
    );

    await buildPreviewTerrainBlobs(
      blankOttoLevel(),
      OttoGlobals,
      [document.createElement("canvas")],
    );
    await buildPreviewTerrainBlobs(
      blankOttoLevel(),
      OttoGlobals,
      [document.createElement("canvas")],
    );

    expect(preparePreviewWithWorker).toHaveBeenCalledTimes(2);
  });
});
