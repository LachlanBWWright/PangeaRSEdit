/**
 * Billy Frontier area number definitions.
 *
 * Billy Frontier has 12 playable areas (0–11), launched via #level=N hash parameter.
 * Area names from the BillyFrontier-Android GitHub Pages documentation.
 */

import { BillyFrontierLevelType } from "./levelType";

export interface BillyFrontierAreaInfo {
  readonly areaNumber: BillyFrontierLevelType;
  readonly name: string;
  readonly terrainFile: string;
}

export const BILLY_FRONTIER_AREAS: readonly BillyFrontierAreaInfo[] = [
  { areaNumber: BillyFrontierLevelType.TownDuel1, name: "Town Duel 1", terrainFile: "TownDuel1.ter" },
  { areaNumber: BillyFrontierLevelType.TownShootout, name: "Town Shootout", terrainFile: "TownShootout.ter" },
  { areaNumber: BillyFrontierLevelType.TownDuel2, name: "Town Duel 2", terrainFile: "TownDuel2.ter" },
  { areaNumber: BillyFrontierLevelType.TownStampede, name: "Town Stampede", terrainFile: "TownStampede.ter" },
  { areaNumber: BillyFrontierLevelType.TownDuel3, name: "Town Duel 3", terrainFile: "TownDuel3.ter" },
  { areaNumber: BillyFrontierLevelType.TargetPractice1, name: "Target Practice 1", terrainFile: "TargetPractice1.ter" },
  { areaNumber: BillyFrontierLevelType.SwampDuel1, name: "Swamp Duel 1", terrainFile: "SwampDuel1.ter" },
  { areaNumber: BillyFrontierLevelType.SwampShootout, name: "Swamp Shootout", terrainFile: "SwampShootout.ter" },
  { areaNumber: BillyFrontierLevelType.SwampDuel2, name: "Swamp Duel 2", terrainFile: "SwampDuel2.ter" },
  { areaNumber: BillyFrontierLevelType.SwampStampede, name: "Swamp Stampede", terrainFile: "SwampStampede.ter" },
  { areaNumber: BillyFrontierLevelType.SwampDuel3, name: "Swamp Duel 3", terrainFile: "SwampDuel3.ter" },
  { areaNumber: BillyFrontierLevelType.TargetPractice2, name: "Target Practice 2", terrainFile: "TargetPractice2.ter" },
] satisfies readonly BillyFrontierAreaInfo[];

export const DEFAULT_BILLY_AREA: BillyFrontierLevelType = BillyFrontierLevelType.TownDuel1;

export function inferLevelNumberFromFilename(
  filename: string,
): number | undefined {
  const base = filename.split("/").pop() ?? filename;
  const match = BILLY_FRONTIER_AREAS.find(
    (l) => base.toLowerCase() === l.terrainFile.toLowerCase(),
  );
  return match?.areaNumber;
}
