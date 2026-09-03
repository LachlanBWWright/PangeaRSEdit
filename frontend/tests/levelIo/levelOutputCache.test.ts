import { describe, expect, it } from "vitest";
import {
  BillyFrontierGlobals,
  Bugdom2Globals,
  BugdomGlobals,
  CroMagGlobals,
  MightyMikeGlobals,
  Nanosaur2Globals,
  NanosaurGlobals,
  OttoGlobals,
} from "@/data/globals/globals";
import {
  LevelOutputCache,
  getLevelOutputCacheKeys,
  getCachedPreviewArtifacts,
  getCachedDownloadFiles,
} from "@/data/level-io/levelOutputCache";

function levelData(): Record<string, unknown> {
  return { Hedr: { 1000: { obj: { mapWidth: 1 } } } };
}

function image(byte = 0): {
  width: number;
  height: number;
  rgbaBytes: ArrayBuffer;
} {
  const bytes = new Uint8Array([byte, 0, 0, 255]);
  return { width: 1, height: 1, rgbaBytes: bytes.buffer };
}

describe("level output cache identities", () => {
  it.each([
    ["Otto Matic", OttoGlobals],
    ["Bugdom", BugdomGlobals],
    ["Bugdom 2", Bugdom2Globals],
    ["Nanosaur", NanosaurGlobals],
    ["Nanosaur 2", Nanosaur2Globals],
    ["Cro-Mag Rally", CroMagGlobals],
    ["Billy Frontier", BillyFrontierGlobals],
    ["Mighty Mike", MightyMikeGlobals],
  ])("classifies %s with stable keys", (_name, globals) => {
    const first = getLevelOutputCacheKeys(levelData(), globals, [image()]);
    const second = getLevelOutputCacheKeys(levelData(), globals, [image()]);
    expect(second).toEqual(first);
  });

  it("keeps standard level and texture identities independent", () => {
    const original = getLevelOutputCacheKeys(levelData(), OttoGlobals, [image()]);
    const changedLevel = getLevelOutputCacheKeys(
      { ...levelData(), changed: true },
      OttoGlobals,
      [image()],
    );
    const changedTexture = getLevelOutputCacheKeys(
      levelData(),
      OttoGlobals,
      [image(1)],
    );

    expect(changedLevel.level).not.toBe(original.level);
    expect(changedLevel.texture).toBe(original.texture);
    expect(changedTexture.level).toBe(original.level);
    expect(changedTexture.texture).not.toBe(original.texture);
  });

  it("uses one combined identity for Bugdom and Mighty Mike tilesets", () => {
    const bugdom = getLevelOutputCacheKeys(levelData(), BugdomGlobals, [image()]);
    const mightyMike = getLevelOutputCacheKeys(levelData(), MightyMikeGlobals, [image()]);
    expect(bugdom.level).toBe(bugdom.combined);
    expect(bugdom.texture).toBe(bugdom.combined);
    expect(mightyMike.level).not.toBe(mightyMike.texture);
    expect(mightyMike.texture).toBe(mightyMike.combined);
  });
});

describe("level output cache storage", () => {
  it("returns cloned bytes", () => {
    const cache = new LevelOutputCache();
    const original = new Uint8Array([1, 2, 3]);
    cache.set("one", original);
    original[0] = 9;
    const firstRead = cache.get("one");
    expect(firstRead).toEqual(new Uint8Array([1, 2, 3]));
    if (firstRead) firstRead[0] = 8;
    expect(cache.get("one")).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("builds a complete preview from cached artifacts", () => {
    const keys = getLevelOutputCacheKeys(levelData(), OttoGlobals, [image()]);
    const cache = new LevelOutputCache();
    cache.set(keys.level, new Uint8Array([1]));
    cache.set(keys.texture, new Uint8Array([2]));
    const reuse = {
      reuseLevelBytes: cache.get(keys.level) ?? undefined,
      reuseTextureBytes: cache.get(keys.texture) ?? undefined,
    };
    const preview = getCachedPreviewArtifacts(OttoGlobals, reuse, true);
    expect(preview?.rsrcBytes).toEqual(new Uint8Array([1]));
    expect(preview?.dataBytes).toEqual(new Uint8Array([2]));
  });

  it("builds download files without invoking serialization when all artifacts hit", () => {
    const keys = getLevelOutputCacheKeys(levelData(), OttoGlobals, [image()]);
    const cache = new LevelOutputCache();
    cache.set(keys.level, new Uint8Array([1]));
    cache.set(keys.texture, new Uint8Array([2]));
    const files = getCachedDownloadFiles(
      OttoGlobals,
      {
        reuseLevelBytes: cache.get(keys.level) ?? undefined,
        reuseTextureBytes: cache.get(keys.texture) ?? undefined,
      },
      "EarthFarm",
      "EarthFarm",
      true,
    );
    expect(files?.map((file) => file.extension)).toEqual([".ter.rsrc", ".ter"]);
    expect(files?.map((file) => Array.from(file.bytes))).toEqual([[1], [2]]);
  });
});
