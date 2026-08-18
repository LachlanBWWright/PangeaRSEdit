import { describe, expect, it } from "vitest";
import {
  BugdomGlobals,
  DataType,
  Game,
  NanosaurGlobals,
  OttoGlobals,
} from "@/data/globals/globals";
import {
  preparePreviewLevelBytes,
  serializeLevelDownloadBytes,
} from "@/data/level-io/serializeLevelBytes";

function minimalLevelData(): Record<string, unknown> {
  return {
    Hedr: { 1000: { name: "Header", obj: {}, order: 0 } },
    _metadata: {},
    ItCo: {},
    YCrd: {},
    STgd: {},
  };
}

function tileImage(width = 32, height = 32): {
  width: number;
  height: number;
  rgbaBytes: ArrayBuffer;
} {
  return {
    width,
    height,
    rgbaBytes: new ArrayBuffer(width * height * 4),
  };
}

describe("level byte serialization boundaries", () => {
  it("rejects invalid level data before cloning or serialization", async () => {
    const serialized = await serializeLevelDownloadBytes({
      levelData: { notALevel: true },
      globals: OttoGlobals,
      fileName: "broken",
      mapImages: [],
    });
    const preview = await preparePreviewLevelBytes({
      levelData: null,
      globals: OttoGlobals,
      mapImages: [],
    });

    expect(serialized.isErr()).toBe(true);
    if (serialized.isErr()) {
      expect(serialized.error.code).toBe("serialize.failed");
    }
    expect(preview.isErr()).toBe(true);
    if (preview.isErr()) {
      expect(preview.error.code).toBe("preview.failed");
    }
  });

  it("reports missing original Nanosaur data instead of producing a partial file", async () => {
    const result = await serializeLevelDownloadBytes({
      levelData: minimalLevelData(),
      globals: NanosaurGlobals,
      fileName: "Level1",
      mapImages: [],
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("serialize.failed");
      expect(result.error.message).toContain("Missing original raw Nanosaur 1 data");
    }
  });

  it("validates Nanosaur tile dimensions before writing a .trt file", async () => {
    const result = await serializeLevelDownloadBytes({
      levelData: minimalLevelData(),
      globals: { ...NanosaurGlobals, GAME_TYPE: Game.BUGDOM },
      fileName: "Level1",
      mapImages: [tileImage(16, 16)],
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("serialize.failed");
      expect(result.error.message).toContain("must be 32x32");
    }
  });

  it("validates resource-fork map images before invoking the resource serializer", async () => {
    const result = await serializeLevelDownloadBytes({
      levelData: minimalLevelData(),
      globals: BugdomGlobals,
      fileName: "level",
      mapImages: [tileImage(1, 1)],
    });

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value[0]?.extension).toBe(".ter.rsrc");
    }
  });

  it("reports unsupported image serialization errors from preview generation", async () => {
    const globals = {
      ...OttoGlobals,
      DATA_TYPE: DataType.STANDARD,
    };
    const result = await preparePreviewLevelBytes({
      levelData: minimalLevelData(),
      globals,
      mapImages: [tileImage(1, 1)],
    });

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.code).toBe("preview.failed");
    }
  });
});
