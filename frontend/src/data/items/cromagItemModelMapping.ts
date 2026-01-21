import { CromagItemModelMapping } from "./itemModelTypes";
import { ItemType } from "./croMagItemType";

export const CROMA_ITEM_MODEL_MAPPINGS: Record<
  number,
  CromagItemModelMapping | undefined
> = {
  // Global
  [ItemType.POW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 0, // GLOBAL_ObjType_BonePOW (default, p0 selects type)
    variants: {
      0: { modelIndex: 0 }, // Bone
      1: { modelIndex: 1 }, // Oil
      2: { modelIndex: 2 }, // Nitro
      3: { modelIndex: 3 }, // BirdBomb
      4: { modelIndex: 4 }, // RomanCandle
      5: { modelIndex: 5 }, // BottleRocket
      6: { modelIndex: 6 }, // Torpedo
      7: { modelIndex: 7 }, // Freeze
      8: { modelIndex: 8 }, // Mine
    }
  },
  [ItemType.InvisibilityPOW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 9, // GLOBAL_ObjType_InvisibilityPOW
  },
  [ItemType.StickyTiresPOW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 10, // GLOBAL_ObjType_StickyTiresPOW
  },
  [ItemType.SuspensionPOW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 11, // GLOBAL_ObjType_SuspensionPOW
  },
  [ItemType.Token]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 12, // GLOBAL_ObjType_Token_ArrowHead
  },
  [ItemType.WaterPatch]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 13, // GLOBAL_ObjType_WaterPatch
  },
  [ItemType.TeamTorch]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 14, // GLOBAL_ObjType_TeamTorch
  },
  [ItemType.TeamBase]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 15, // GLOBAL_ObjType_TeamBaseRed (default)
    variants: {
      0: { modelIndex: 15 }, // Red
      1: { modelIndex: 16 }, // Green
    }
  },
  [ItemType.Sign]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 17, // GLOBAL_ObjType_Sign_Fire
    variants: {
      0: { modelIndex: 17 }, // Fire
      1: { modelIndex: 18 }, // Twister
      2: { modelIndex: 19 }, // Slippery
      3: { modelIndex: 20 }, // Curves
      4: { modelIndex: 21 }, // Ramp
      5: { modelIndex: 22 }, // Snow
    }
  },
  [ItemType.Rock]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 23, // GLOBAL_ObjType_GreyRock
    variants: {
      0: { modelIndex: 23 }, // Grey
      1: { modelIndex: 24 }, // Red
      2: { modelIndex: 25 }, // Ice
    }
  },

  // Desert (level1.bg3d - DESERT enum starts at 0)
  [ItemType.Cactus]: {
    modelFile: "level1.bg3d",
    modelPath: "models",
    modelIndex: 2, // DESERT_ObjType_Cactus
    levelRestriction: 1, // Only in Desert track
    variants: {
      0: { modelIndex: 2 },
      1: { modelIndex: 3 }, // ShortCactus
    }
  },
  [ItemType.DustDevil]: {
    modelFile: "level1.bg3d",
    modelPath: "models",
    modelIndex: 4, // DESERT_ObjType_DustDevilTop (complex object, just showing top for editor)
    levelRestriction: 1,
  },
  [ItemType.RockOverhang]: {
    modelFile: "level1.bg3d",
    modelPath: "models",
    modelIndex: 9, // DESERT_ObjType_RockOverhang
    levelRestriction: 1,
  },

  // Jungle (level2.bg3d)
  [ItemType.EasterHead]: {
    modelFile: "level2.bg3d",
    modelPath: "models",
    modelIndex: 2, // JUNGLE_ObjType_EasterHead
    levelRestriction: 2,
  },
  [ItemType.Tree]: {
    // Tree is tricky, it depends on level.
    // We map generic Tree type, but mapper must switch file based on level.
    // Defaulting to Jungle tree here as placeholder, but mapper logic is key.
    modelFile: "level2.bg3d",
    modelPath: "models",
    modelIndex: 3, // JUNGLE_ObjType_Tree1
  },
  [ItemType.Vine]: {
    modelFile: "level2.bg3d",
    modelPath: "models",
    modelIndex: 6, // JUNGLE_ObjType_Vine
    levelRestriction: 2,
  },
  [ItemType.Volcano]: {
    modelFile: "level2.bg3d",
    modelPath: "models",
    modelIndex: 9, // JUNGLE_ObjType_Volcano
    levelRestriction: 2,
  },
  [ItemType.TotemPole]: {
    modelFile: "level2.bg3d",
    modelPath: "models",
    modelIndex: 10, // JUNGLE_ObjType_TotemPole
    levelRestriction: 2,
  },

  // Ice (level3.bg3d)
  [ItemType.SnoMan]: {
    modelFile: "level3.bg3d",
    modelPath: "models",
    modelIndex: 2, // ICE_ObjType_SnoMan
    levelRestriction: 3,
  },
  [ItemType.CampFire]: {
    modelFile: "level3.bg3d",
    modelPath: "models",
    modelIndex: 3, // ICE_ObjType_CampFire
    levelRestriction: 3,
  },

  // China (level4.bg3d)
  [ItemType.Rickshaw]: {
    modelFile: "level4.bg3d",
    modelPath: "models",
    modelIndex: 2, // CHINA_ObjType_Rickshaw
    levelRestriction: 4,
  },
  [ItemType.Gong]: {
    modelFile: "level4.bg3d",
    modelPath: "models",
    modelIndex: 4, // CHINA_ObjType_Gong
    levelRestriction: 4,
  },
  [ItemType.House]: {
    modelFile: "level4.bg3d",
    modelPath: "models",
    modelIndex: 5, // CHINA_ObjType_House
    levelRestriction: 4,
  },

  // Scandinavia (level5.bg3d)
  [ItemType.Stump]: {
    modelFile: "level5.bg3d",
    modelPath: "models",
    modelIndex: 2, // SCANDINAVIA_ObjType_Stump1
    levelRestriction: 5,
  },
  [ItemType.Baracade]: {
    modelFile: "level5.bg3d",
    modelPath: "models",
    modelIndex: 7, // SCANDINAVIA_ObjType_Baracade1
    levelRestriction: 5,
  },
  [ItemType.VikingFlag]: {
    modelFile: "level5.bg3d",
    modelPath: "models",
    modelIndex: 12, // SCANDINAVIA_ObjType_VikingFlag
    levelRestriction: 5,
  },
  [ItemType.TorchPot]: {
    modelFile: "level5.bg3d",
    modelPath: "models",
    modelIndex: 14, // SCANDINAVIA_ObjType_TorchPot
    levelRestriction: 5,
  },
  [ItemType.WeaponsRack]: {
    modelFile: "level5.bg3d",
    modelPath: "models",
    modelIndex: 16, // SCANDINAVIA_ObjType_WeaponsRack
    levelRestriction: 5,
  },

  // Egypt (level6.bg3d)
  [ItemType.Pillar]: {
    modelFile: "level6.bg3d",
    modelPath: "models",
    modelIndex: 3, // EGYPT_ObjType_Pillar
    levelRestriction: 6,
  },
  [ItemType.Pylon]: {
    modelFile: "level6.bg3d",
    modelPath: "models",
    modelIndex: 4, // EGYPT_ObjType_Pylon
    levelRestriction: 6,
  },
  [ItemType.Boat]: {
    modelFile: "level6.bg3d",
    modelPath: "models",
    modelIndex: 5, // EGYPT_ObjType_Boat
    levelRestriction: 6,
  },
  [ItemType.Statue]: {
    modelFile: "level6.bg3d",
    modelPath: "models",
    modelIndex: 6, // EGYPT_ObjType_Statue
    levelRestriction: 6,
  },
  [ItemType.Sphinx]: {
    modelFile: "level6.bg3d",
    modelPath: "models",
    modelIndex: 7, // EGYPT_ObjType_Sphinx
    levelRestriction: 6,
  },
  [ItemType.Vase]: {
    modelFile: "level6.bg3d",
    modelPath: "models",
    modelIndex: 8, // EGYPT_ObjType_Vase
    levelRestriction: 6,
  },

  // Crete (level7.bg3d)
  [ItemType.Clock]: {
    modelFile: "level7.bg3d",
    modelPath: "models",
    modelIndex: 6, // CRETE_ObjType_Clock
    levelRestriction: 7,
  },
  [ItemType.Goddess]: {
    modelFile: "level7.bg3d",
    modelPath: "models",
    modelIndex: 11, // CRETE_ObjType_Goddess
    levelRestriction: 7,
  },

  // Europe (level8.bg3d)
  [ItemType.CastleTower]: {
    modelFile: "level8.bg3d",
    modelPath: "models",
    modelIndex: 2, // EUROPE_ObjType_CastleTower
    levelRestriction: 8,
  },
  [ItemType.Cauldron]: {
    modelFile: "level8.bg3d",
    modelPath: "models",
    modelIndex: 4, // EUROPE_ObjType_Cauldron
    levelRestriction: 8,
  },
  [ItemType.Well]: {
    modelFile: "level8.bg3d",
    modelPath: "models",
    modelIndex: 8, // EUROPE_ObjType_Well
    levelRestriction: 8,
  },
  [ItemType.Cannon]: {
    modelFile: "level8.bg3d",
    modelPath: "models",
    modelIndex: 9, // EUROPE_ObjType_Cannon
    levelRestriction: 8,
  },

  // Atlantis (level9.bg3d)
  [ItemType.Clam]: {
    modelFile: "level9.bg3d",
    modelPath: "models",
    modelIndex: 4, // ATLANTIS_ObjType_Clam
    levelRestriction: 9,
  },
  [ItemType.Capsule]: {
    modelFile: "level9.bg3d",
    modelPath: "models",
    modelIndex: 9, // ATLANTIS_ObjType_Capsule
    levelRestriction: 9,
  },
  [ItemType.SeaMine]: {
    modelFile: "level9.bg3d",
    modelPath: "models",
    modelIndex: 10, // ATLANTIS_ObjType_SeaMine
    levelRestriction: 9,
  },

  // Stonehenge (level10.bg3d)
  [ItemType.StoneHenge]: {
    modelFile: "level10.bg3d",
    modelPath: "models",
    modelIndex: 2, // STONEHENGE_ObjType_InnerHenge
    levelRestriction: 10,
  },

  // Aztec (level11.bg3d)
  [ItemType.AztecHead]: {
    modelFile: "level11.bg3d",
    modelPath: "models",
    modelIndex: 1, // AZTEC_ObjType_StoneHead
    levelRestriction: 11,
  },

  // Coliseum (level12.bg3d)
  [ItemType.Coliseum]: {
    modelFile: "level12.bg3d",
    modelPath: "models",
    modelIndex: 2, // COLISEUM_ObjType_Column
    levelRestriction: 12,
  },

  // Tar (level13.bg3d)
  [ItemType.TarPatch]: {
    modelFile: "level13.bg3d",
    modelPath: "models",
    modelIndex: 1, // TAR_ObjType_TarPatch
    levelRestriction: 13,
  },
};
