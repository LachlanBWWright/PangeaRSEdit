/**
 * Bugdom level number definitions.
 *
 * Level names and terrain file paths match the Bugdom source
 * (src/Headers/main.h and Bugdom-android repo).
 */

export interface BugdomLevelInfo {
  readonly levelNumber: number;
  readonly name: string;
  readonly terrainFile: string;
}

export const BUGDOM_LEVELS: readonly BugdomLevelInfo[] = [
  { levelNumber: 0, name: "Training", terrainFile: "Lawn.ter" },
  { levelNumber: 1, name: "Lawn", terrainFile: "Lawn.ter" },
  { levelNumber: 2, name: "Pond", terrainFile: "Pond.ter" },
  { levelNumber: 3, name: "Forest", terrainFile: "Forest.ter" },
  { levelNumber: 4, name: "Hive Attack", terrainFile: "Hive.ter" },
  { levelNumber: 5, name: "Bee Hive", terrainFile: "Hive.ter" },
  { levelNumber: 6, name: "Queen Bee", terrainFile: "Hive.ter" },
  { levelNumber: 7, name: "Night Attack", terrainFile: "Night.ter" },
  { levelNumber: 8, name: "Ant Hill", terrainFile: "Anthill.ter" },
  { levelNumber: 9, name: "Ant King", terrainFile: "Anthill.ter" },
] satisfies readonly BugdomLevelInfo[];

export const DEFAULT_BUGDOM_LEVEL = 0;
