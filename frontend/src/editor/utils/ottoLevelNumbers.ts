/**
 * Otto Matic level number definitions.
 *
 * The game maps levels 0–9 to fixed terrain file names.
 * This must stay in sync with the LEVEL_NUM enum and the
 * `terrainFiles` array in the OttoMatic-Android source
 * (src/Headers/main.h and src/System/File.c).
 */

import { OttoLevelType } from "./levelType";

export interface OttoLevelInfo {
  readonly levelNumber: OttoLevelType;
  readonly name: string;
  readonly terrainFile: string;
}

export const OTTO_LEVELS: readonly OttoLevelInfo[] = [
  { levelNumber: OttoLevelType.EarthFarm, name: "Earth Farm", terrainFile: "EarthFarm.ter" },
  { levelNumber: OttoLevelType.BlobWorld, name: "Blob World", terrainFile: "BlobWorld.ter" },
  { levelNumber: OttoLevelType.BlobBoss, name: "Blob Boss", terrainFile: "BlobBoss.ter" },
  { levelNumber: OttoLevelType.Apocalypse, name: "Apocalypse", terrainFile: "Apocalypse.ter" },
  { levelNumber: OttoLevelType.Cloud, name: "Cloud", terrainFile: "Cloud.ter" },
  { levelNumber: OttoLevelType.Jungle, name: "Jungle", terrainFile: "Jungle.ter" },
  { levelNumber: OttoLevelType.JungleBoss, name: "Jungle Boss", terrainFile: "JungleBoss.ter" },
  { levelNumber: OttoLevelType.FireIce, name: "Fire & Ice", terrainFile: "FireIce.ter" },
  { levelNumber: OttoLevelType.Saucer, name: "Saucer", terrainFile: "Saucer.ter" },
  { levelNumber: OttoLevelType.BrainBoss, name: "Brain Boss", terrainFile: "BrainBoss.ter" },
] satisfies readonly OttoLevelInfo[];

export const DEFAULT_OTTO_LEVEL: OttoLevelType = OttoLevelType.EarthFarm;

export function inferLevelNumberFromFilename(
  filename: string,
): number | undefined {
  const raw = filename.split("/").pop() ?? filename;
  const base = raw.toLowerCase().replace(/\.rsrc$/, "");
  const match = OTTO_LEVELS.find(
    (l) => base === l.terrainFile.toLowerCase(),
  );
  return match?.levelNumber;
}
