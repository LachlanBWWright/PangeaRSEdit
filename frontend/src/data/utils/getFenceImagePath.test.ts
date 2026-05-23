import { describe, expect, it } from "vitest";
import { Bugdom2Globals } from "../globals/globals";
import { FenceType } from "../fences/bugdom2FenceType";
import { BUGDOM2_FENCE_IMAGE_MANIFEST } from "../fences/bugdom2FenceImages";
import { getFenceImagePath } from "../fences/getFenceImagePath";

describe("getFenceImagePath", () => {
  it("uses Bugdom 2 fence thumbnails for Bugdom 2", () => {
    const base = import.meta.env?.BASE_URL ?? "/";
    const expectedPaths: readonly {
      fenceType: FenceType;
      expectedPath: string;
    }[] = [
      {
        fenceType: FenceType.GRASS,
        expectedPath: `${base}${BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.GRASS].publicPath}`,
      },
      {
        fenceType: FenceType.LAWNEDGING,
        expectedPath: `${base}${BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.LAWNEDGING].publicPath}`,
      },
      {
        fenceType: FenceType.DOGHAIR,
        expectedPath: `${base}${BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.DOGHAIR].publicPath}`,
      },
      {
        fenceType: FenceType.BRICKWALL,
        expectedPath: `${base}${BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.BRICKWALL].publicPath}`,
      },
      {
        fenceType: FenceType.DOGCOLLAR,
        expectedPath: `${base}${BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.DOGCOLLAR].publicPath}`,
      },
      {
        fenceType: FenceType.DOGHAIRDENSE,
        expectedPath: `${base}${BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.DOGHAIRDENSE].publicPath}`,
      },
      {
        fenceType: FenceType.CARD,
        expectedPath: `${base}${BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.CARD].publicPath}`,
      },
      {
        fenceType: FenceType.BLOCK,
        expectedPath: `${base}${BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.BLOCK].publicPath}`,
      },
      {
        fenceType: FenceType.BALSA,
        expectedPath: `${base}${BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.BALSA].publicPath}`,
      },
      {
        fenceType: FenceType.CLOTH,
        expectedPath: `${base}${BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.CLOTH].publicPath}`,
      },
      {
        fenceType: FenceType.BOOKS,
        expectedPath: `${base}${BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.BOOKS].publicPath}`,
      },
      {
        fenceType: FenceType.COMPUTER,
        expectedPath: `${base}${BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.COMPUTER].publicPath}`,
      },
      {
        fenceType: FenceType.SHOEBOX,
        expectedPath: `${base}${BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.SHOEBOX].publicPath}`,
      },
      {
        fenceType: FenceType.WATERGRASS,
        expectedPath: `${base}${BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.WATERGRASS].publicPath}`,
      },
      {
        fenceType: FenceType.GARBAGECAN,
        expectedPath: `${base}${BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.GARBAGECAN].publicPath}`,
      },
      {
        fenceType: FenceType.BOXFENCE,
        expectedPath: `${base}${BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.BOXFENCE].publicPath}`,
      },
    ];

    for (const { fenceType, expectedPath } of expectedPaths) {
      expect(getFenceImagePath(Bugdom2Globals, fenceType)).toBe(expectedPath);
    }
  });
});
