import { FenceType } from "./bugdom2FenceType";

export interface Bugdom2FenceImageDefinition {
  readonly publicPath: string;
  readonly sourcePath: string;
  readonly sourceEnumName: string;
}

export const BUGDOM2_FENCE_IMAGE_MANIFEST = {
  [FenceType.GRASS]: {
    publicPath: "assets/bugdom2/fences/012.tga",
    sourcePath:
      "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Global/012.tga",
    sourceEnumName: "FENCE_TYPE_GRASS",
  },
  [FenceType.LAWNEDGING]: {
    publicPath: "assets/bugdom2/fences/004.tga",
    sourcePath:
      "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level1_Garden/004.tga",
    sourceEnumName: "FENCE_TYPE_LAWNEDGING",
  },
  [FenceType.DOGHAIR]: {
    publicPath: "assets/bugdom2/fences/002.tga",
    sourcePath:
      "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level3_DogHair/002.tga",
    sourceEnumName: "FENCE_TYPE_DOGHAIR",
  },
  [FenceType.BRICKWALL]: {
    publicPath: "assets/bugdom2/fences/013.tga",
    sourcePath:
      "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Global/013.tga",
    sourceEnumName: "FENCE_TYPE_BRICKWALL",
  },
  [FenceType.DOGCOLLAR]: {
    publicPath: "assets/bugdom2/fences/003.tga",
    sourcePath:
      "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level3_DogHair/003.tga",
    sourceEnumName: "FENCE_TYPE_DOGCOLLAR",
  },
  [FenceType.DOGHAIRDENSE]: {
    publicPath: "assets/bugdom2/fences/004-dense.tga",
    sourcePath:
      "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level3_DogHair/004.tga",
    sourceEnumName: "FENCE_TYPE_DOGHAIRDENSE",
  },
  [FenceType.CARD]: {
    publicPath: "assets/bugdom2/fences/002-card.tga",
    sourcePath:
      "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level5_Playroom/002.tga",
    sourceEnumName: "FENCE_TYPE_CARD",
  },
  [FenceType.BLOCK]: {
    publicPath: "assets/bugdom2/fences/003-block.tga",
    sourcePath:
      "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level5_Playroom/003.tga",
    sourceEnumName: "FENCE_TYPE_BLOCK",
  },
  [FenceType.BALSA]: {
    publicPath: "assets/bugdom2/fences/001.tga",
    sourcePath:
      "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level9_Balsa/001.tga",
    sourceEnumName: "FENCE_TYPE_BALSA",
  },
  [FenceType.CLOTH]: {
    publicPath: "assets/bugdom2/fences/001-cloth.tga",
    sourcePath:
      "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level6_Closet/001.tga",
    sourceEnumName: "FENCE_TYPE_CLOTH",
  },
  [FenceType.BOOKS]: {
    publicPath: "assets/bugdom2/fences/002-books.tga",
    sourcePath:
      "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level6_Closet/002.tga",
    sourceEnumName: "FENCE_TYPE_BOOKS",
  },
  [FenceType.COMPUTER]: {
    publicPath: "assets/bugdom2/fences/003-computer.tga",
    sourcePath:
      "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level6_Closet/003.tga",
    sourceEnumName: "FENCE_TYPE_COMPUTER",
  },
  [FenceType.SHOEBOX]: {
    publicPath: "assets/bugdom2/fences/004-shoebox.tga",
    sourcePath:
      "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level6_Closet/004.tga",
    sourceEnumName: "FENCE_TYPE_SHOEBOX",
  },
  [FenceType.WATERGRASS]: {
    publicPath: "assets/bugdom2/fences/000-watergrass.tga",
    sourcePath:
      "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level10_Park/000.tga",
    sourceEnumName: "FENCE_TYPE_WATERGRASS",
  },
  [FenceType.GARBAGECAN]: {
    publicPath: "assets/bugdom2/fences/000-garbagecan.tga",
    sourcePath:
      "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level8_Garbage/000.tga",
    sourceEnumName: "FENCE_TYPE_GARBAGECAN",
  },
  [FenceType.BOXFENCE]: {
    publicPath: "assets/bugdom2/fences/001-box.tga",
    sourcePath:
      "games/pangea-ports/games/Bugdom2-Android/Data/Sprites/Level8_Garbage/001.tga",
    sourceEnumName: "FENCE_TYPE_BOXFENCE",
  },
} satisfies Record<FenceType, Bugdom2FenceImageDefinition>;

const BUGDOM2_FENCE_IMAGE_SEQUENCE = [
  BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.GRASS],
  BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.LAWNEDGING],
  BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.DOGHAIR],
  BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.BRICKWALL],
  BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.DOGCOLLAR],
  BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.DOGHAIRDENSE],
  BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.CARD],
  BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.BLOCK],
  BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.BALSA],
  BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.CLOTH],
  BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.BOOKS],
  BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.COMPUTER],
  BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.SHOEBOX],
  BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.WATERGRASS],
  BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.GARBAGECAN],
  BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.BOXFENCE],
] satisfies readonly Bugdom2FenceImageDefinition[];

const BUGDOM2_FENCE_IMAGE_FALLBACK =
  BUGDOM2_FENCE_IMAGE_MANIFEST[FenceType.GRASS];

export function getBugdom2FenceImageDefinition(
  fenceType: number,
): Bugdom2FenceImageDefinition {
  const definition = BUGDOM2_FENCE_IMAGE_SEQUENCE[fenceType];
  if (definition) return definition;
  return BUGDOM2_FENCE_IMAGE_FALLBACK;
}
