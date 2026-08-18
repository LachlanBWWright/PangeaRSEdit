import { SplinePoint } from "@/python/structSpecs/LevelTypes";
import { calcQuickDistance } from "./distanceCalc";

function getSplineArray(arr: SplinePoint[][], index: number): SplinePoint[] {
  return arr[index] ?? [];
}

/** Generates sampled spline points for the given nub positions. */
export function getPoints(nubs: SplinePoint[], circular = true) {
  if (circular) {
    return bakeCircularSpline(removeDuplicateClosingNub(nubs));
  }

  const numNubs = nubs.length - 1;
  const pointsPerSpan = new Array<number>(numNubs);

  for (let i = 0; i < numNubs; i += 1) {
    const currentNub = nubs[i];
    const nextIndex = i + 1;
    const nextNub = nubs[nextIndex];
    if (!currentNub || !nextNub) continue;

    const distance = calcQuickDistance(
      currentNub.x,
      currentNub.z,
      nextNub.x,
      nextNub.z,
    );
    pointsPerSpan[i] = spanPoints(distance);
  }

  return bakeSpline(nubs, pointsPerSpan);
}

function removeDuplicateClosingNub(nubs: SplinePoint[]): SplinePoint[] {
  const firstNub = nubs[0];
  const lastNub = nubs[nubs.length - 1];
  if (
    nubs.length > 1 &&
    firstNub &&
    lastNub &&
    firstNub.x === lastNub.x &&
    firstNub.z === lastNub.z
  ) {
    return nubs.slice(0, -1);
  }
  return nubs;
}

function bakeCircularSpline(nubs: SplinePoint[]): SplinePoint[] {
  if (nubs.length < 2) {
    return nubs.map((nub) => ({ x: nub.x, z: nub.z }));
  }

  return nubs.flatMap((currentNub, index) => {
    const previousNub = nubs[(index - 1 + nubs.length) % nubs.length];
    const nextNub = nubs[(index + 1) % nubs.length];
    const followingNub = nubs[(index + 2) % nubs.length];
    if (!previousNub || !nextNub || !followingNub) return [];

    const subdivisions = spanPoints(
      calcQuickDistance(currentNub.x, currentNub.z, nextNub.x, nextNub.z),
    );

    return Array.from({ length: subdivisions }, (_, pointIndex) => {
      const t = pointIndex / subdivisions;
      const t2 = t * t;
      const t3 = t2 * t;
      return {
        x:
          0.5 *
          (2 * currentNub.x +
            (-previousNub.x + nextNub.x) * t +
            (2 * previousNub.x -
              5 * currentNub.x +
              4 * nextNub.x -
              followingNub.x) *
              t2 +
            (-previousNub.x +
              3 * currentNub.x -
              3 * nextNub.x +
              followingNub.x) *
              t3),
        z:
          0.5 *
          (2 * currentNub.z +
            (-previousNub.z + nextNub.z) * t +
            (2 * previousNub.z -
              5 * currentNub.z +
              4 * nextNub.z -
              followingNub.z) *
              t2 +
            (-previousNub.z +
              3 * currentNub.z -
              3 * nextNub.z +
              followingNub.z) *
              t3),
      };
    });
  });
}

/** Converts a segment distance into the number of interpolated points to bake. */
export function spanPoints(distance: number) {
  return Math.max(1, Math.round(3 * distance));
}

/** Bakes the full spline curve into sampled points, optionally closing the loop. */
export function bakeSpline(
  nubs: SplinePoint[],
  pointsPerSpan: number[],
) {
  const numNubs = nubs.length;
  const space: SplinePoint[][] = [];

  for (let i = 0; i < 8; i += 1) {
    const row: SplinePoint[] = [];
    for (let j = 0; j < numNubs; j += 1) {
      row.push({ x: 0, z: 0 });
    }
    space.push(row);
  }

  let maxPoints = 0;
  for (let i = 0; i < numNubs; i += 1) {
    maxPoints += pointsPerSpan[i] ?? 0;
  }

  let points = new Array<SplinePoint>(maxPoints);
  for (let i = 0; i < maxPoints; i += 1) {
    points[i] = { x: 0, z: 0 };
  }

  const h0 = getSplineArray(space, 0);
  const h1 = getSplineArray(space, 1);
  const h2 = getSplineArray(space, 2);
  const h3 = getSplineArray(space, 3);
  const a = getSplineArray(space, 4);
  const b = getSplineArray(space, 5);
  const c = getSplineArray(space, 6);
  const d = getSplineArray(space, 7);

  for (let i = 0; i < numNubs; i += 1) {
    const nub = nubs[i];
    if (nub) d[i] = nub;
  }

  for (let i = 0; i < numNubs - 2; i += 1) {
    const h2i = h2[i];
    const h3i = h3[i];
    const di = d[i];
    const di1 = d[i + 1];
    const di2 = d[i + 2];
    if (!h2i || !h3i || !di || !di1 || !di2) continue;

    h2i.x = 1;
    h2i.z = 1;
    h3i.x = 3 * (di2.x - 2 * di1.x + di.x);
    h3i.z = 3 * (di2.z - 2 * di1.z + di.z);
  }

  const h2Last = h2[numNubs - 3];
  if (h2Last) {
    h2Last.x = 0;
    h2Last.z = 0;
  }

  const a0 = a[0];
  const h10 = h1[0];
  const h30 = h3[0];
  if (a0 && h10 && h30) {
    a0.x = 4;
    a0.z = 4;
    h10.x = h30.x / a0.x;
    h10.z = h30.z / a0.z;
  }

  for (let i = 1; i < numNubs - 2; i += 1) {
    const h0Prev = h0[i - 1];
    const h1Current = h1[i];
    const h1Prev = h1[i - 1];
    const h2Prev = h2[i - 1];
    const h3Current = h3[i];
    const aCurrent = a[i];
    const aPrev = a[i - 1];
    if (
      !h0Prev ||
      !h1Current ||
      !h1Prev ||
      !h2Prev ||
      !h3Current ||
      !aCurrent ||
      !aPrev
    )
      continue;

    h0Prev.x = h2Prev.x / aPrev.x;
    aCurrent.x = 4 - h0Prev.x;
    h1Current.x = (h3Current.x - h1Prev.x) / aCurrent.x;

    h0Prev.z = h2Prev.z / aPrev.z;
    aCurrent.z = 4 - h0Prev.z;
    h1Current.z = (h3Current.z - h1Prev.z) / aCurrent.z;
  }

  const h1Last = h1[numNubs - 3];
  if (h1Last) {
    b[numNubs - 3] = h1Last;
  }

  for (let i = numNubs - 4; i >= 0; i -= 1) {
    const bi = b[i];
    const nextB = b[i + 1];
    const h0i = h0[i];
    const h1i = h1[i];
    if (!bi || !nextB || !h0i || !h1i) continue;

    bi.x = h1i.x - h0i.x * nextB.x;
    bi.z = h1i.z - h0i.z * nextB.z;
  }

  for (let i = numNubs - 2; i >= 1; i -= 1) {
    const previousB = b[i - 1];
    if (previousB) b[i] = previousB;
  }

  const b0 = b[0];
  const bLast = b[numNubs - 1];
  if (b0) {
    b0.x = 0;
    b0.z = 0;
  }
  if (bLast) {
    bLast.x = 0;
    bLast.z = 0;
  }

  for (let i = 0; i < numNubs - 1; i += 1) {
    const ai = a[i];
    const bi = b[i];
    const nextB = b[i + 1];
    const ci = c[i];
    const di = d[i];
    const nextD = d[i + 1];
    if (!ai || !bi || !nextB || !ci || !di || !nextD) continue;

    ci.x = nextD.x - di.x - (2 * bi.x + nextB.x) / 3;
    ai.x = (nextB.x - bi.x) / 3;
    ci.z = nextD.z - di.z - (2 * bi.z + nextB.z) / 3;
    ai.z = (nextB.z - bi.z) / 3;
  }

  let numPoints = 0;
  for (let i = 0; i < numNubs - 1; i += 1) {
    const subdivisions = pointsPerSpan[i] ?? 0;
    const ai = a[i];
    const bi = b[i];
    const ci = c[i];
    const di = d[i];
    if (!ai || !bi || !ci || !di) continue;

    for (let spanPoint = 0; spanPoint < subdivisions; spanPoint += 1) {
      const point = points[numPoints];
      if (!point) continue;
      const t = spanPoint / subdivisions;
      point.x = ((ai.x * t + bi.x) * t + ci.x) * t + di.x;
      point.z = ((ai.z * t + bi.z) * t + ci.z) * t + di.z;
      numPoints += 1;
    }
  }

  const lastPointsPerSpan = pointsPerSpan[numNubs - 1];
  const lastNub = nubs[numNubs - 1];
  const lastPoint = points[numPoints];
  if (lastPointsPerSpan === 1 && lastNub && lastPoint) {
    lastPoint.x = lastNub.x;
    lastPoint.z = lastNub.z;
    numPoints += 1;
  }

  points = points.slice(0, numPoints);
  return points;
}
