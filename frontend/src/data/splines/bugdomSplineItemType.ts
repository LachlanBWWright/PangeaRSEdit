export enum SplineItemType {
  NilMyStartCoords, // My Start Coords
  NilXxxxx, // 1: xxxxx
  NilSugar, // 2: Sugar
  Enemy_BoxerFly, // 3: ENEMY: BOXERFLY
  NilBugTest, // 4: bug test
  NilClover, // 5: Clover
  NilGrass, // 6: Grass
  NilWeed, // 7: Weed
  Enemy_Slug, // 8: Slug enemy
  Enemy_Ant, // 9: Fireant enemy
  NilSunflower, // 10: Sunflower
  NilCosmo, // 11: Cosmo
  NilPoppy, // 12: Poppy
  NilWallEnd, // 13: Wall End
  NilWaterPatch, // 14: Water Patch
  NilFireAnt, // 15: FireAnt
  NilWaterBug, // 16: WaterBug
  NilTree, // 17: Tree (flight level)
  NilDragonfly, // 18: Dragonfly
  NilCatTail, // 19: Cat Tail
  NilDuckWeed, // 20: Duck Weed
  NilLilyFlower, // 21: Lily Flower
  NilLilyPad, // 22: Lily Pad
  NilPondGrass, // 23: Pond Grass
  NilReed, // 24: Reed
  NilPondFishEnemy, // 25: Pond Fish Enemy
  HoneycombPlatform, // 26: Honeycomb platform
  NilHoneyPatch, // 27: Honey Patch
  NilFirecracker, // 28: Firecracker
  NilDetonator, // 29: Detonator
  NilWaxMembrane, // 30: Wax Membrane
  Enemy_Mosquito, // 31: Mosquito Enemy
  NilCheckpoint, // 32: Checkpoint
  NilLawnDoor, // 33: Lawn Door
  NilDock, // 34: Dock
  Foot, // 35: Foot
  Enemy_Spider, // 36: ENEMY: SPIDER
  Enemy_Caterpiller, // 37: ENEMY: CATERPILLER
  NilEnemy_Firefly, // 38: ENEMY: FIREFLY
  NilExitLog, // 39: Exit Log
  NilRootSwing, // 40: Root swing
  NilThornBush, // 41: Thorn Bush
  NilFireFlyTargetLocation, // 42: FireFly Target Location
  NilFireWall, // 43: Fire Wall
  NilWaterValve, // 44: Water Valve
  NilHoneyTube, // 45: Honey Tube
  Enemy_Larva, // 46: ENEMY: LARVA
  NilEnemy_FlyingBee, // 47: ENEMY: FLYING BEE
  Enemy_WorkerBee, // 48: ENEMY: WORKER BEE
  NilEnemy_QueenBee, // 49: ENEMY: QUEEN BEE
  NilRockLedge, // 50: Rock Ledge
  NilStump, // 51: Stump
  NilRollingBoulder, // 52: Rolling Boulder
  Enemy_Roach, // 53: ENEMY: ROACH
  Enemy_Skippy, // 54: ENEMY: SKIPPY
}

export const splineItemTypeNames: Record<SplineItemType, string> = {
  [SplineItemType.NilMyStartCoords]: "My Start Coords",
  [SplineItemType.NilXxxxx]: "xxxxx",
  [SplineItemType.NilSugar]: "Sugar",
  [SplineItemType.Enemy_BoxerFly]: "ENEMY: BOXERFLY",
  [SplineItemType.NilBugTest]: "bug test",
  [SplineItemType.NilClover]: "Clover",
  [SplineItemType.NilGrass]: "Grass",
  [SplineItemType.NilWeed]: "Weed",
  [SplineItemType.Enemy_Slug]: "Slug enemy",
  [SplineItemType.Enemy_Ant]: "Fireant enemy",
  [SplineItemType.NilSunflower]: "Sunflower",
  [SplineItemType.NilCosmo]: "Cosmo",
  [SplineItemType.NilPoppy]: "Poppy",
  [SplineItemType.NilWallEnd]: "Wall End",
  [SplineItemType.NilWaterPatch]: "Water Patch",
  [SplineItemType.NilFireAnt]: "FireAnt",
  [SplineItemType.NilWaterBug]: "WaterBug",
  [SplineItemType.NilTree]: "Tree (flight level)",
  [SplineItemType.NilDragonfly]: "Dragonfly",
  [SplineItemType.NilCatTail]: "Cat Tail",
  [SplineItemType.NilDuckWeed]: "Duck Weed",
  [SplineItemType.NilLilyFlower]: "Lily Flower",
  [SplineItemType.NilLilyPad]: "Lily Pad",
  [SplineItemType.NilPondGrass]: "Pond Grass",
  [SplineItemType.NilReed]: "Reed",
  [SplineItemType.NilPondFishEnemy]: "Pond Fish Enemy",
  [SplineItemType.HoneycombPlatform]: "Honeycomb platform",
  [SplineItemType.NilHoneyPatch]: "Honey Patch",
  [SplineItemType.NilFirecracker]: "Firecracker",
  [SplineItemType.NilDetonator]: "Detonator",
  [SplineItemType.NilWaxMembrane]: "Wax Membrane",
  [SplineItemType.Enemy_Mosquito]: "Mosquito Enemy",
  [SplineItemType.NilCheckpoint]: "Checkpoint",
  [SplineItemType.NilLawnDoor]: "Lawn Door",
  [SplineItemType.NilDock]: "Dock",
  [SplineItemType.Foot]: "Foot",
  [SplineItemType.Enemy_Spider]: "ENEMY: SPIDER",
  [SplineItemType.Enemy_Caterpiller]: "ENEMY: CATERPILLER",
  [SplineItemType.NilEnemy_Firefly]: "ENEMY: FIREFLY",
  [SplineItemType.NilExitLog]: "Exit Log",
  [SplineItemType.NilRootSwing]: "Root swing",
  [SplineItemType.NilThornBush]: "Thorn Bush",
  [SplineItemType.NilFireFlyTargetLocation]: "FireFly Target Location",
  [SplineItemType.NilFireWall]: "Fire Wall",
  [SplineItemType.NilWaterValve]: "Water Valve",
  [SplineItemType.NilHoneyTube]: "Honey Tube",
  [SplineItemType.Enemy_Larva]: "ENEMY: LARVA",
  [SplineItemType.NilEnemy_FlyingBee]: "ENEMY: FLYING BEE",
  [SplineItemType.Enemy_WorkerBee]: "ENEMY: WORKER BEE",
  [SplineItemType.NilEnemy_QueenBee]: "ENEMY: QUEEN BEE",
  [SplineItemType.NilRockLedge]: "Rock Ledge",
  [SplineItemType.NilStump]: "Stump",
  [SplineItemType.NilRollingBoulder]: "Rolling Boulder",
  [SplineItemType.Enemy_Roach]: "ENEMY: ROACH",
  [SplineItemType.Enemy_Skippy]: "ENEMY: SKIPPY",
};
