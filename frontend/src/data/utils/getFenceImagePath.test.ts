import { describe, expect, it } from "vitest";
import { Bugdom2Globals } from "../globals/globals";
import { FenceType } from "../fences/bugdom2FenceType";
import { getFenceImagePath } from "../fences/getFenceImagePath";

describe("getFenceImagePath", () => {
  it("uses Bugdom 2 fence thumbnails for Bugdom 2", () => {
    const base = (import.meta.env?.BASE_URL as string | undefined) ?? "/";
    const expectedPaths = new Map<number, string>([
      [FenceType.GRASS, `${base}games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Global/012.tga`],
      [FenceType.LAWNEDGING, `${base}games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level1_Garden/004.tga`],
      [FenceType.DOGHAIR, `${base}games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level3_DogHair/002.tga`],
      [FenceType.BRICKWALL, `${base}games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Global/013.tga`],
      [FenceType.DOGCOLLAR, `${base}games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level3_DogHair/003.tga`],
      [FenceType.DOGHAIRDENSE, `${base}games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level3_DogHair/004.tga`],
      [FenceType.CARD, `${base}games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level5_Playroom/002.tga`],
      [FenceType.BLOCK, `${base}games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level5_Playroom/003.tga`],
      [FenceType.BALSA, `${base}games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level9_Balsa/001.tga`],
      [FenceType.CLOTH, `${base}games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level6_Closet/001.tga`],
      [FenceType.BOOKS, `${base}games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level6_Closet/002.tga`],
      [FenceType.COMPUTER, `${base}games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level6_Closet/003.tga`],
      [FenceType.SHOEBOX, `${base}games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level6_Closet/004.tga`],
      [FenceType.WATERGRASS, `${base}games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level10_Park/000.tga`],
      [FenceType.GARBAGECAN, `${base}games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level8_Garbage/000.tga`],
      [FenceType.BOXFENCE, `${base}games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level8_Garbage/001.tga`],
    ]);

    for (const [fenceType, expectedPath] of expectedPaths) {
      expect(getFenceImagePath(Bugdom2Globals, fenceType)).toBe(expectedPath);
    }
  });
});
