/**
 * Cro-Mag Rally track number definitions.
 *
 * Cro-Mag Rally uses 1-based track numbers (?track=N, 1–17).
 * Internally the game stores 0-based indices (TRACK_NUM_DESERT = 0 … TRACK_NUM_RAMPS = 16).
 * The ?track=N URL parameter controls which track loads at startup.
 * Cars are selected via ?car=N (1-based, 0 = random).
 */

import { CroMagLevelType } from "./levelType";

export interface CroMagTrackInfo {
  readonly trackNumber: CroMagLevelType; // 1-based track number
  readonly name: string;
  /** Original Mac terrain file name (used for matching user-loaded files). */
  readonly terrainFile: string;
  /**
   * Terrain file name as it appears in the web-port VFS.
   * The web build uses prefixed names like "StoneAge_Desert.ter" instead of
   * the Mac originals like "Desert.ter", so injection must use this name.
   */
  readonly vfsTerrainFile: string;
}

export const CROMAG_TRACKS: readonly CroMagTrackInfo[] = [
  // Stone Age (tracks 1–3)
  {
    trackNumber: CroMagLevelType.Desert,
    name: "Stone Age Desert",
    terrainFile: "Desert.ter",
    vfsTerrainFile: "StoneAge_Desert.ter",
  },
  {
    trackNumber: CroMagLevelType.Jungle,
    name: "Stone Age Jungle",
    terrainFile: "Jungle.ter",
    vfsTerrainFile: "StoneAge_Jungle.ter",
  },
  {
    trackNumber: CroMagLevelType.Ice,
    name: "Stone Age Ice",
    terrainFile: "Ice.ter",
    vfsTerrainFile: "StoneAge_Ice.ter",
  },
  // Bronze Age (tracks 4–6)
  {
    trackNumber: CroMagLevelType.Crete,
    name: "Bronze Age Crete",
    terrainFile: "Crete.ter",
    vfsTerrainFile: "BronzeAge_Crete.ter",
  },
  {
    trackNumber: CroMagLevelType.China,
    name: "Bronze Age China",
    terrainFile: "China.ter",
    vfsTerrainFile: "BronzeAge_China.ter",
  },
  {
    trackNumber: CroMagLevelType.Egypt,
    name: "Bronze Age Egypt",
    terrainFile: "Egypt.ter",
    vfsTerrainFile: "BronzeAge_Egypt.ter",
  },
  // Iron Age (tracks 7–9)
  {
    trackNumber: CroMagLevelType.Europe,
    name: "Iron Age Europe",
    terrainFile: "Europe.ter",
    vfsTerrainFile: "IronAge_Europe.ter",
  },
  {
    trackNumber: CroMagLevelType.Scandinavia,
    name: "Iron Age Scandinavia",
    terrainFile: "Scandinavia.ter",
    vfsTerrainFile: "IronAge_Scandinavia.ter",
  },
  {
    trackNumber: CroMagLevelType.Atlantis,
    name: "Iron Age Atlantis",
    terrainFile: "Atlantis.ter",
    vfsTerrainFile: "IronAge_Atlantis.ter",
  },
  // Battle arenas (tracks 10–17)
  {
    trackNumber: CroMagLevelType.Stonehenge,
    name: "Battle: Stonehenge",
    terrainFile: "Stonehenge.ter",
    vfsTerrainFile: "Battle_StoneHenge.ter",
  },
  {
    trackNumber: CroMagLevelType.Aztec,
    name: "Battle: Aztec",
    terrainFile: "Aztec.ter",
    vfsTerrainFile: "Battle_Aztec.ter",
  },
  {
    trackNumber: CroMagLevelType.Coliseum,
    name: "Battle: Coliseum",
    terrainFile: "Coliseum.ter",
    vfsTerrainFile: "Battle_Coliseum.ter",
  },
  {
    trackNumber: CroMagLevelType.Maze,
    name: "Battle: Maze",
    terrainFile: "Maze.ter",
    vfsTerrainFile: "Battle_Maze.ter",
  },
  {
    trackNumber: CroMagLevelType.Celtic,
    name: "Battle: Celtic",
    terrainFile: "Celtic.ter",
    vfsTerrainFile: "Battle_Celtic.ter",
  },
  {
    trackNumber: CroMagLevelType.TarPits,
    name: "Battle: Tar Pits",
    terrainFile: "TarPits.ter",
    vfsTerrainFile: "Battle_TarPits.ter",
  },
  {
    trackNumber: CroMagLevelType.Spiral,
    name: "Battle: Spiral",
    terrainFile: "Spiral.ter",
    vfsTerrainFile: "Battle_Spiral.ter",
  },
  {
    trackNumber: CroMagLevelType.Ramps,
    name: "Battle: Ramps",
    terrainFile: "Ramps.ter",
    vfsTerrainFile: "Battle_Ramps.ter",
  },
] satisfies readonly CroMagTrackInfo[];

/**
 * Maps an original Mac terrain file name to its VFS equivalent in the web build.
 * Falls back to the input unchanged if no mapping exists.
 */
export function getCroMagVfsTerrainFile(terrainFile: string): string {
  return (
    CROMAG_TRACKS.find((t) => t.terrainFile === terrainFile)?.vfsTerrainFile ??
    terrainFile
  );
}

export const DEFAULT_CROMAG_TRACK: CroMagLevelType = CroMagLevelType.Desert;

export function inferLevelNumberFromFilename(
  filename: string,
): number | undefined {
  const raw = filename.split("/").pop() ?? filename;
  const base = raw.toLowerCase().replace(/\.rsrc$/, "");
  const match = CROMAG_TRACKS.find(
    (t) =>
      base === t.terrainFile.toLowerCase() ||
      base === t.vfsTerrainFile.toLowerCase(),
  );
  return match?.trackNumber;
}
