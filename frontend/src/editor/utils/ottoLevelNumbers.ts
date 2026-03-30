/**
 * Otto Matic level number definitions.
 *
 * The game maps levels 0–9 to fixed terrain file names.
 * This must stay in sync with the LEVEL_NUM enum and the
 * `terrainFiles` array in the OttoMatic-Android source
 * (src/Headers/main.h and src/System/File.c).
 */

export interface OttoLevelInfo {
  readonly levelNumber: number;
  readonly name: string;
  readonly terrainFile: string;
}

export const OTTO_LEVELS: readonly OttoLevelInfo[] = [
  { levelNumber: 0, name: "Earth Farm", terrainFile: "EarthFarm.ter" },
  { levelNumber: 1, name: "Blob World", terrainFile: "BlobWorld.ter" },
  { levelNumber: 2, name: "Blob Boss", terrainFile: "BlobBoss.ter" },
  { levelNumber: 3, name: "Apocalypse", terrainFile: "Apocalypse.ter" },
  { levelNumber: 4, name: "Cloud", terrainFile: "Cloud.ter" },
  { levelNumber: 5, name: "Jungle", terrainFile: "Jungle.ter" },
  { levelNumber: 6, name: "Jungle Boss", terrainFile: "JungleBoss.ter" },
  { levelNumber: 7, name: "Fire & Ice", terrainFile: "FireIce.ter" },
  { levelNumber: 8, name: "Saucer", terrainFile: "Saucer.ter" },
  { levelNumber: 9, name: "Brain Boss", terrainFile: "BrainBoss.ter" },
] satisfies readonly OttoLevelInfo[];

export const DEFAULT_OTTO_LEVEL = 0;

export function inferLevelNumberFromFilename(
  filename: string,
): number | undefined {
  const base = filename.split("/").pop() ?? filename;
  const match = OTTO_LEVELS.find(
    (l) => base.toLowerCase() === l.terrainFile.toLowerCase(),
  );
  return match?.levelNumber;
}
