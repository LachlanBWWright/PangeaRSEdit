/**
 * Bugdom level number definitions.
 *
 * Level names and terrain file paths match the Bugdom source
 * (src/Headers/main.h and Bugdom-android repo).
 */

import { BugdomLevelType } from "./levelType";

export interface BugdomLevelInfo {
  readonly levelNumber: BugdomLevelType;
  readonly name: string;
  readonly terrainFile: string;
}

export const BUGDOM_LEVELS: readonly BugdomLevelInfo[] = [
  { levelNumber: BugdomLevelType.Training,   name: "Training",    terrainFile: "Training.ter" },
  { levelNumber: BugdomLevelType.Lawn,       name: "Lawn",        terrainFile: "Lawn.ter" },
  { levelNumber: BugdomLevelType.Pond,       name: "Pond",        terrainFile: "Pond.ter" },
  { levelNumber: BugdomLevelType.Forest,     name: "Forest",      terrainFile: "Beach.ter" },
  { levelNumber: BugdomLevelType.HiveAttack, name: "Hive Attack", terrainFile: "Flight.ter" },
  { levelNumber: BugdomLevelType.BeeHive,    name: "Bee Hive",    terrainFile: "BeeHive.ter" },
  { levelNumber: BugdomLevelType.QueenBee,   name: "Queen Bee",   terrainFile: "QueenBee.ter" },
  { levelNumber: BugdomLevelType.NightAttack,name: "Night Attack",terrainFile: "Night.ter" },
  { levelNumber: BugdomLevelType.AntHill,    name: "Ant Hill",    terrainFile: "AntHill.ter" },
  { levelNumber: BugdomLevelType.AntKing,    name: "Ant King",    terrainFile: "AntKing.ter" },
] satisfies readonly BugdomLevelInfo[];

export const DEFAULT_BUGDOM_LEVEL: BugdomLevelType = BugdomLevelType.Training;

export function inferLevelNumberFromFilename(
  filename: string,
): number | undefined {
  const raw = filename.split("/").pop() ?? filename;
  const base = raw.toLowerCase().replace(/\.rsrc$/, "");
  const match = BUGDOM_LEVELS.find(
    (l) => base === l.terrainFile.toLowerCase(),
  );
  return match?.levelNumber;
}
