/**
 * Bugdom 2 level number definitions.
 *
 * Bugdom 2 supports levels 0–9 via the ?level=N URL parameter.
 * Terrain file names are inferred from the game source (Bugdom2-Android).
 */

import { Bugdom2LevelType } from "./levelType";

export interface Bugdom2LevelInfo {
  readonly levelNumber: Bugdom2LevelType;
  readonly name: string;
  readonly terrainFile: string;
}

export const BUGDOM2_LEVELS: readonly Bugdom2LevelInfo[] = [
  { levelNumber: Bugdom2LevelType.Garden, name: "Garden", terrainFile: "Level1_Garden.ter" },
  { levelNumber: Bugdom2LevelType.SlimePit, name: "Slime Pit", terrainFile: "Level2_SlimePit.ter" },
  { levelNumber: Bugdom2LevelType.GarbageCan, name: "Garbage Can", terrainFile: "Level3_GarbageCan.ter" },
  { levelNumber: Bugdom2LevelType.Culvert, name: "Culvert", terrainFile: "Level4_Culvert.ter" },
  { levelNumber: Bugdom2LevelType.Closet, name: "Closet", terrainFile: "Level5_Closet.ter" },
  { levelNumber: Bugdom2LevelType.Attic, name: "Attic", terrainFile: "Level6_Attic.ter" },
  { levelNumber: Bugdom2LevelType.Basement, name: "Basement", terrainFile: "Level7_Basement.ter" },
  { levelNumber: Bugdom2LevelType.GarbageDump, name: "Garbage Dump", terrainFile: "Level8_GarbageDump.ter" },
  { levelNumber: Bugdom2LevelType.Kingdom, name: "Kingdom", terrainFile: "Level9_Kingdom.ter" },
  { levelNumber: Bugdom2LevelType.FinalBattle, name: "Final Battle", terrainFile: "Level10_FinalBattle.ter" },
] satisfies readonly Bugdom2LevelInfo[];

export const DEFAULT_BUGDOM2_LEVEL: Bugdom2LevelType = Bugdom2LevelType.Garden;

export function inferLevelNumberFromFilename(
  filename: string,
): number | undefined {
  const raw = filename.split("/").pop() ?? filename;
  const base = raw.toLowerCase().replace(/\.rsrc$/, "");
  const match = BUGDOM2_LEVELS.find(
    (l) => base === l.terrainFile.toLowerCase(),
  );
  return match?.levelNumber;
}
