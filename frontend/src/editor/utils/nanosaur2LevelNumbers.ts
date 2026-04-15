/**
 * Nanosaur 2 level number definitions.
 *
 * Nanosaur 2 supports levels 0–8 via the ?level=N URL parameter.
 */

import { Nanosaur2LevelType } from "./levelType";

export interface Nanosaur2LevelInfo {
  readonly levelNumber: Nanosaur2LevelType;
  readonly name: string;
  readonly terrainFile: string;
}

export const NANOSAUR2_LEVELS: readonly Nanosaur2LevelInfo[] = [
  { levelNumber: Nanosaur2LevelType.Level1, name: "Level 1", terrainFile: "Level1.ter" },
  { levelNumber: Nanosaur2LevelType.Level2, name: "Level 2", terrainFile: "Level2.ter" },
  { levelNumber: Nanosaur2LevelType.Level3, name: "Level 3", terrainFile: "Level3.ter" },
  { levelNumber: Nanosaur2LevelType.Level4, name: "Level 4", terrainFile: "Level4.ter" },
  { levelNumber: Nanosaur2LevelType.Level5, name: "Level 5", terrainFile: "Level5.ter" },
  { levelNumber: Nanosaur2LevelType.Level6, name: "Level 6", terrainFile: "Level6.ter" },
  { levelNumber: Nanosaur2LevelType.Level7, name: "Level 7", terrainFile: "Level7.ter" },
  { levelNumber: Nanosaur2LevelType.Level8, name: "Level 8", terrainFile: "Level8.ter" },
  { levelNumber: Nanosaur2LevelType.Level9, name: "Level 9", terrainFile: "Level9.ter" },
] satisfies readonly Nanosaur2LevelInfo[];

export const DEFAULT_NANOSAUR2_LEVEL: Nanosaur2LevelType = Nanosaur2LevelType.Level1;

export function inferLevelNumberFromFilename(
  filename: string,
): number | undefined {
  const base = filename.split("/").pop() ?? filename;
  const match = NANOSAUR2_LEVELS.find(
    (l) => base.toLowerCase() === l.terrainFile.toLowerCase(),
  );
  return match?.levelNumber;
}
