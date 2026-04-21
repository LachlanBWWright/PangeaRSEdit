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
  const raw = filename.split("/").pop() ?? filename;
  const base = raw.toLowerCase().replace(/\.rsrc$/, "");
  const match = NANOSAUR_LEVELS.find(
    (l) => base === l.terrainFile.toLowerCase(),
  );
  return match?.levelNumber;
}
