/**
 * Nanosaur level number definitions.
 * Nanosaur has a single playable level.
 */

import { NanosaurLevelType } from "./levelType";

export interface NanosaurLevelInfo {
  readonly levelNumber: NanosaurLevelType;
  readonly name: string;
  readonly terrainFile: string;
}

export const NANOSAUR_LEVELS: readonly NanosaurLevelInfo[] = [
  { levelNumber: NanosaurLevelType.Nanosaur, name: "Nanosaur", terrainFile: "Nanosaur.trt" },
] satisfies readonly NanosaurLevelInfo[];

export const DEFAULT_NANOSAUR_LEVEL: NanosaurLevelType = NanosaurLevelType.Nanosaur;

export function inferLevelNumberFromFilename(
  filename: string,
): number | undefined {
  const base = filename.split("/").pop() ?? filename;
  const match = NANOSAUR_LEVELS.find(
    (l) => base.toLowerCase() === l.terrainFile.toLowerCase(),
  );
  return match?.levelNumber;
}
