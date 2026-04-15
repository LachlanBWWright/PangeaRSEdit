/**
 * Cro-Mag Rally track number definitions.
 *
 * Cro-Mag Rally uses 1-based track numbers (1–17).
 * The ?track=N URL parameter controls which track loads at startup.
 * Cars are selected via ?car=N (1-based, 0 = random).
 */

import { CroMagLevelType } from "./levelType";

export interface CroMagTrackInfo {
  readonly trackNumber: CroMagLevelType; // 1-based track number
  readonly name: string;
}

export const CROMAG_TRACKS: readonly CroMagTrackInfo[] = [
  { trackNumber: CroMagLevelType.StoneAgeSpeedway, name: "Stone Age Speedway" },
  { trackNumber: CroMagLevelType.IceAgeRally, name: "Ice Age Rally" },
  { trackNumber: CroMagLevelType.LavaLand, name: "Lava Land" },
  { trackNumber: CroMagLevelType.JungleJoyride, name: "Jungle Joyride" },
  // Track names 5–17 are not yet confirmed from the game source; using generic labels
  { trackNumber: CroMagLevelType.Track5, name: "Track 5" },
  { trackNumber: CroMagLevelType.Track6, name: "Track 6" },
  { trackNumber: CroMagLevelType.Track7, name: "Track 7" },
  { trackNumber: CroMagLevelType.Track8, name: "Track 8" },
  { trackNumber: CroMagLevelType.Track9, name: "Track 9" },
  { trackNumber: CroMagLevelType.Track10, name: "Track 10" },
  { trackNumber: CroMagLevelType.Track11, name: "Track 11" },
  { trackNumber: CroMagLevelType.Track12, name: "Track 12" },
  { trackNumber: CroMagLevelType.Track13, name: "Track 13" },
  { trackNumber: CroMagLevelType.Track14, name: "Track 14" },
  { trackNumber: CroMagLevelType.Track15, name: "Track 15" },
  { trackNumber: CroMagLevelType.Track16, name: "Track 16" },
  { trackNumber: CroMagLevelType.Track17, name: "Track 17" },
] satisfies readonly CroMagTrackInfo[];

export const DEFAULT_CROMAG_TRACK: CroMagLevelType = CroMagLevelType.StoneAgeSpeedway;
