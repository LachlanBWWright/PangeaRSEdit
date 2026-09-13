import { Box3, Group } from "three";
import { Game } from "@/data/globals/globals";
import { ItemType } from "@/data/items/ottoItemType";

const OTTO_MOVING_PLATFORM_HEIGHT = 500;
const OTTO_CLOWN_FISH_HEIGHT = 700;
const OTTO_SPINNING_PLATFORM_HEIGHT = 550;

export function getOttoSplineItemTerrainOffset(itemType: number): number {
  if (itemType === ItemType.MovingPlatform) return OTTO_MOVING_PLATFORM_HEIGHT;
  if (itemType === ItemType.Clownfish) return OTTO_CLOWN_FISH_HEIGHT;
  return 0;
}

export function getOttoSpinningPlatformY(terrainY: number, heightParam: number): number {
  return terrainY + OTTO_SPINNING_PLATFORM_HEIGHT + heightParam * 10;
}

export function getOttoSplineItemModelY(
  terrainY: number,
  itemType: number,
  model: Group,
): number {
  const bounds = new Box3().setFromObject(model);
  const modelRootY = model.position.y;
  const localBottomY = bounds.min.y - modelRootY;
  return terrainY + getOttoSplineItemTerrainOffset(itemType) - localBottomY;
}

const BUGDOM_SPLINE_TERRAIN_OFFSETS: Readonly<Record<number, number>> = {
  3: 110, // BOXERFLY_FLIGHT_HEIGHT
  9: 150, // -ANT_FOOT_OFFSET
  31: 350, // MOSQUITO_FLIGHT_HEIGHT
  36: 55, // SPIDER_FOOT_OFFSET
  37: 30, // CATERPILLER_FOOT_OFFSET
  48: 152, // -WORKERBEE_FOOT_OFFSET
};

const BUGDOM_2_SPLINE_TERRAIN_OFFSETS: Readonly<Record<number, number>> = {
  58: 20, // Vacuum spline update adds 20 after bottom anchoring.
};

const CROMAG_SPLINE_TERRAIN_OFFSETS: Readonly<Record<number, number>> = {
  18: 350, // YETI_YOFF
  35: 40, // BEETLE_YOFF
  53: 5000, // Shark is placed relative to the water surface.
  58: 4000, // PTERADACTYL_YOFF
};

const BILLY_FRONTIER_SPLINE_TERRAIN_OFFSETS: Readonly<Record<number, number>> = {
  31: 55, // Tremor alien spline update adds 55.
};

function getSplineTerrainOffset(game: Game, itemType: number): number {
  if (game === Game.OTTO_MATIC) {
    return getOttoSplineItemTerrainOffset(itemType);
  }
  if (game === Game.BUGDOM) {
    return BUGDOM_SPLINE_TERRAIN_OFFSETS[itemType] ?? 0;
  }
  if (game === Game.BUGDOM_2) {
    return BUGDOM_2_SPLINE_TERRAIN_OFFSETS[itemType] ?? 0;
  }
  if (game === Game.CRO_MAG) {
    return CROMAG_SPLINE_TERRAIN_OFFSETS[itemType] ?? 0;
  }
  if (game === Game.BILLY_FRONTIER) {
    return BILLY_FRONTIER_SPLINE_TERRAIN_OFFSETS[itemType] ?? 0;
  }
  return 0;
}

export function getSplineItemModelY(
  game: Game,
  terrainY: number,
  itemType: number,
  model: Group,
): number {
  const bounds = new Box3().setFromObject(model);
  const localBottomY = bounds.min.y - model.position.y;
  return terrainY + getSplineTerrainOffset(game, itemType) - localBottomY;
}
