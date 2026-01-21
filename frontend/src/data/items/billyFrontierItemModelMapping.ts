import { ItemType } from "./billyFrontierItemType";

export interface BillyFrontierItemModelMapping {
  // Use same structure as UniversalItemModelMapping
  modelFile: string;
  modelPath: "models" | "skeletons";
  modelIndex: number;
  requiresSkeleton?: boolean;
  skeletonFile?: string;
  scale?: number;
  rotationY?: number;
  levelRestriction?: number;
  variants?: Record<number, { modelFile?: string; modelIndex: number }>;
}

export const BILLY_FRONTIER_ITEM_MODEL_MAPPINGS: Record<
  number,
  BillyFrontierItemModelMapping | undefined
> = {
  // Global
  [ItemType.Barrel]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 10, // GLOBAL_ObjType_Barrel
    variants: {
      0: { modelIndex: 10 },
      1: { modelIndex: 11 }, // BarrelTNT
      2: { modelIndex: 12 }, // FrogBarrel
    }
  },
  [ItemType.WoodCrate]: { // Corrected from Crate to WoodCrate (ItemType value is 10, mapped to WoodCrate)
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 13, // GLOBAL_ObjType_Crate
    variants: {
      0: { modelIndex: 13 },
      1: { modelIndex: 14 }, // CrateStack
      2: { modelIndex: 15 }, // MetalCrate
      3: { modelIndex: 16 }, // MetalCrateStack
    }
  },
  [ItemType.HayBale]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 17, // GLOBAL_ObjType_HayBale
    variants: {
      0: { modelIndex: 17 },
      1: { modelIndex: 18 }, // HayBaleStack
    }
  },
  [ItemType.Tumbleweed]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 28, // GLOBAL_ObjType_Tumbleweed
  },
  [ItemType.FreeLifePOW]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 31, // GLOBAL_ObjType_FreeLifePOW
  },
  [ItemType.Post]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 33, // GLOBAL_ObjType_WoodPost
  },
  [ItemType.Boost]: {
    modelFile: "global.bg3d",
    modelPath: "models",
    modelIndex: 35, // GLOBAL_ObjType_Boost
  },

  // Town (level 1)
  [ItemType.HeadStone]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 1, // TOWN_ObjType_Headstone1
    levelRestriction: 1,
    variants: {
      0: { modelIndex: 1 },
      1: { modelIndex: 2 },
      2: { modelIndex: 3 },
      3: { modelIndex: 4 },
      4: { modelIndex: 5 },
    }
  },
  [ItemType.Plant]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 6, // TOWN_ObjType_Cactus
    // Note: Same item ID might be used for Swamp mushroom? Need to check if IDs overlap or are distinct.
    // Assuming ItemType.Plant maps to generic plant, but source suggests different IDs might be used or dynamic mapping.
    // For now, mapping to Town Cactus.
  },
  [ItemType.DeadTree]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 7, // TOWN_ObjType_DeadTree
    levelRestriction: 1,
  },
  [ItemType.DuelRockWall]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 9, // TOWN_ObjType_RockWall
    levelRestriction: 1,
  },
  [ItemType.Coffin]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 10, // TOWN_ObjType_Coffin
    levelRestriction: 1,
  },
  [ItemType.Rock]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 12, // TOWN_ObjType_TallRock1
    levelRestriction: 1,
  },
  [ItemType.ShootoutAlley]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 16, // TOWN_ObjType_Alley
    levelRestriction: 1,
  },
  [ItemType.Table]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 17, // TOWN_ObjType_Table
    levelRestriction: 1,
  },
  [ItemType.Chair]: {
    modelFile: "town.bg3d",
    modelPath: "models",
    modelIndex: 18, // TOWN_ObjType_Chair
    levelRestriction: 1,
  },

  // Swamp (level 2)
  [ItemType.SwampCabin]: {
    modelFile: "swamp.bg3d",
    modelPath: "models",
    modelIndex: 1, // SWAMP_ObjType_Cabin
    levelRestriction: 2,
  },
  [ItemType.TremorGrave]: {
    modelFile: "swamp.bg3d",
    modelPath: "models",
    modelIndex: 11, // SWAMP_ObjType_Grave
    levelRestriction: 2,
  },
  [ItemType.TeePee]: {
    modelFile: "swamp.bg3d",
    modelPath: "models",
    modelIndex: 12, // SWAMP_ObjType_TeePee
    levelRestriction: 2,
  },
  [ItemType.SpearSkull]: {
    modelFile: "swamp.bg3d",
    modelPath: "models",
    modelIndex: 13, // SWAMP_ObjType_SpearSkull
    levelRestriction: 2,
  },
  [ItemType.ElectricFence]: {
    modelFile: "swamp.bg3d",
    modelPath: "models",
    modelIndex: 14, // SWAMP_ObjType_ElectricFence
    levelRestriction: 2,
  },

  // Buildings (buildings.bg3d)
  [ItemType.Building]: {
    modelFile: "buildings.bg3d",
    modelPath: "models",
    modelIndex: 0, // BUILDING_ObjType_Saloon
    variants: {
      0: { modelIndex: 0 },
      1: { modelIndex: 1 },
      2: { modelIndex: 2 },
      3: { modelIndex: 3 },
      4: { modelIndex: 4 },
      5: { modelIndex: 5 },
      6: { modelIndex: 6 },
      7: { modelIndex: 7 },
    }
  },
  [ItemType.ShootoutSaloon]: {
    modelFile: "buildings.bg3d",
    modelPath: "models",
    modelIndex: 16, // BUILDING_ObjType_SaloonInside
  },
};
