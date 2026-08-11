import { Game } from "@/data/globals/globals";

export const WATER_FLAG_FIXED_HEIGHT = 1;
export const FIXED_LIQUID_HEIGHTS = [400] as const;

export function supportsFixedHeightLiquid(game: Game): boolean {
  return (
    game === Game.BUGDOM_2 ||
    game === Game.NANOSAUR_2 ||
    game === Game.BILLY_FRONTIER
  );
}

export function resolveLiquidSurfaceHeight(input: {
  readonly supportsFixedHeight: boolean;
  readonly flags: number;
  readonly heightIndex: number;
  readonly terrainRelativeHeight: number;
}): number {
  if (
    input.supportsFixedHeight &&
    (input.flags & WATER_FLAG_FIXED_HEIGHT) !== 0
  ) {
    return FIXED_LIQUID_HEIGHTS[input.heightIndex] ?? FIXED_LIQUID_HEIGHTS[0];
  }
  return input.terrainRelativeHeight;
}
