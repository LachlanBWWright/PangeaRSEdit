/**
 * Nanosaur level number definitions.
 * Nanosaur has a single playable level.
 */

export interface NanosaurLevelInfo {
  readonly levelNumber: number;
  readonly name: string;
  readonly terrainFile: string;
}

export const NANOSAUR_LEVELS: readonly NanosaurLevelInfo[] = [
  { levelNumber: 0, name: "Nanosaur", terrainFile: "Nanosaur.trt" },
] satisfies readonly NanosaurLevelInfo[];

export const DEFAULT_NANOSAUR_LEVEL = 0;
