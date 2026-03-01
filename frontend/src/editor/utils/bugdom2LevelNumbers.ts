/**
 * Bugdom 2 level number definitions.
 *
 * Bugdom 2 supports levels 0–9 via the ?level=N URL parameter.
 * Terrain file names are inferred from the game source (Bugdom2-Android).
 */

export interface Bugdom2LevelInfo {
  readonly levelNumber: number;
  readonly name: string;
  readonly terrainFile: string;
}

export const BUGDOM2_LEVELS: readonly Bugdom2LevelInfo[] = [
  { levelNumber: 0, name: "Garden", terrainFile: "Level1_Garden.ter" },
  { levelNumber: 1, name: "Slime Pit", terrainFile: "Level2_SlimePit.ter" },
  { levelNumber: 2, name: "Garbage Can", terrainFile: "Level3_GarbageCan.ter" },
  { levelNumber: 3, name: "Culvert", terrainFile: "Level4_Culvert.ter" },
  { levelNumber: 4, name: "Closet", terrainFile: "Level5_Closet.ter" },
  { levelNumber: 5, name: "Attic", terrainFile: "Level6_Attic.ter" },
  { levelNumber: 6, name: "Basement", terrainFile: "Level7_Basement.ter" },
  { levelNumber: 7, name: "Garbage Dump", terrainFile: "Level8_GarbageDump.ter" },
  { levelNumber: 8, name: "Kingdom", terrainFile: "Level9_Kingdom.ter" },
  { levelNumber: 9, name: "Final Battle", terrainFile: "Level10_FinalBattle.ter" },
] satisfies readonly Bugdom2LevelInfo[];

export const DEFAULT_BUGDOM2_LEVEL = 0;
