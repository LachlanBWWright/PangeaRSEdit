/**
 * Cro-Mag Rally track number definitions.
 *
 * Cro-Mag Rally uses 1-based track numbers (1–17).
 * The ?track=N URL parameter controls which track loads at startup.
 * Cars are selected via ?car=N (1-based, 0 = random).
 */

export interface CroMagTrackInfo {
  readonly trackNumber: number; // 1-based track number
  readonly name: string;
}

export const CROMAG_TRACKS: readonly CroMagTrackInfo[] = [
  { trackNumber: 1, name: "Stone Age Speedway" },
  { trackNumber: 2, name: "Ice Age Rally" },
  { trackNumber: 3, name: "Lava Land" },
  { trackNumber: 4, name: "Jungle Joyride" },
  // Track names 5–17 are not yet confirmed from the game source; using generic labels
  { trackNumber: 5, name: "Track 5" },
  { trackNumber: 6, name: "Track 6" },
  { trackNumber: 7, name: "Track 7" },
  { trackNumber: 8, name: "Track 8" },
  { trackNumber: 9, name: "Track 9" },
  { trackNumber: 10, name: "Track 10" },
  { trackNumber: 11, name: "Track 11" },
  { trackNumber: 12, name: "Track 12" },
  { trackNumber: 13, name: "Track 13" },
  { trackNumber: 14, name: "Track 14" },
  { trackNumber: 15, name: "Track 15" },
  { trackNumber: 16, name: "Track 16" },
  { trackNumber: 17, name: "Track 17" },
] satisfies readonly CroMagTrackInfo[];

export const DEFAULT_CROMAG_TRACK = 1;
