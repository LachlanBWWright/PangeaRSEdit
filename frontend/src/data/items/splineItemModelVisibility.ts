import { Game } from "@/data/globals/globals";

const VISIBLE_SPLINE_ITEM_TYPES: Partial<Record<Game, ReadonlySet<number>>> = {
  [Game.OTTO_MATIC]: new Set([
    4, 7, 8, 9, 10, 35, 40, 49, 50, 52, 59, 60, 61, 78, 79, 81, 89, 92,
    93, 94, 95, 98, 103,
  ]),
  [Game.BUGDOM]: new Set([3, 8, 9, 26, 31, 35, 36, 37, 46, 48, 53, 54]),
  [Game.BUGDOM_2]: new Set([
    4, 10, 25, 38, 39, 40, 43, 45, 52, 58, 61, 63, 65, 68,
  ]),
  [Game.NANOSAUR_2]: new Set([15, 26, 32, 48]),
  [Game.CRO_MAG]: new Set([18, 23, 35, 53, 54, 58, 61, 64, 66]),
  [Game.BILLY_FRONTIER]: new Set([20, 23, 27, 31, 34]),
};

const SPLINE_ONLY_ITEM_TYPES: Partial<Record<Game, ReadonlySet<number>>> = {
  [Game.OTTO_MATIC]: new Set([35, 40, 79, 103]),
  [Game.BUGDOM_2]: new Set([25, 40, 58, 63]),
  [Game.NANOSAUR_2]: new Set([48]),
  [Game.CRO_MAG]: new Set([18, 23, 35, 53, 54, 58, 61, 64, 66]),
  [Game.BILLY_FRONTIER]: new Set([20, 23, 34]),
};

export function hasVisibleSplineItemModel(game: Game, itemType: number): boolean {
  return VISIBLE_SPLINE_ITEM_TYPES[game]?.has(itemType) ?? false;
}

export function getVisibleSplineItemTypes(game: Game): readonly number[] {
  return Array.from(VISIBLE_SPLINE_ITEM_TYPES[game] ?? []);
}

export function isSplineOnlyItemType(game: Game, itemType: number): boolean {
  return SPLINE_ONLY_ITEM_TYPES[game]?.has(itemType) ?? false;
}
