import { describe, expect, it } from "vitest";
import { Game } from "@/data/globals/globals";
import {
  buildItemScreenshotVariantKey,
  findBestItemScreenshot,
  parseItemScreenshotManifest,
} from "@/data/items/itemScreenshotManifest";

describe("itemScreenshotManifest", () => {
  it("builds deterministic exact variant keys", () => {
    expect(
      buildItemScreenshotVariantKey({
        levelNum: 3,
        params: { p0: 2, p1: 0, p2: 1 },
      }),
    ).toBe("level=3,p0=2,p2=1");
  });

  it("falls back to default when no variant inputs are present", () => {
    expect(buildItemScreenshotVariantKey({})).toBe("default");
  });

  it("prefers exact matches before the default screenshot", () => {
    const manifestResult = parseItemScreenshotManifest([
      {
        game: Game.BUGDOM,
        kind: "terrainItem",
        itemType: 10,
        variantKey: "default",
        imageUrl: "/default.png",
        width: 64,
        height: 64,
        generatedFrom: {
          modelFile: "Global_Models1.3dmf",
          modelIndex: 7,
        },
        verificationStatus: "approximate",
      },
      {
        game: Game.BUGDOM,
        kind: "terrainItem",
        itemType: 10,
        variantKey: "level=3,p0=1",
        imageUrl: "/exact.png",
        width: 64,
        height: 64,
        generatedFrom: {
          modelFile: "Forest_Models.3dmf",
          modelIndex: 11,
          params: { p0: 1 },
        },
        verificationStatus: "verified",
      },
    ]);

    expect(manifestResult.isOk()).toBe(true);
    if (manifestResult.isErr()) {
      return;
    }

    const exact = findBestItemScreenshot(manifestResult.value, {
      game: Game.BUGDOM,
      kind: "terrainItem",
      itemType: 10,
      levelNum: 3,
      params: { p0: 1 },
    });
    const fallback = findBestItemScreenshot(manifestResult.value, {
      game: Game.BUGDOM,
      kind: "terrainItem",
      itemType: 10,
      levelNum: 2,
      params: { p0: 1 },
    });

    expect(exact?.imageUrl).toBe("/exact.png");
    expect(fallback?.imageUrl).toBe("/default.png");
  });
});
