/**
 * Mighty Mike level definitions.
 *
 * Mighty Mike has 5 scenes with 3 areas each (15 levels total).
 * The level number is encoded as a flat index: scene * 3 + area.
 * The WASM port launches with --level S:A where S is the scene (0–4)
 * and A is the area (0–2).
 *
 * Scene names from Source/Headers/equates.h:
 *   SCENE_JURASSIC, SCENE_CANDY, SCENE_FAIRY, SCENE_CLOWN, SCENE_BARGAIN
 */

import { MightyMikeLevelType } from "./levelType";

export interface MightyMikeLevelInfo {
  readonly levelNumber: MightyMikeLevelType;
  readonly name: string;
  readonly terrainFile: string;
}

export const MIGHTY_MIKE_LEVELS: readonly MightyMikeLevelInfo[] = [
  { levelNumber: MightyMikeLevelType.Jurassic1, name: "Jurassic 1",        terrainFile: "jurassic.map-1" },
  { levelNumber: MightyMikeLevelType.Jurassic2, name: "Jurassic 2",        terrainFile: "jurassic.map-2" },
  { levelNumber: MightyMikeLevelType.Jurassic3, name: "Jurassic 3",        terrainFile: "jurassic.map-3" },
  { levelNumber: MightyMikeLevelType.Candy1,    name: "Candy 1",           terrainFile: "candy.map-1" },
  { levelNumber: MightyMikeLevelType.Candy2,    name: "Candy 2",           terrainFile: "candy.map-2" },
  { levelNumber: MightyMikeLevelType.Candy3,    name: "Candy 3",           terrainFile: "candy.map-3" },
  { levelNumber: MightyMikeLevelType.Fairy1,    name: "Fairy 1",           terrainFile: "fairy.map-1" },
  { levelNumber: MightyMikeLevelType.Fairy2,    name: "Fairy 2",           terrainFile: "fairy.map-2" },
  { levelNumber: MightyMikeLevelType.Fairy3,    name: "Fairy 3",           terrainFile: "fairy.map-3" },
  { levelNumber: MightyMikeLevelType.Clown1,    name: "Clown 1",           terrainFile: "clown.map-1" },
  { levelNumber: MightyMikeLevelType.Clown2,    name: "Clown 2",           terrainFile: "clown.map-2" },
  { levelNumber: MightyMikeLevelType.Clown3,    name: "Clown 3",           terrainFile: "clown.map-3" },
  { levelNumber: MightyMikeLevelType.Bargain1,  name: "Bargain Basement 1",terrainFile: "bargain.map-1" },
  { levelNumber: MightyMikeLevelType.Bargain2,  name: "Bargain Basement 2",terrainFile: "bargain.map-2" },
  { levelNumber: MightyMikeLevelType.Bargain3,  name: "Bargain Basement 3",terrainFile: "bargain.map-3" },
] satisfies readonly MightyMikeLevelInfo[];

export const DEFAULT_MIGHTY_MIKE_LEVEL: MightyMikeLevelType = MightyMikeLevelType.Jurassic1;

export function inferLevelNumberFromFilename(
  filename: string,
): number | undefined {
  const raw = filename.split("/").pop() ?? filename;
  const base = raw.toLowerCase();
  const match = MIGHTY_MIKE_LEVELS.find(
    (l) => base === l.terrainFile.toLowerCase(),
  );
  return match?.levelNumber;
}
