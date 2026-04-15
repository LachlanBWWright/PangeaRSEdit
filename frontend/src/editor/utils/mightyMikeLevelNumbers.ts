/**
 * Mighty Mike level definitions.
 *
 * Mighty Mike is a 2D platformer with multiple worlds.
 * The WASM port is not yet available on GitHub Pages.
 * Level numbers will be confirmed once the WASM build is published.
 */

import { MightyMikeLevelType } from "./levelType";

export interface MightyMikeLevelInfo {
  readonly levelNumber: MightyMikeLevelType;
  readonly name: string;
}

export const MIGHTY_MIKE_LEVELS: readonly MightyMikeLevelInfo[] = [
  { levelNumber: MightyMikeLevelType.Level1, name: "Level 1" },
  { levelNumber: MightyMikeLevelType.Level2, name: "Level 2" },
  { levelNumber: MightyMikeLevelType.Level3, name: "Level 3" },
  { levelNumber: MightyMikeLevelType.Level4, name: "Level 4" },
  { levelNumber: MightyMikeLevelType.Level5, name: "Level 5" },
  { levelNumber: MightyMikeLevelType.Level6, name: "Level 6" },
  { levelNumber: MightyMikeLevelType.Level7, name: "Level 7" },
  { levelNumber: MightyMikeLevelType.Level8, name: "Level 8" },
  { levelNumber: MightyMikeLevelType.Level9, name: "Level 9" },
  { levelNumber: MightyMikeLevelType.Level10, name: "Level 10" },
] satisfies readonly MightyMikeLevelInfo[];

export const DEFAULT_MIGHTY_MIKE_LEVEL: MightyMikeLevelType = MightyMikeLevelType.Level1;
