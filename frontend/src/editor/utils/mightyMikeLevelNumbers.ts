/**
 * Mighty Mike level definitions.
 *
 * Mighty Mike is a 2D platformer with multiple worlds.
 * The WASM port is not yet available on GitHub Pages.
 * Level numbers will be confirmed once the WASM build is published.
 */

export interface MightyMikeLevelInfo {
  readonly levelNumber: number;
  readonly name: string;
}

export const MIGHTY_MIKE_LEVELS: readonly MightyMikeLevelInfo[] = [
  { levelNumber: 0, name: "Level 1" },
  { levelNumber: 1, name: "Level 2" },
  { levelNumber: 2, name: "Level 3" },
  { levelNumber: 3, name: "Level 4" },
  { levelNumber: 4, name: "Level 5" },
  { levelNumber: 5, name: "Level 6" },
  { levelNumber: 6, name: "Level 7" },
  { levelNumber: 7, name: "Level 8" },
  { levelNumber: 8, name: "Level 9" },
  { levelNumber: 9, name: "Level 10" },
] satisfies readonly MightyMikeLevelInfo[];

export const DEFAULT_MIGHTY_MIKE_LEVEL = 0;
