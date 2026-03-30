/**
 * Billy Frontier area number definitions.
 *
 * Billy Frontier has 12 playable areas (0–11), launched via #level=N hash parameter.
 * Area names from the BillyFrontier-Android GitHub Pages documentation.
 */

export interface BillyFrontierAreaInfo {
  readonly areaNumber: number;
  readonly name: string;
  readonly terrainFile: string;
}

export const BILLY_FRONTIER_AREAS: readonly BillyFrontierAreaInfo[] = [
  { areaNumber: 0, name: "Town Duel 1", terrainFile: "TownDuel1.ter" },
  { areaNumber: 1, name: "Town Shootout", terrainFile: "TownShootout.ter" },
  { areaNumber: 2, name: "Town Duel 2", terrainFile: "TownDuel2.ter" },
  { areaNumber: 3, name: "Town Stampede", terrainFile: "TownStampede.ter" },
  { areaNumber: 4, name: "Town Duel 3", terrainFile: "TownDuel3.ter" },
  { areaNumber: 5, name: "Target Practice 1", terrainFile: "TargetPractice1.ter" },
  { areaNumber: 6, name: "Swamp Duel 1", terrainFile: "SwampDuel1.ter" },
  { areaNumber: 7, name: "Swamp Shootout", terrainFile: "SwampShootout.ter" },
  { areaNumber: 8, name: "Swamp Duel 2", terrainFile: "SwampDuel2.ter" },
  { areaNumber: 9, name: "Swamp Stampede", terrainFile: "SwampStampede.ter" },
  { areaNumber: 10, name: "Swamp Duel 3", terrainFile: "SwampDuel3.ter" },
  { areaNumber: 11, name: "Target Practice 2", terrainFile: "TargetPractice2.ter" },
] satisfies readonly BillyFrontierAreaInfo[];

export const DEFAULT_BILLY_AREA = 0;
