import type {
  FenceData,
  ItemData,
  LiquidData,
  SplineData,
  TerrainData,
} from "@/python/structSpecs/LevelTypes";
import { Game } from "@/data/globals/globals";

export type LevelScaleMode = "scale-level" | "preserve-world-positions";

export function supportsLevelScale(game: Game): boolean {
  return (
    game === Game.BUGDOM ||
    game === Game.OTTO_MATIC ||
    game === Game.BUGDOM_2 ||
    game === Game.NANOSAUR_2 ||
    game === Game.CRO_MAG ||
    game === Game.BILLY_FRONTIER
  );
}

export function supportsLevelScalePlacement(game: Game): boolean {
  return (
    game === Game.BUGDOM_2 ||
    game === Game.NANOSAUR_2 ||
    game === Game.BILLY_FRONTIER
  );
}

function scaleInteger(value: number, factor: number): number {
  return Math.round(value * factor);
}

export function scaleItemCoordinates(data: ItemData, factor: number): void {
  data.Itms?.[1000]?.obj.forEach((item) => {
    item.x = scaleInteger(item.x, factor);
    item.z = scaleInteger(item.z, factor);
  });
}

export function scaleFenceCoordinates(data: FenceData, factor: number): void {
  data.Fenc?.[1000]?.obj.forEach((fence) => {
    fence.bbTop = scaleInteger(fence.bbTop, factor);
    fence.bbBottom = scaleInteger(fence.bbBottom, factor);
    fence.bbLeft = scaleInteger(fence.bbLeft, factor);
    fence.bbRight = scaleInteger(fence.bbRight, factor);
  });
  Object.values(data.FnNb).forEach((resource) => {
    resource.obj.forEach((nub) => {
      nub[0] = scaleInteger(nub[0], factor);
      nub[1] = scaleInteger(nub[1], factor);
    });
  });
}

export function scaleSplineCoordinates(data: SplineData, factor: number): void {
  data.Spln?.[1000]?.obj.forEach((spline) => {
    spline.bbTop = scaleInteger(spline.bbTop, factor);
    spline.bbBottom = scaleInteger(spline.bbBottom, factor);
    spline.bbLeft = scaleInteger(spline.bbLeft, factor);
    spline.bbRight = scaleInteger(spline.bbRight, factor);
  });
  Object.values(data.SpNb).forEach((resource) => {
    resource.obj.forEach((nub) => {
      nub.x *= factor;
      nub.z *= factor;
    });
  });
  Object.values(data.SpPt).forEach((resource) => {
    resource.obj.forEach((point) => {
      point.x *= factor;
      point.z *= factor;
    });
  });
}

export function scaleLiquidCoordinates(data: LiquidData, factor: number): void {
  data.Liqd?.[1000]?.obj.forEach((liquid) => {
    liquid.bBoxTop = scaleInteger(liquid.bBoxTop, factor);
    liquid.bBoxBottom = scaleInteger(liquid.bBoxBottom, factor);
    liquid.bBoxLeft = scaleInteger(liquid.bBoxLeft, factor);
    liquid.bBoxRight = scaleInteger(liquid.bBoxRight, factor);
    liquid.hotSpotX *= factor;
    liquid.hotSpotZ *= factor;
    liquid.nubs.forEach((nub) => {
      nub[0] *= factor;
      nub[1] *= factor;
    });
  });
}

export function scaleTerrainFeatureCoordinates(
  data: TerrainData,
  factor: number,
): void {
  data.CkPt?.[1000]?.obj.forEach((checkpoint) => {
    checkpoint.x1 *= factor;
    checkpoint.x2 *= factor;
    checkpoint.z1 *= factor;
    checkpoint.z2 *= factor;
  });
  data.Path?.[1000]?.obj.forEach((path) => {
    path.bbTop = scaleInteger(path.bbTop, factor);
    path.bbBottom = scaleInteger(path.bbBottom, factor);
    path.bbLeft = scaleInteger(path.bbLeft, factor);
    path.bbRight = scaleInteger(path.bbRight, factor);
  });
  Object.values(data.PaPt ?? {}).forEach((resource) => {
    resource.obj.forEach((point) => {
      point.x *= factor;
      point.z *= factor;
    });
  });
}

export function getPreservedPositionFactor(
  previousTileSize: number,
  nextTileSize: number,
): number | null {
  if (previousTileSize <= 0 || nextTileSize <= 0) return null;
  return previousTileSize / nextTileSize;
}
