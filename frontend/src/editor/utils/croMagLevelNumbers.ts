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
}

export const CROMAG_TRACKS: readonly CroMagTrackInfo[] = [
  // Stone Age (tracks 1–3)
  { trackNumber: CroMagLevelType.Desert,       name: "Stone Age Desert" },
  { trackNumber: CroMagLevelType.Jungle,       name: "Stone Age Jungle" },
  { trackNumber: CroMagLevelType.Ice,          name: "Stone Age Ice" },
  // Bronze Age (tracks 4–6)
  { trackNumber: CroMagLevelType.Crete,        name: "Bronze Age Crete" },
  { trackNumber: CroMagLevelType.China,        name: "Bronze Age China" },
  { trackNumber: CroMagLevelType.Egypt,        name: "Bronze Age Egypt" },
  // Iron Age (tracks 7–9)
  { trackNumber: CroMagLevelType.Europe,       name: "Iron Age Europe" },
  { trackNumber: CroMagLevelType.Scandinavia,  name: "Iron Age Scandinavia" },
  { trackNumber: CroMagLevelType.Atlantis,     name: "Iron Age Atlantis" },
  // Battle arenas (tracks 10–17)
  { trackNumber: CroMagLevelType.Stonehenge,   name: "Battle: Stonehenge" },
  { trackNumber: CroMagLevelType.Aztec,        name: "Battle: Aztec" },
  { trackNumber: CroMagLevelType.Coliseum,     name: "Battle: Coliseum" },
  { trackNumber: CroMagLevelType.Maze,         name: "Battle: Maze" },
  { trackNumber: CroMagLevelType.Celtic,       name: "Battle: Celtic" },
  { trackNumber: CroMagLevelType.TarPits,      name: "Battle: Tar Pits" },
  { trackNumber: CroMagLevelType.Spiral,       name: "Battle: Spiral" },
  { trackNumber: CroMagLevelType.Ramps,        name: "Battle: Ramps" },
] satisfies readonly CroMagTrackInfo[];

export const DEFAULT_CROMAG_TRACK: CroMagLevelType = CroMagLevelType.Desert;
