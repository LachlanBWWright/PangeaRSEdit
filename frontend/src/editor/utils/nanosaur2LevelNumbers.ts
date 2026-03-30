/**
 * Nanosaur 2 level number definitions.
 *
 * Nanosaur 2 supports levels 0–8 via the ?level=N URL parameter.
 */

export interface Nanosaur2LevelInfo {
  readonly levelNumber: number;
  readonly name: string;
  readonly terrainFile: string;
}

export const NANOSAUR2_LEVELS: readonly Nanosaur2LevelInfo[] = [
  { levelNumber: 0, name: "Level 1", terrainFile: "Level1.ter" },
  { levelNumber: 1, name: "Level 2", terrainFile: "Level2.ter" },
  { levelNumber: 2, name: "Level 3", terrainFile: "Level3.ter" },
  { levelNumber: 3, name: "Level 4", terrainFile: "Level4.ter" },
  { levelNumber: 4, name: "Level 5", terrainFile: "Level5.ter" },
  { levelNumber: 5, name: "Level 6", terrainFile: "Level6.ter" },
  { levelNumber: 6, name: "Level 7", terrainFile: "Level7.ter" },
  { levelNumber: 7, name: "Level 8", terrainFile: "Level8.ter" },
  { levelNumber: 8, name: "Level 9", terrainFile: "Level9.ter" },
] satisfies readonly Nanosaur2LevelInfo[];

export const DEFAULT_NANOSAUR2_LEVEL = 0;
