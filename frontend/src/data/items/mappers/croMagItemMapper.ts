/**
 * Cro-Mag Rally Item Model Mapper
 *
 * Maps Cro-Mag Rally item types to their corresponding 3D models.
 *
 * Model files (from levelModelFiles[] in File.c):
 * - global.bg3d        - Global items (MODEL_GROUP_GLOBAL)
 * - desert.bg3d        - Desert track (TRACK_NUM_DESERT = 0)
 * - jungle.bg3d        - Jungle track (TRACK_NUM_JUNGLE = 1)
 * - ice.bg3d           - Ice track (TRACK_NUM_ICE = 2)
 * - crete.bg3d         - Crete track (TRACK_NUM_CRETE = 4)
 * - china.bg3d         - China track (TRACK_NUM_CHINA = 5)
 * - egypt.bg3d         - Egypt track (TRACK_NUM_EGYPT = 6)
 * - europe.bg3d        - Europe track (TRACK_NUM_EUROPE = 8)
 * - scandinavia.bg3d   - Scandinavia track (TRACK_NUM_SCANDINAVIA = 9)
 * - atlantis.bg3d      - Atlantis track (TRACK_NUM_ATLANTIS = 10)
 * - stonehenge.bg3d    - Stone Henge track (TRACK_NUM_STONEHENGE = 12)
 * - aztec.bg3d         - Aztec track (TRACK_NUM_AZTEC = 13)
 * - coliseum.bg3d      - Coliseum track (TRACK_NUM_COLISEUM = 14)
 * - tarpits.bg3d       - Tar Pits track (TRACK_NUM_TARPITS = 17)
 *
 * Model indices correspond to *_ObjType_* enum values in mobjtypes.h.
 */

import { Game } from "../../globals/globals";
import {
  type GameItemModelMapper,
  type UniversalItemModelMapping,
} from "../itemModelTypes";
import { ItemType } from "../croMagItemType";
import { ROTATION_8_WAY } from "../standardParamTypes";

/**
 * Track-specific model files, indexed by TRACK_NUM_* constants
 */
export const CROMAG_TRACK_MODEL_FILES: Record<number, string> = {
  0: "desert.bg3d",
  1: "jungle.bg3d",
  2: "ice.bg3d",
  4: "crete.bg3d",
  5: "china.bg3d",
  6: "egypt.bg3d",
  8: "europe.bg3d",
  9: "scandinavia.bg3d",
  10: "atlantis.bg3d",
  12: "stonehenge.bg3d",
  13: "aztec.bg3d",
  14: "coliseum.bg3d",
  17: "tarpits.bg3d",
};

function getTrackSpecificFinishLine(levelNum?: number): UniversalItemModelMapping | undefined {
  if (levelNum === undefined) {
    return CROMAG_BASE_MAPPINGS[ItemType.FinishLine];
  }

  const modelFile = CROMAG_TRACK_MODEL_FILES[levelNum];
  if (!modelFile || levelNum === 12 || levelNum === 13 || levelNum === 14 || levelNum === 17) {
    return undefined;
  }

  return { modelFile, modelPath: "models", modelIndex: 1 };
}

function getTrackSpecificTree(
  levelNum?: number,
  params?: { p0: number; p1: number; p2: number; p3: number },
): UniversalItemModelMapping | undefined {
  const treeType = params?.p0 ?? 0;
  const treeIndicesByTrack: Partial<Record<number, readonly number[]>> = {
    1: [3, 4, 5, 5],
    2: [6],
    4: [13, 14],
    8: [11, 12],
    9: [18, 19],
    13: [2],
  };
  const modelFile = levelNum === undefined ? "jungle.bg3d" : CROMAG_TRACK_MODEL_FILES[levelNum];
  const indices = levelNum === undefined ? treeIndicesByTrack[1] : treeIndicesByTrack[levelNum];
  const modelIndex = indices?.[treeType];
  if (!modelFile || modelIndex === undefined) {
    return levelNum === undefined ? CROMAG_BASE_MAPPINGS[ItemType.Tree] : undefined;
  }

  return { modelFile, modelPath: "models", modelIndex };
}

function getTrackSpecificCampFire(levelNum?: number): UniversalItemModelMapping {
  return levelNum === 2
    ? { modelFile: "ice.bg3d", modelPath: "models", modelIndex: 3 }
    : { modelFile: "scandinavia.bg3d", modelPath: "models", modelIndex: 18 };
}

function getTrackSpecificPillar(
  levelNum?: number,
  params?: { p0: number; p1: number; p2: number; p3: number },
): UniversalItemModelMapping | undefined {
  const pillarType = params?.p0 ?? 0;
  const options: Partial<Record<number, readonly number[]>> = {
    0: [11, 12, 13],
    4: [2, 3, 4, 2],
    6: [3, 2],
    9: [13],
    10: [8, 2, 3],
    14: [2],
  };
  const track = levelNum ?? 0;
  const modelFile = CROMAG_TRACK_MODEL_FILES[track];
  const modelIndex = options[track]?.[pillarType];
  if (!modelFile || modelIndex === undefined) {
    return levelNum === undefined ? CROMAG_BASE_MAPPINGS[ItemType.Pillar] : undefined;
  }

  return { modelFile, modelPath: "models", modelIndex };
}

function getTrackSpecificBoat(levelNum?: number): UniversalItemModelMapping | undefined {
  const options: Partial<Record<number, number>> = {
    4: 5,
    6: 5,
    9: 15,
    10: 11,
  };
  const track = levelNum ?? 6;
  const modelFile = CROMAG_TRACK_MODEL_FILES[track];
  const modelIndex = options[track];
  if (!modelFile || modelIndex === undefined) {
    return levelNum === undefined ? CROMAG_BASE_MAPPINGS[ItemType.Boat] : undefined;
  }

  return { modelFile, modelPath: "models", modelIndex };
}

function getTrackSpecificStatue(
  levelNum?: number,
  params?: { p0: number; p1: number; p2: number; p3: number },
): UniversalItemModelMapping | undefined {
  const statueType = params?.p0 ?? 0;
  const track = levelNum ?? 6;
  const modelFile = CROMAG_TRACK_MODEL_FILES[track];
  const modelIndex =
    track === 4 ? [12][statueType] : track === 6 ? [6, 9][statueType] : undefined;
  if (!modelFile || modelIndex === undefined) {
    return levelNum === undefined ? CROMAG_BASE_MAPPINGS[ItemType.Statue] : undefined;
  }

  return { modelFile, modelPath: "models", modelIndex };
}

function getTrackSpecificHouse(
  levelNum?: number,
  params?: { p0: number; p1: number; p2: number; p3: number },
): UniversalItemModelMapping | undefined {
  const houseType = params?.p0 ?? 0;
  const options: Partial<Record<number, readonly number[]>> = {
    1: [7, 8],
    2: [5],
    4: [7, 8, 9],
    5: [5],
    8: [5, 6, 7],
    9: [9, 10, 11],
    10: [5, 6, 7],
  };
  const track = levelNum ?? 5;
  const modelFile = CROMAG_TRACK_MODEL_FILES[track];
  const modelIndex = options[track]?.[houseType];
  if (!modelFile || modelIndex === undefined) {
    return levelNum === undefined ? CROMAG_BASE_MAPPINGS[ItemType.House] : undefined;
  }

  return { modelFile, modelPath: "models", modelIndex };
}

/**
 * Base mappings for Cro-Mag Rally items.
 * Model indices correspond exactly to *_ObjType_* enum values in mobjtypes.h.
 */
const CROMAG_BASE_MAPPINGS: Record<number, UniversalItemModelMapping> = {
  // ---- GLOBAL (global.bg3d) ----
  // GLOBAL_ObjType_BonePOW = 0 ... MinePOW = 8
  [ItemType.POW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 0,
    variants: {
      0: { modelIndex: 0 }, // BonePOW
      1: { modelIndex: 1 }, // OilPOW
      2: { modelIndex: 2 }, // NitroPOW
      3: { modelIndex: 3 }, // BirdBombPOW
      4: { modelIndex: 4 }, // RomanCandlePOW
      5: { modelIndex: 5 }, // BottleRocketPOW
      6: { modelIndex: 6 }, // TorpedoPOW
      7: { modelIndex: 7 }, // FreezePOW
      8: { modelIndex: 8 }, // MinePOW
    },
  },

  // GLOBAL_ObjType_InvisibilityPOW = 9
  [ItemType.InvisibilityPOW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 9,
  },

  // GLOBAL_ObjType_StickyTiresPOW = 10
  [ItemType.StickyTiresPOW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 10,
  },

  // GLOBAL_ObjType_SuspensionPOW = 11
  [ItemType.SuspensionPOW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 11,
  },

  // GLOBAL_ObjType_Token_ArrowHead = 12
  [ItemType.Token]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 12,
  },

  // GLOBAL_ObjType_WaterPatch = 13
  [ItemType.WaterPatch]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 13,
  },

  // GLOBAL_ObjType_TeamTorch = 14
  [ItemType.TeamTorch]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 14,
  },

  // GLOBAL_ObjType_TeamBaseRed = 15, TeamBaseGreen = 16
  [ItemType.TeamBase]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 15,
    variants: { 0: { modelIndex: 15 }, 1: { modelIndex: 16 } },
  },

  // GLOBAL_ObjType_Sign_Fire = 17, Twister = 18, Slippery = 19, Curves = 20, Ramp = 21, Snow = 22
  [ItemType.Sign]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 17,
    rotationParam: { paramIndex: 1, rotationType: ROTATION_8_WAY },
    variants: {
      0: { modelIndex: 17 },
      1: { modelIndex: 18 },
      2: { modelIndex: 19 },
      3: { modelIndex: 20 },
      4: { modelIndex: 21 },
      5: { modelIndex: 22 },
    },
  },

  // GLOBAL_ObjType_GreyRock = 23, RedRock = 24, IceRock = 25
  [ItemType.Rock]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 23,
    variants: {
      0: { modelIndex: 23 },
      1: { modelIndex: 24 },
      2: { modelIndex: 25 },
    },
  },

  // ---- DESERT (desert.bg3d) ----
  // DESERT_ObjType_StartingLine = 1
  [ItemType.FinishLine]: {
    modelFile: "desert.bg3d",
    modelPath: "models",
    modelIndex: 1,
  },

  // DESERT_ObjType_Cactus = 2, ShortCactus = 3
  [ItemType.Cactus]: {
    modelFile: "desert.bg3d",
    modelPath: "models",
    modelIndex: 2,
    variants: { 0: { modelIndex: 2 }, 1: { modelIndex: 3 } },
  },

  // DESERT_ObjType_DustDevilTop = 4 (multi-model animation)
  [ItemType.DustDevil]: {
    modelFile: "desert.bg3d",
    modelPath: "models",
    modelIndex: 4,
  },

  // DESERT_ObjType_RockOverhang = 9, RockOverhang2 = 10
  [ItemType.RockOverhang]: {
    modelFile: "desert.bg3d",
    modelPath: "models",
    modelIndex: 9,
    variants: { 0: { modelIndex: 9 }, 1: { modelIndex: 10 } },
  },

  // ---- JUNGLE (jungle.bg3d) ----
  // JUNGLE_ObjType_EasterHead = 2
  [ItemType.EasterHead]: {
    modelFile: "jungle.bg3d",
    modelPath: "models",
    modelIndex: 2,
  },

  // JUNGLE_ObjType_Tree1 = 3, Tree2 = 4, Tree3 = 5
  [ItemType.Tree]: {
    modelFile: "jungle.bg3d",
    modelPath: "models",
    modelIndex: 3,
    variants: {
      0: { modelIndex: 3 },
      1: { modelIndex: 4 },
      2: { modelIndex: 5 },
    },
  },

  // JUNGLE_ObjType_Vine = 6
  [ItemType.Vine]: {
    modelFile: "jungle.bg3d",
    modelPath: "models",
    modelIndex: 6,
  },

  // JUNGLE_ObjType_Volcano = 9
  [ItemType.Volcano]: {
    modelFile: "jungle.bg3d",
    modelPath: "models",
    modelIndex: 9,
  },

  // JUNGLE_ObjType_TotemPole = 10
  [ItemType.TotemPole]: {
    modelFile: "jungle.bg3d",
    modelPath: "models",
    modelIndex: 10,
  },

  // ---- ICE (ice.bg3d) ----
  // ICE_ObjType_SnoMan = 2
  [ItemType.SnoMan]: {
    modelFile: "ice.bg3d",
    modelPath: "models",
    modelIndex: 2,
  },

  // ICE_ObjType_CampFire = 3
  [ItemType.CampFire]: {
    modelFile: "ice.bg3d",
    modelPath: "models",
    modelIndex: 3,
  },

  // ---- CHINA (china.bg3d) ----
  // CHINA_ObjType_Rickshaw = 2
  [ItemType.Rickshaw]: {
    modelFile: "china.bg3d",
    modelPath: "models",
    modelIndex: 2,
  },

  // CHINA_ObjType_GongFrame = 3 (Gong = 4 added as child at runtime)
  [ItemType.Gong]: {
    modelFile: "china.bg3d",
    modelPath: "models",
    modelIndex: 3,
  },

  // CHINA_ObjType_House = 5
  [ItemType.House]: {
    modelFile: "china.bg3d",
    modelPath: "models",
    modelIndex: 5,
    rotationParam: { paramIndex: 1, rotationType: ROTATION_8_WAY },
  },

  // ---- EGYPT (egypt.bg3d) ----
  // EGYPT_ObjType_Obelisk = 2, Pillar = 3
  [ItemType.Pillar]: {
    modelFile: "egypt.bg3d",
    modelPath: "models",
    modelIndex: 3,
    variants: { 0: { modelIndex: 3 }, 1: { modelIndex: 2 } },
  },

  // EGYPT_ObjType_Pylon = 4
  [ItemType.Pylon]: {
    modelFile: "egypt.bg3d",
    modelPath: "models",
    modelIndex: 4,
  },

  // EGYPT_ObjType_Boat = 5
  [ItemType.Boat]: {
    modelFile: "egypt.bg3d",
    modelPath: "models",
    modelIndex: 5,
  },

  // EGYPT_ObjType_Statue = 6, CatStatue = 9
  [ItemType.Statue]: {
    modelFile: "egypt.bg3d",
    modelPath: "models",
    modelIndex: 6,
    rotationParam: { paramIndex: 1, rotationType: ROTATION_8_WAY },
    variants: { 0: { modelIndex: 6 }, 1: { modelIndex: 9 } },
  },

  // EGYPT_ObjType_Sphinx = 7
  [ItemType.Sphinx]: {
    modelFile: "egypt.bg3d",
    modelPath: "models",
    modelIndex: 7,
  },

  // EGYPT_ObjType_Vase = 8
  [ItemType.Vase]: {
    modelFile: "egypt.bg3d",
    modelPath: "models",
    modelIndex: 8,
    rotationParam: { paramIndex: 0, rotationType: ROTATION_8_WAY },
  },

  // ---- EUROPE (europe.bg3d) ----
  // EUROPE_ObjType_CastleTower = 2, SiegeTower = 3
  [ItemType.CastleTower]: {
    modelFile: "europe.bg3d",
    modelPath: "models",
    modelIndex: 2,
    variants: { 0: { modelIndex: 2 }, 1: { modelIndex: 3 } },
  },

  // EUROPE_ObjType_Cauldron = 4
  [ItemType.Cauldron]: {
    modelFile: "europe.bg3d",
    modelPath: "models",
    modelIndex: 4,
  },

  // EUROPE_ObjType_Well = 8
  [ItemType.Well]: {
    modelFile: "europe.bg3d",
    modelPath: "models",
    modelIndex: 8,
  },

  // EUROPE_ObjType_Cannon = 9
  [ItemType.Cannon]: {
    modelFile: "europe.bg3d",
    modelPath: "models",
    modelIndex: 9,
  },

  // ---- SCANDINAVIA (scandinavia.bg3d) ----
  // SCANDINAVIA_ObjType_Stump1 = 2 ... Stump5 = 6
  [ItemType.Stump]: {
    modelFile: "scandinavia.bg3d",
    modelPath: "models",
    modelIndex: 2,
    variants: {
      0: { modelIndex: 2 },
      1: { modelIndex: 3 },
      2: { modelIndex: 4 },
      3: { modelIndex: 5 },
      4: { modelIndex: 6 },
    },
  },

  // SCANDINAVIA_ObjType_Baracade1 = 7, Baracade2 = 8
  [ItemType.Baracade]: {
    modelFile: "scandinavia.bg3d",
    modelPath: "models",
    modelIndex: 7,
    variants: { 0: { modelIndex: 7 }, 1: { modelIndex: 8 } },
  },

  // SCANDINAVIA_ObjType_VikingFlag = 12
  [ItemType.VikingFlag]: {
    modelFile: "scandinavia.bg3d",
    modelPath: "models",
    modelIndex: 12,
  },

  // SCANDINAVIA_ObjType_TorchPot = 14
  [ItemType.TorchPot]: {
    modelFile: "scandinavia.bg3d",
    modelPath: "models",
    modelIndex: 14,
  },

  // SCANDINAVIA_ObjType_WeaponsRack = 16
  [ItemType.WeaponsRack]: {
    modelFile: "scandinavia.bg3d",
    modelPath: "models",
    modelIndex: 16,
  },

  // ---- CRETE (crete.bg3d) ----
  // CRETE_ObjType_Clock = 6
  [ItemType.Clock]: {
    modelFile: "crete.bg3d",
    modelPath: "models",
    modelIndex: 6,
  },

  // CRETE_ObjType_Goddess = 11
  [ItemType.Goddess]: {
    modelFile: "crete.bg3d",
    modelPath: "models",
    modelIndex: 11,
  },

  // ---- ATLANTIS (atlantis.bg3d) ----
  // ATLANTIS_ObjType_Clam = 4
  [ItemType.Clam]: {
    modelFile: "atlantis.bg3d",
    modelPath: "models",
    modelIndex: 4,
  },

  // ATLANTIS_ObjType_Capsule = 9
  [ItemType.Capsule]: {
    modelFile: "atlantis.bg3d",
    modelPath: "models",
    modelIndex: 9,
  },

  // ATLANTIS_ObjType_SeaMine = 10
  [ItemType.SeaMine]: {
    modelFile: "atlantis.bg3d",
    modelPath: "models",
    modelIndex: 10,
  },

  // ---- STONEHENGE (stonehenge.bg3d) ----
  // STONEHENGE_ObjType_Post = 1, InnerHenge = 2, OuterHenge = 3
  [ItemType.StoneHenge]: {
    modelFile: "stonehenge.bg3d",
    modelPath: "models",
    modelIndex: 1,
    variants: {
      0: { modelIndex: 1 },
      1: { modelIndex: 2 },
      2: { modelIndex: 3 },
    },
  },

  // ---- AZTEC (aztec.bg3d) ----
  // AZTEC_ObjType_StoneHead = 1
  [ItemType.AztecHead]: {
    modelFile: "aztec.bg3d",
    modelPath: "models",
    modelIndex: 1,
  },

  // ---- COLISEUM (coliseum.bg3d) ----
  // COLISEUM_ObjType_Wall = 1, Column = 2
  [ItemType.Coliseum]: {
    modelFile: "coliseum.bg3d",
    modelPath: "models",
    modelIndex: 1,
  },

  // ---- TARPITS (tarpits.bg3d) ----
  // TAR_ObjType_TarPatch = 1
  [ItemType.TarPatch]: {
    modelFile: "tarpits.bg3d",
    modelPath: "models",
    modelIndex: 1,
  },

  // ---- SKELETONS ----
  // Scales from Source/Items/Traps.c and Source/Items/Items.c; yOffset = game's coord.y offset above terrainY minus 25
  [ItemType.Yeti]: {
    modelFile: "Yeti.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "yeti.skeleton.rsrc",
    scale: 7.0,
    yOffset: 325, // YETI_SCALE=7.0; coord.y = terrainY + YETI_YOFF(350)
  },

  [ItemType.BrontoNeck]: {
    modelFile: "BrontoNeck.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "brontoneck.skeleton.rsrc",
    scale: 50.0,
    yOffset: 475, // scale=50; coord.y = terrainY + 500
  },

  [ItemType.Catapult]: {
    modelFile: "Catapult.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "catapult.skeleton.rsrc",
    scale: 4.5,
    yOffset: -25, // scale=4.5; coord.y = GetMinTerrainY (model base at terrain)
  },

  [ItemType.FlagPole]: {
    modelFile: "Flag.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "flag.skeleton.rsrc",
    scale: 10.0,
    yOffset: -25, // scale=10; coord.y = terrainY - bbox.min.y (model base at terrain)
  },

  [ItemType.Flower]: {
    modelFile: "Flower.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "flower.skeleton.rsrc",
    scale: 20.0,
    yOffset: -25, // scale=20; coord.y = terrainY
  },

  [ItemType.Dragon]: {
    modelFile: "Dragon.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "dragon.skeleton.rsrc",
    scale: 20.0,
    yOffset: 4975, // scale=20; coord.y = terrainY + 5000
  },

  [ItemType.Druid]: {
    modelFile: "Druid.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "druid.skeleton.rsrc",
    scale: 5.0,
    yOffset: -25, // scale=5; coord.y = terrainY
  },

  [ItemType.CamelSpline]: {
    modelFile: "Camel.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "camel.skeleton.rsrc",
    scale: 3.0,
    yOffset: -25, // CAMEL_SCALE=3; coord.y = terrainY
  },

  [ItemType.BeetleSpline]: {
    modelFile: "Beetle.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "beetle.skeleton.rsrc",
    scale: 1.0,
    yOffset: 15, // BEETLE_SCALE=1; coord.y = terrainY + BEETLE_YOFF(40)
  },

  [ItemType.SharkSpline]: {
    modelFile: "Shark.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "shark.skeleton.rsrc",
    scale: 25.0,
    yOffset: -25, // SHARK_SCALE=25; placed underwater (SHARK_YOFF=5000 from water)
  },

  [ItemType.TrollSpline]: {
    modelFile: "Troll.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "troll.skeleton.rsrc",
    scale: 4.5,
    yOffset: -25, // TROLL_SCALE=4.5; coord.y = terrainY
  },

  [ItemType.PteradactylSpline]: {
    modelFile: "Pterodactyl.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "pterodactyl.skeleton.rsrc",
    scale: 15.0,
    yOffset: 3975, // PTERADACTYL_SCALE=15; coord.y = terrainY + PTERADACTYL_YOFF(4000)
  },

  [ItemType.MummySpline]: {
    modelFile: "Mummy.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "mummy.skeleton.rsrc",
    scale: 3.0,
    yOffset: -25, // MUMMY_SCALE=3; coord.y = terrainY
  },

  [ItemType.PolarBearSpline]: {
    modelFile: "PolarBear.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "polarbear.skeleton.rsrc",
    scale: 3.0,
    yOffset: -25, // BEAR_SCALE=3; coord.y = terrainY
  },

  [ItemType.VikingSpline]: {
    modelFile: "Viking.bg3d",
    modelPath: "skeletons",
    modelIndex: 0,
    requiresSkeleton: true,
    skeletonFile: "viking.skeleton.rsrc",
    scale: 1.6,
    yOffset: -25, // VIKING_SCALE=1.6; coord.y = terrainY
  },
};

/**
 * Cro-Mag Rally Item Mapper Implementation
 */
export class CroMagItemMapper implements GameItemModelMapper {
  readonly game = Game.CRO_MAG;

  /**
   * Get model mapping for a Cro-Mag Rally item type
   */
  getMapping(
    itemType: number,
    levelNum?: number,
    params?: { p0: number; p1: number; p2: number; p3: number },
  ): UniversalItemModelMapping | undefined {
    if (itemType === ItemType.FinishLine) {
      return getTrackSpecificFinishLine(levelNum);
    }

    if (itemType === ItemType.Tree) {
      return getTrackSpecificTree(levelNum, params);
    }

    if (itemType === ItemType.CampFire) {
      return getTrackSpecificCampFire(levelNum);
    }

    if (itemType === ItemType.Pillar) {
      return getTrackSpecificPillar(levelNum, params);
    }

    if (itemType === ItemType.Boat) {
      return getTrackSpecificBoat(levelNum);
    }

    if (itemType === ItemType.Statue) {
      return getTrackSpecificStatue(levelNum, params);
    }

    if (itemType === ItemType.House) {
      return getTrackSpecificHouse(levelNum, params);
    }

    const base = CROMAG_BASE_MAPPINGS[itemType];
    if (!base) return undefined;

    // Handle variants based on p0
    if (base.variants && params) {
      const variant = base.variants[params.p0];
      if (variant)
        return {
          ...base,
          modelFile: variant.modelFile ?? base.modelFile,
          modelIndex: variant.modelIndex,
        };
    }

    return base;
  }

  /**
   * Get all mapped item types
   */
  getMappedTypes(): number[] {
    return Object.keys(CROMAG_BASE_MAPPINGS)
      .map(Number)
      .filter((k) => !isNaN(k));
  }

  /**
   * Check if an item type has a model
   */
  hasModel(itemType: number): boolean {
    return CROMAG_BASE_MAPPINGS[itemType] !== undefined;
  }

  /**
   * Get total number of mapped items
   */
  getMappingCount(): number {
    return this.getMappedTypes().length;
  }
}

/**
 * Singleton instance
 */
export const croMagItemMapper = new CroMagItemMapper();
