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
  readonly terrainFile: string;
}

export const CROMAG_TRACKS: readonly CroMagTrackInfo[] = [
  // Stone Age (tracks 1–3)
  { trackNumber: CroMagLevelType.Desert,       name: "Stone Age Desert",     terrainFile: "Desert.ter" },
  { trackNumber: CroMagLevelType.Jungle,       name: "Stone Age Jungle",     terrainFile: "Jungle.ter" },
  { trackNumber: CroMagLevelType.Ice,          name: "Stone Age Ice",        terrainFile: "Ice.ter" },
  // Bronze Age (tracks 4–6)
  { trackNumber: CroMagLevelType.Crete,        name: "Bronze Age Crete",     terrainFile: "Crete.ter" },
  { trackNumber: CroMagLevelType.China,        name: "Bronze Age China",     terrainFile: "China.ter" },
  { trackNumber: CroMagLevelType.Egypt,        name: "Bronze Age Egypt",     terrainFile: "Egypt.ter" },
  // Iron Age (tracks 7–9)
  { trackNumber: CroMagLevelType.Europe,       name: "Iron Age Europe",      terrainFile: "Europe.ter" },
  { trackNumber: CroMagLevelType.Scandinavia,  name: "Iron Age Scandinavia", terrainFile: "Scandinavia.ter" },
  { trackNumber: CroMagLevelType.Atlantis,     name: "Iron Age Atlantis",    terrainFile: "Atlantis.ter" },
  // Battle arenas (tracks 10–17)
  { trackNumber: CroMagLevelType.Stonehenge,   name: "Battle: Stonehenge",   terrainFile: "Stonehenge.ter" },
  { trackNumber: CroMagLevelType.Aztec,        name: "Battle: Aztec",        terrainFile: "Aztec.ter" },
  { trackNumber: CroMagLevelType.Coliseum,     name: "Battle: Coliseum",     terrainFile: "Coliseum.ter" },
  { trackNumber: CroMagLevelType.Maze,         name: "Battle: Maze",         terrainFile: "Maze.ter" },
  { trackNumber: CroMagLevelType.Celtic,       name: "Battle: Celtic",       terrainFile: "Celtic.ter" },
  { trackNumber: CroMagLevelType.TarPits,      name: "Battle: Tar Pits",     terrainFile: "TarPits.ter" },
  { trackNumber: CroMagLevelType.Spiral,       name: "Battle: Spiral",       terrainFile: "Spiral.ter" },
  { trackNumber: CroMagLevelType.Ramps,        name: "Battle: Ramps",        terrainFile: "Ramps.ter" },
] satisfies readonly CroMagTrackInfo[];

export const DEFAULT_CROMAG_TRACK: CroMagLevelType = CroMagLevelType.Desert;

export function inferLevelNumberFromFilename(
  filename: string,
): number | undefined {
  const raw = filename.split("/").pop() ?? filename;
  const base = raw.toLowerCase().replace(/\.rsrc$/, "");
  const match = CROMAG_TRACKS.find(
    (t) => base === t.terrainFile.toLowerCase(),
  );
  return match?.trackNumber;
}
