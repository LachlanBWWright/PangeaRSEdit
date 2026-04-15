/**
 * Nanosaur 2 level number definitions.
 *
 * Level names and terrain filenames from Source/System/LoadLevel.c (kLevelNames[]).
 * Level indices from Source/Headers/main.h (LEVEL_NUM_* enum).
 * Nanosaur 2 supports levels 0–8 via the ?level=N URL parameter.
 */

import { Nanosaur2LevelType } from "./levelType";

export interface Nanosaur2LevelInfo {
  readonly levelNumber: Nanosaur2LevelType;
  readonly name: string;
  readonly terrainFile: string;
}

export const NANOSAUR2_LEVELS: readonly Nanosaur2LevelInfo[] = [
  { levelNumber: Nanosaur2LevelType.Adventure1, name: "Adventure 1", terrainFile: "level1.ter" },
  { levelNumber: Nanosaur2LevelType.Adventure2, name: "Adventure 2", terrainFile: "level2.ter" },
  { levelNumber: Nanosaur2LevelType.Adventure3, name: "Adventure 3", terrainFile: "level3.ter" },
  { levelNumber: Nanosaur2LevelType.Race1,      name: "Race 1",      terrainFile: "race1.ter" },
  { levelNumber: Nanosaur2LevelType.Race2,      name: "Race 2",      terrainFile: "race2.ter" },
  { levelNumber: Nanosaur2LevelType.Battle1,    name: "Battle 1",    terrainFile: "battle1.ter" },
  { levelNumber: Nanosaur2LevelType.Battle2,    name: "Battle 2",    terrainFile: "battle2.ter" },
  { levelNumber: Nanosaur2LevelType.Flag1,      name: "Capture the Flag 1", terrainFile: "flag1.ter" },
  { levelNumber: Nanosaur2LevelType.Flag2,      name: "Capture the Flag 2", terrainFile: "flag2.ter" },
] satisfies readonly Nanosaur2LevelInfo[];

export const DEFAULT_NANOSAUR2_LEVEL: Nanosaur2LevelType = Nanosaur2LevelType.Adventure1;

export function inferLevelNumberFromFilename(
  filename: string,
): number | undefined {
  const raw = filename.split("/").pop() ?? filename;
  const base = raw.toLowerCase().replace(/\.rsrc$/, "");
  const match = NANOSAUR2_LEVELS.find(
    (l) => base === l.terrainFile.toLowerCase(),
  );
  return match?.levelNumber;
}
