import type {
  FenceData,
  LiquidData,
  SplineData,
} from "@/python/structSpecs/LevelTypes";

function resizeFencePoint(
  point: [number, number],
  offsetXUnits: number,
  offsetZUnits: number,
): [number, number] {
  return [point[0] + offsetXUnits, point[1] + offsetZUnits];
}

function resizeFenceNubs(
  fenceData: FenceData,
  offsetXUnits: number,
  offsetZUnits: number,
): FenceData["FnNb"] {
  return Object.fromEntries(
    Object.entries(fenceData.FnNb).map(([key, record]) => [
      key,
      {
        ...record,
        obj: record.obj.map((point) =>
          resizeFencePoint(point, offsetXUnits, offsetZUnits),
        ),
      },
    ]),
  );
}

function resizeFenceBoundingBox(
  fence: FenceData["Fenc"][1000]["obj"][number],
  offsetXUnits: number,
  offsetZUnits: number,
): FenceData["Fenc"][1000]["obj"][number] {
  return {
    ...fence,
    bbLeft: fence.bbLeft + offsetXUnits,
    bbRight: fence.bbRight + offsetXUnits,
    bbTop: fence.bbTop + offsetZUnits,
    bbBottom: fence.bbBottom + offsetZUnits,
  };
}

export function resizeFences(
  fenceData: FenceData,
  offsetXUnits: number,
  offsetZUnits: number,
): FenceData {
  const fenceList = fenceData.Fenc[1000]?.obj ?? [];
  const resizedFenceList = fenceList.map((fence) =>
    resizeFenceBoundingBox(fence, offsetXUnits, offsetZUnits),
  );

  return {
    Fenc: {
      1000: { ...fenceData.Fenc[1000], obj: resizedFenceList },
    },
    FnNb: resizeFenceNubs(fenceData, offsetXUnits, offsetZUnits),
  };
}

function resizeSplinePoint<T extends { x: number; z: number }>(
  point: T,
  offsetXUnits: number,
  offsetZUnits: number,
): T {
  return {
    ...point,
    x: point.x + offsetXUnits,
    z: point.z + offsetZUnits,
  };
}

function resizeSplineBoundingBox(
  spline: SplineData["Spln"][1000]["obj"][number],
  offsetXUnits: number,
  offsetZUnits: number,
): SplineData["Spln"][1000]["obj"][number] {
  return {
    ...spline,
    bbLeft: spline.bbLeft + offsetXUnits,
    bbRight: spline.bbRight + offsetXUnits,
    bbTop: spline.bbTop + offsetZUnits,
    bbBottom: spline.bbBottom + offsetZUnits,
  };
}

export function resizeSplines(
  splineData: SplineData,
  offsetXUnits: number,
  offsetZUnits: number,
): SplineData {
  const splineList = splineData.Spln[1000]?.obj ?? [];
  const resizedSplines = splineList.map((spline) =>
    resizeSplineBoundingBox(spline, offsetXUnits, offsetZUnits),
  );
  const resizedNubs = Object.fromEntries(
    Object.entries(splineData.SpNb).map(([key, record]) => [
      key,
      {
        ...record,
        obj: record.obj.map((nub) =>
          resizeSplinePoint(nub, offsetXUnits, offsetZUnits),
        ),
      },
    ]),
  );
  const resizedPoints = Object.fromEntries(
    Object.entries(splineData.SpPt).map(([key, record]) => [
      key,
      {
        ...record,
        obj: record.obj.map((pt) =>
          resizeSplinePoint(pt, offsetXUnits, offsetZUnits),
        ),
      },
    ]),
  );

  return {
    ...splineData,
    Spln: { 1000: { ...splineData.Spln[1000], obj: resizedSplines } },
    SpNb: resizedNubs,
    SpPt: resizedPoints,
  };
}

function resizeLiquidNub(
  nub: [number, number],
  offsetXUnits: number,
  offsetZUnits: number,
): [number, number] {
  return [nub[0] + offsetXUnits, nub[1] + offsetZUnits];
}

export function resizeLiquids(
  liquidData: LiquidData,
  offsetXUnits: number,
  offsetZUnits: number,
): LiquidData {
  const liquidList = liquidData.Liqd[1000]?.obj ?? [];
  const resizedLiquidList = liquidList.map((liquid) => ({
    ...liquid,
    hotSpotX: liquid.hotSpotX + offsetXUnits,
    hotSpotZ: liquid.hotSpotZ + offsetZUnits,
    bBoxLeft: liquid.bBoxLeft + offsetXUnits,
    bBoxRight: liquid.bBoxRight + offsetXUnits,
    bBoxTop: liquid.bBoxTop + offsetZUnits,
    bBoxBottom: liquid.bBoxBottom + offsetZUnits,
    nubs: liquid.nubs.map((nub) =>
      resizeLiquidNub(nub, offsetXUnits, offsetZUnits),
    ),
  }));

  return {
    Liqd: {
      1000: { ...liquidData.Liqd[1000], obj: resizedLiquidList },
    },
  };
}
