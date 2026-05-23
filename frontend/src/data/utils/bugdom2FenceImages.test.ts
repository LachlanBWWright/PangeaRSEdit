import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { FenceType } from "../fences/bugdom2FenceType";
import {
  BUGDOM2_FENCE_IMAGE_MANIFEST,
  type Bugdom2FenceImageDefinition,
} from "../fences/bugdom2FenceImages";

const EXPECTED_BUGDOM2_FENCE_IMAGES: readonly {
  fenceType: FenceType;
  definition: Bugdom2FenceImageDefinition;
}[] = [
  {
    fenceType: FenceType.GRASS,
    definition: BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.GRASS],
  },
  {
    fenceType: FenceType.LAWNEDGING,
    definition: BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.LAWNEDGING],
  },
  {
    fenceType: FenceType.DOGHAIR,
    definition: BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.DOGHAIR],
  },
  {
    fenceType: FenceType.BRICKWALL,
    definition: BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.BRICKWALL],
  },
  {
    fenceType: FenceType.DOGCOLLAR,
    definition: BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.DOGCOLLAR],
  },
  {
    fenceType: FenceType.DOGHAIRDENSE,
    definition: BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.DOGHAIRDENSE],
  },
  {
    fenceType: FenceType.CARD,
    definition: BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.CARD],
  },
  {
    fenceType: FenceType.BLOCK,
    definition: BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.BLOCK],
  },
  {
    fenceType: FenceType.BALSA,
    definition: BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.BALSA],
  },
  {
    fenceType: FenceType.CLOTH,
    definition: BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.CLOTH],
  },
  {
    fenceType: FenceType.BOOKS,
    definition: BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.BOOKS],
  },
  {
    fenceType: FenceType.COMPUTER,
    definition: BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.COMPUTER],
  },
  {
    fenceType: FenceType.SHOEBOX,
    definition: BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.SHOEBOX],
  },
  {
    fenceType: FenceType.WATERGRASS,
    definition: BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.WATERGRASS],
  },
  {
    fenceType: FenceType.GARBAGECAN,
    definition: BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.GARBAGECAN],
  },
  {
    fenceType: FenceType.BOXFENCE,
    definition: BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.BOXFENCE],
  },
];

describe("bugdom2FenceImages", () => {
  it("keeps source metadata and public assets aligned", () => {
    const publicRoot = resolve(process.cwd(), "public");

    for (const { fenceType, definition } of EXPECTED_BUGDOM2_FENCE_IMAGES) {
      expect(BUGDOM2_FENCE_IMAGE_MANIFEST[fenceType]).toBe(definition);
      expect(definition.sourcePath).toMatch(
        /^games\/pangea-ports\/games\/Bugdom2-Android\/Data\/Sprites\//,
      );
      expect(definition.sourceEnumName).toMatch(/^FENCE_TYPE_/);
      expect(existsSync(resolve(publicRoot, definition.publicPath))).toBe(true);
    }
  });
});
