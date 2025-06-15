import { ItemParams } from "./itemParams";

export enum ItemType {
  StartCoords, // My Start Coords
  LadyBugBonus, // 1: LadyBug Bonus
  Nut, // 2: Nut
  Enemy_BoxerFly, // 3: ENEMY: BOXERFLY
  Rock, // 4: Rock
  Clover, // 5: Clover
  Grass, // 6: Grass
  Weed, // 7: Weed
  SlugEnemy, // 8: Slug enemy
  Enemy_Ant, // 9: Ant
  SunFlower, // 10: Sunflower
  Cosmo, // 11: Cosmo
  Poppy, // 12: Poppy
  WallEnd, // 13: Wall End
  WaterPatch, // 14: Water Patch
  Enemy_FireAnt, // 15: FireAnt
  WaterBug, // 16: WaterBug
  Tree, // 17: Tree (flight level)
  DragonFly, // 18: Dragonfly
  CatTail, // 19: Cat Tail
  DuckWeed, // 20: Duck Weed
  LilyFlower, // 21: Lily Flower
  LilyPad, // 22: Lily Pad
  PondGrass, // 23: Pond Grass
  Reed, // 24: Reed
  Enemy_PondFish, // 25: Pond Fish Enemy
  HoneycombPlatform, // 26: Honeycomb platform
  HoneyPatch, // 27: Honey Patch
  Firecracker, // 28: Firecracker
  Detonator, // 29: Detonator
  HiveDoor, // 30: Hive Door
  Enemy_Mosquito, // 31: Mosquito Enemy
  Checkpoint, // 32: Checkpoint
  LawnDoor, // 33: Lawn Door
  Dock, // 34: Dock
  Foot, // 35: Foot
  Enemy_Spider, // 36: ENEMY: SPIDER
  Enemy_Caterpiller, // 37: ENEMY: CATERPILLER
  FireFly, // 38: Firefly
  ExitLog, // 39: Exit Log
  RootSwing, // 40: Root swing
  Thorn, // 41: Thorn Bush
  FireFlyTargetLocation, // 42: FireFly Target Location
  FireWall, // 43: Fire Wall
  WaterValve, // 44: Water Valve
  HoneyTube, // 45: Honey Tube
  Enemy_Larva, // 46: ENEMY: LARVA
  Enemy_FlyingBee, // 47: ENEMY: FLYING BEE
  Enemy_WorkerBee, // 48: ENEMY: WORKER BEE
  Enemy_QueenBee, // 49: ENEMY: QUEEN BEE
  RockLedge, // 50: Rock Ledge
  Stump, // 51: Stump
  RollingBoulder, // 52: Rolling Boulder
  Enemy_Roach, // 53: ENEMY: ROACH
  Enemy_Skippy, // 54: ENEMY: SKIPPY
  SlimePatch, // 55: Slime Patch
  LavaPatch, // 56: Lava Patch
  BentAntPipe, // 57: Bent Ant Pipe
  HorizAntPipe, // 58: Horiz Ant Pipe
  Enemy_KingAnt, // 59: ENEMY: KING ANT
  Faucet, // 60: Water Faucet
  WoodPost, // 61: Wooden Post
  FloorSpike, // 62: Floor Spike
  KingWaterPipe, // 63: King Water Pipe
}

export const itemTypeNames: Record<ItemType, string> = {
  [ItemType.StartCoords]: "My Start Coords",
  [ItemType.LadyBugBonus]: "LadyBug Bonus",
  [ItemType.Nut]: "Nut",
  [ItemType.Enemy_BoxerFly]: "ENEMY: BOXERFLY",
  [ItemType.Rock]: "Rock",
  [ItemType.Clover]: "Clover",
  [ItemType.Grass]: "Grass",
  [ItemType.Weed]: "Weed",
  [ItemType.SlugEnemy]: "Slug enemy",
  [ItemType.Enemy_Ant]: "Ant",
  [ItemType.SunFlower]: "Sunflower",
  [ItemType.Cosmo]: "Cosmo",
  [ItemType.Poppy]: "Poppy",
  [ItemType.WallEnd]: "Wall End",
  [ItemType.WaterPatch]: "Water Patch",
  [ItemType.Enemy_FireAnt]: "FireAnt",
  [ItemType.WaterBug]: "WaterBug",
  [ItemType.Tree]: "Tree (flight level)",
  [ItemType.DragonFly]: "Dragonfly",
  [ItemType.CatTail]: "Cat Tail",
  [ItemType.DuckWeed]: "Duck Weed",
  [ItemType.LilyFlower]: "Lily Flower",
  [ItemType.LilyPad]: "Lily Pad",
  [ItemType.PondGrass]: "Pond Grass",
  [ItemType.Reed]: "Reed",
  [ItemType.Enemy_PondFish]: "Pond Fish Enemy",
  [ItemType.HoneycombPlatform]: "Honeycomb platform",
  [ItemType.HoneyPatch]: "Honey Patch",
  [ItemType.Firecracker]: "Firecracker",
  [ItemType.Detonator]: "Detonator",
  [ItemType.HiveDoor]: "Hive Door",
  [ItemType.Enemy_Mosquito]: "Mosquito Enemy",
  [ItemType.Checkpoint]: "Checkpoint",
  [ItemType.LawnDoor]: "Lawn Door",
  [ItemType.Dock]: "Dock",
  [ItemType.Foot]: "Foot",
  [ItemType.Enemy_Spider]: "ENEMY: SPIDER",
  [ItemType.Enemy_Caterpiller]: "ENEMY: CATERPILLER",
  [ItemType.FireFly]: "Firefly",
  [ItemType.ExitLog]: "Exit Log",
  [ItemType.RootSwing]: "Root swing",
  [ItemType.Thorn]: "Thorn Bush",
  [ItemType.FireFlyTargetLocation]: "FireFly Target Location",
  [ItemType.FireWall]: "Fire Wall",
  [ItemType.WaterValve]: "Water Valve",
  [ItemType.HoneyTube]: "Honey Tube",
  [ItemType.Enemy_Larva]: "ENEMY: LARVA",
  [ItemType.Enemy_FlyingBee]: "ENEMY: FLYING BEE",
  [ItemType.Enemy_WorkerBee]: "ENEMY: WORKER BEE",
  [ItemType.Enemy_QueenBee]: "ENEMY: QUEEN BEE",
  [ItemType.RockLedge]: "Rock Ledge",
  [ItemType.Stump]: "Stump",
  [ItemType.RollingBoulder]: "Rolling Boulder",
  [ItemType.Enemy_Roach]: "ENEMY: ROACH",
  [ItemType.Enemy_Skippy]: "ENEMY: SKIPPY",
  [ItemType.SlimePatch]: "Slime Patch",
  [ItemType.LavaPatch]: "Lava Patch",
  [ItemType.BentAntPipe]: "Bent Ant Pipe",
  [ItemType.HorizAntPipe]: "Horiz Ant Pipe",
  [ItemType.Enemy_KingAnt]: "ENEMY: KING ANT",
  [ItemType.Faucet]: "Water Faucet",
  [ItemType.WoodPost]: "Wooden Post",
  [ItemType.FloorSpike]: "Floor Spike",
  [ItemType.KingWaterPipe]: "King Water Pipe",
};

export type BugdomItemParams = ItemParams;

const bugdomDefaultParams: BugdomItemParams = {
  flags: "Unknown",
  p0: "Unknown",
  p1: "Unknown",
  p2: "Unknown",
  p3: "Unknown",
};

export const bugdomItemTypeParams: Record<ItemType, BugdomItemParams> = {
  [ItemType.StartCoords]: bugdomDefaultParams,
  [ItemType.LadyBugBonus]: bugdomDefaultParams,
  [ItemType.Nut]: bugdomDefaultParams,
  [ItemType.Enemy_BoxerFly]: bugdomDefaultParams,
  [ItemType.Rock]: bugdomDefaultParams,
  [ItemType.Clover]: bugdomDefaultParams,
  [ItemType.Grass]: bugdomDefaultParams,
  [ItemType.Weed]: bugdomDefaultParams,
  [ItemType.SlugEnemy]: bugdomDefaultParams,
  [ItemType.Enemy_Ant]: bugdomDefaultParams,
  [ItemType.SunFlower]: bugdomDefaultParams,
  [ItemType.Cosmo]: bugdomDefaultParams,
  [ItemType.Poppy]: bugdomDefaultParams,
  [ItemType.WallEnd]: bugdomDefaultParams,
  [ItemType.WaterPatch]: bugdomDefaultParams,
  [ItemType.Enemy_FireAnt]: bugdomDefaultParams,
  [ItemType.WaterBug]: bugdomDefaultParams,
  [ItemType.Tree]: bugdomDefaultParams,
  [ItemType.DragonFly]: bugdomDefaultParams,
  [ItemType.CatTail]: bugdomDefaultParams,
  [ItemType.DuckWeed]: bugdomDefaultParams,
  [ItemType.LilyFlower]: bugdomDefaultParams,
  [ItemType.LilyPad]: bugdomDefaultParams,
  [ItemType.PondGrass]: bugdomDefaultParams,
  [ItemType.Reed]: bugdomDefaultParams,
  [ItemType.Enemy_PondFish]: bugdomDefaultParams,
  [ItemType.HoneycombPlatform]: bugdomDefaultParams,
  [ItemType.HoneyPatch]: bugdomDefaultParams,
  [ItemType.Firecracker]: bugdomDefaultParams,
  [ItemType.Detonator]: bugdomDefaultParams,
  [ItemType.HiveDoor]: bugdomDefaultParams,
  [ItemType.Enemy_Mosquito]: bugdomDefaultParams,
  [ItemType.Checkpoint]: bugdomDefaultParams,
  [ItemType.LawnDoor]: bugdomDefaultParams,
  [ItemType.Dock]: bugdomDefaultParams,
  [ItemType.Foot]: bugdomDefaultParams,
  [ItemType.Enemy_Spider]: bugdomDefaultParams,
  [ItemType.Enemy_Caterpiller]: bugdomDefaultParams,
  [ItemType.FireFly]: bugdomDefaultParams,
  [ItemType.ExitLog]: bugdomDefaultParams,
  [ItemType.RootSwing]: bugdomDefaultParams,
  [ItemType.Thorn]: bugdomDefaultParams,
  [ItemType.FireFlyTargetLocation]: bugdomDefaultParams,
  [ItemType.FireWall]: bugdomDefaultParams,
  [ItemType.WaterValve]: bugdomDefaultParams,
  [ItemType.HoneyTube]: bugdomDefaultParams,
  [ItemType.Enemy_Larva]: bugdomDefaultParams,
  [ItemType.Enemy_FlyingBee]: bugdomDefaultParams,
  [ItemType.Enemy_WorkerBee]: bugdomDefaultParams,
  [ItemType.Enemy_QueenBee]: bugdomDefaultParams,
  [ItemType.RockLedge]: bugdomDefaultParams,
  [ItemType.Stump]: bugdomDefaultParams,
  [ItemType.RollingBoulder]: bugdomDefaultParams,
  [ItemType.Enemy_Roach]: bugdomDefaultParams,
  [ItemType.Enemy_Skippy]: bugdomDefaultParams,
  [ItemType.SlimePatch]: bugdomDefaultParams,
  [ItemType.LavaPatch]: bugdomDefaultParams,
  [ItemType.BentAntPipe]: bugdomDefaultParams,
  [ItemType.HorizAntPipe]: bugdomDefaultParams,
  [ItemType.Enemy_KingAnt]: bugdomDefaultParams,
  [ItemType.Faucet]: bugdomDefaultParams,
  [ItemType.WoodPost]: bugdomDefaultParams,
  [ItemType.FloorSpike]: bugdomDefaultParams,
  [ItemType.KingWaterPipe]: bugdomDefaultParams,
};
