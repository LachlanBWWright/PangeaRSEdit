import { Game, GlobalsInterface } from "../globals/globals";
import { FenceType as Nanosaur2FenceType } from "./nanosaur2FenceType";

const OTTO_FENCE_HEIGHTS = [
  430, 1100, 440, 440, 1100, 550, 1100, 1100, 550, 1500, 1300, 900, 1000, 900,
  500, 1100, 800, 600, 800, 800, 150, 600,
];

const BUGDOM_FENCE_HEIGHTS = [
  600, 1000, 1000, 500, 1000, 2000, 200, 6000, 1200,
];

const BUGDOM2_FENCE_HEIGHTS = [
  1100, 300, 600, 1300, 600, 700, 550, 800, 3800, 1800, 1100, 800, 1000, 1100,
  1000, 1100,
];

const CRO_MAG_FENCE_HEIGHTS = [
  2000, 3200, 1400, 1400, 1400, 1400, 1800, 1000, 700, 1500, 1000, 5000, 1500,
  1300, 1300, 1300, 1300, 1300, 7000, 7000, 7000, 7000, 7000, 7000, 1800, 1900,
  2000,
];

const BILLY_FRONTIER_FENCE_HEIGHTS = [200, 200, 900, 250, 100, 450, 200];

function getNanosaur2FenceHeight(fenceType: number): number {
  if (fenceType === Nanosaur2FenceType.LEVEL_1_PINETREE) return 1000;
  if (fenceType === Nanosaur2FenceType.LEVEL_2_DUSTDEVIL) return 300;
  return 300;
}

/** Returns the fence height for the active game and fence type. */
export function getFenceHeight(
  globals: GlobalsInterface,
  fenceType: number,
): number {
  switch (globals.GAME_TYPE) {
    case Game.OTTO_MATIC:
      return OTTO_FENCE_HEIGHTS[fenceType] ?? 300;
    case Game.BUGDOM:
      return BUGDOM_FENCE_HEIGHTS[fenceType] ?? 1000;
    case Game.BUGDOM_2:
      return BUGDOM2_FENCE_HEIGHTS[fenceType] ?? 1000;
    case Game.NANOSAUR_2:
      return getNanosaur2FenceHeight(fenceType);
    case Game.CRO_MAG:
      return CRO_MAG_FENCE_HEIGHTS[fenceType] ?? 1500;
    case Game.BILLY_FRONTIER:
      return BILLY_FRONTIER_FENCE_HEIGHTS[fenceType] ?? 200;
    default:
      return 1000;
  }
}
