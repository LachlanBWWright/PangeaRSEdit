import { Game } from "@/data/globals/globals";

// LoadLevelArt in the Bugdom and Nanosaur ports; LoadAreaArt in Mighty Mike.
const BUGDOM_FAMILIES = [0, 0, 1, 2, 2, 3, 3, 4, 5, 5];
const BUGDOM_BANKS = ["Lawn_Models1.3dmf", "Pond_Models.3dmf", "Forest_Models.3dmf", "BeeHive_Models.3dmf", "Night_Models.3dmf", "AntHill_Models.3dmf"];
const MIKE_SCENES = ["jurassic", "candy", "fairy", "clown", "bargain"];
const BUGDOM_SKELETONS = ["BoxerFly", "DoodleBug", "Slug", "Ant", "WingedFireAnt", "WaterBug", "DragonFly", "PondFish", "Mosquito", "Foot", "Spider", "Caterpillar", "FireFly", "Bat", "LadyBug", "RootSwing", "AntKing", "Larva", "FlyingBee", "WorkerBee", "QueenBee", "Roach", "Buddy", "Skippy"];
const BUGDOM_FAMILY_SKELETONS: readonly (readonly number[])[] = [
  [0, 2, 3], [8, 5, 7, 23, 2], [6, 9, 10, 11, 13, 18, 3],
  [17, 18, 19, 20], [4, 12, 11, 2, 21, 3], [2, 3, 4, 15, 21],
];
const NANOSAUR_SKELETONS = ["Ptera", "Rex", "Stego", "Deinon", "Tricer", "Diloph"];

export const CLASSIC_NATIVE_MODEL_COUNTS: Readonly<Record<string, number>> = {
  "Global_Models1.3dmf": 14,
  "Global_Models2.3dmf": 15,
  "Lawn_Models1.3dmf": 29,
  "Lawn_Models2.3dmf": 34,
  "Pond_Models.3dmf": 25,
  "Forest_Models.3dmf": 27,
  "BeeHive_Models.3dmf": 81,
  "Night_Models.3dmf": 39,
  "AntHill_Models.3dmf": 22,
  "Global_Models.3dmf": 37,
  "Level1_Models.3dmf": 30,
};

export const CLASSIC_NATIVE_SKELETON_ANIMATIONS: Readonly<Record<string, number>> = {
  BoxerFly: 3, DoodleBug: 21, Slug: 1, Ant: 10, WingedFireAnt: 8,
  WaterBug: 5, DragonFly: 2, PondFish: 3, Mosquito: 5, Foot: 3,
  Spider: 8, Caterpillar: 1, FireFly: 1, Bat: 3, LadyBug: 5,
  RootSwing: 1, AntKing: 6, Larva: 4, FlyingBee: 4, WorkerBee: 5,
  QueenBee: 5, Roach: 4, Buddy: 1, Skippy: 2,
  Ptera: 3, Rex: 4, Stego: 3, Deinon: 15, Tricer: 2, Diloph: 3,
};

export function isClassicNativeLevel(game: Game, level: number): boolean {
  if (!Number.isInteger(level) || level < 0) return false;
  if (game === Game.BUGDOM) return level < 10;
  if (game === Game.NANOSAUR) return level === 0;
  if (game === Game.MIGHTY_MIKE) return level < 15;
  return false;
}

export function getClassicNativeBank(game: Game, group: string, level: number): string | null {
  if (!isClassicNativeLevel(game, level)) return null;
  if (game === Game.BUGDOM) {
    if (group === "global") return "Global_Models1.3dmf";
    if (group === "global2") return "Global_Models2.3dmf";
    const family = BUGDOM_FAMILIES[level];
    if (group === "levelSpecific" && family !== undefined) return BUGDOM_BANKS[family] ?? null;
    if (group === "levelSpecific2" && family === 0) return "Lawn_Models2.3dmf";
    return null;
  }
  if (game === Game.NANOSAUR) {
    if (group === "global") return "Global_Models.3dmf";
    return group === "levelSpecific" ? "Level1_Models.3dmf" : null;
  }
  if (game === Game.MIGHTY_MIKE) {
    if (group === "global") return "main.shapes";
    if (group === "weapons") return "weapon.shapes";
    const scene = MIKE_SCENES[Math.floor(level / 3)];
    if (scene && group === "levelSpecific") return `${scene}1.shapes`;
    if (scene && group === "levelSpecific2") return `${scene}2.shapes`;
  }
  return null;
}

export function getClassicSkeletonBank(game: Game, type: number, level: number): string | null {
  if (!isClassicNativeLevel(game, level) || !Number.isInteger(type) || type < 0) return null;
  if (game === Game.NANOSAUR) return NANOSAUR_SKELETONS[type] ?? null;
  if (game !== Game.BUGDOM) return null;
  const family = BUGDOM_FAMILIES[level];
  const loaded = family === undefined ? [] : BUGDOM_FAMILY_SKELETONS[family] ?? [];
  if ([1, 14, 22].includes(type) || loaded.includes(type) || (type === 16 && level === 9)) {
    return BUGDOM_SKELETONS[type] ?? null;
  }
  return null;
}

// Counts from the bundled Shapes animation lists, checked against the parser in tests.
export const MIKE_NATIVE_ANIMATIONS: Readonly<Record<string, readonly number[]>> = {
  "main.shapes": [56, 1, 5, 1, 1, 9, 2, 1, 1, 6],
  "weapon.shapes": [8, 2, 1, 1, 5, 2, 3, 1, 1, 9, 17, 4, 4, 1, 6, 2, 9, 1, 2],
  "jurassic1.shapes": [7, 4, 2, 1, 4],
  "jurassic2.shapes": [3, 4, 3, 4, 2, 6, 2],
  "candy1.shapes": [1, 2, 3, 5],
  "candy2.shapes": [5, 6, 6, 1, 9, 2, 1],
  "fairy1.shapes": [3, 4, 3, 2, 2],
  "fairy2.shapes": [4, 3, 8, 4, 2, 6, 1],
  "clown1.shapes": [7, 4],
  "clown2.shapes": [2, 6, 2, 2, 2, 6, 12],
  "bargain1.shapes": [8, 2, 4, 1, 9],
  "bargain2.shapes": [5, 7, 2, 6, 1, 2, 16],
};
