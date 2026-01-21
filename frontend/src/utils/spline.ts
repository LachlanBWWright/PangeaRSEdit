import { SplinePoint } from "@/python/structSpecs/LevelTypes";
import { SplineType } from "@/data/splines/splineTypeDetection";
import { calcQuickDistance } from "./distanceCalc";

/**
 * Helper function to safely get array element with default
 */
function getSplineArray(arr: SplinePoint[][], index: number): SplinePoint[] {
  return arr[index] ?? [];
}

/**
 * Generate spline points from nubs
 * @param nubs Control points
 * @param splineType Whether spline is circular or open
 */
export function getPoints(
  nubs: SplinePoint[],
  splineType: SplineType = SplineType.CIRCULAR,
): SplinePoint[] {
  if (nubs.length < 2) {
    const nub = nubs[0];
    return nub ? [{ x: nub.x, z: nub.z }] : [];
  }

  const pointsPerSpan = calculatePointsPerSpan(nubs);
  return bakeSpline(nubs, pointsPerSpan, splineType);
}

/**
 * Calculate how many points each span should have
 */
function calculatePointsPerSpan(
  nubs: SplinePoint[],
): number[] {
  let numSpans = nubs.length - 1;

  const pointsPerSpan = new Array<number>(numSpans);

  for (let i = 0; i < numSpans; i++) {
    const currentNub = nubs[i];
    const nextNub = nubs[i + 1];

    if (!currentNub || !nextNub) {
      pointsPerSpan[i] = 1;
      continue;
    }

    const distance = calcQuickDistance(
      currentNub.x, currentNub.z,
      nextNub.x, nextNub.z,
    );
    pointsPerSpan[i] = spanPoints(distance);
  }

  return pointsPerSpan;
}

export function spanPoints(distance: number): number {
  return Math.round(3.0 * distance);
}

/**
 * Bake spline from nubs to interpolated points
 *
 * For circular splines: Wraps around so last segment curves properly
 * For open splines: Standard cubic spline with natural boundary conditions
 */
export function bakeSpline(
  nubs: SplinePoint[],
  pointsPerSpan: number[],
  splineType: SplineType = SplineType.CIRCULAR,
): SplinePoint[] {
  const numNubs = nubs.length;

  if (numNubs < 2) {
    return nubs.map(n => ({ x: n.x, z: n.z }));
  }

  // Determine working array and offset
  let workingNubs = nubs;
  let startSpanIndex = 0;

  if (splineType === SplineType.CIRCULAR) {
    // Remove the duplicate last point to get the unique loop points
    // (Assuming nubs[0] approx nubs[last], which is true for CIRCULAR)
    const loopNubs = nubs.slice(0, -1);

    if (loopNubs.length < 2) {
      // Degenerate case, fallback to simple copy
       return nubs.map(n => ({ x: n.x, z: n.z }));
    }

    const firstLoopNub = loopNubs[0];
    if (!firstLoopNub) return nubs.map(n => ({ x: n.x, z: n.z })); // Should not happen given length check

    // Create triple loop to isolate boundary conditions
    // [Loop, Loop, Loop, Start]
    workingNubs = [
        ...loopNubs,
        ...loopNubs,
        ...loopNubs,
        firstLoopNub
    ];

    // We want to extract points for the middle loop
    // The middle loop starts after the first 'loopNubs' set.
    startSpanIndex = loopNubs.length;
  } else {
    // Open spline
    workingNubs = nubs;
    startSpanIndex = 0;
  }

  const workingNumNubs = workingNubs.length;

  // ALLOCATE 2D ARRAY FOR CALCULATIONS
  const space: SplinePoint[][] = [];
  //Init array
  for (let i = 0; i < 8; i++) {
    const row: SplinePoint[] = [];
    for (let j = 0; j < workingNumNubs; j++) {
      row.push({ x: 0, z: 0 });
    }
    space.push(row);
  }

  // ALLOC POINT ARRAY
  // We only generate points for the requested spans (pointsPerSpan)
  let maxPoints = 0;
  for (let i = 0; i < pointsPerSpan.length; i++) maxPoints += pointsPerSpan[i] ?? 0;

  // Add some buffer for safety
  maxPoints += 10;

  let points = new Array<SplinePoint>(maxPoints);
  //Initialise with zeros
  for (let i = 0; i < maxPoints; i++) points[i] = { x: 0, z: 0 };

  // DO MAGICAL CUBIC SPLINE CALCULATIONS ON CONTROL PTS
  const h0 = getSplineArray(space, 0);
  const h1 = getSplineArray(space, 1);
  const h2 = getSplineArray(space, 2);
  const h3 = getSplineArray(space, 3);

  const a = getSplineArray(space, 4);
  const b = getSplineArray(space, 5);
  const c = getSplineArray(space, 6);
  const d = getSplineArray(space, 7);

  // COPY CONTROL POINTS INTO ARRAY
  for (let i = 0; i < workingNumNubs; i++) {
    const nub = workingNubs[i];
    if (nub) d[i] = { x: nub.x, z: nub.z };
  }

  for (let i = 0, imax = workingNumNubs - 2; i < imax; i++) {
    const h2i = h2[i];
    const h3i = h3[i];
    const di = d[i];
    const di1 = d[i + 1];
    const di2 = d[i + 2];
    if (h2i && h3i && di && di1 && di2) {
      h2i.x = 1;
      h2i.z = 1;
      h3i.x = 3 * (di2.x - 2 * di1.x + di.x);
      h3i.z = 3 * (di2.z - 2 * di1.z + di.z);
    }
  }
  const h2LastIdx = h2[workingNumNubs - 3];
  if (h2LastIdx) {
    h2LastIdx.x = 0;
    h2LastIdx.z = 0;
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

  for (let i = 1, i1 = 0, imax = workingNumNubs - 2; i < imax; i++, i1++) {
    const h0i1 = h0[i1];
    const h1i = h1[i];
    const h1i1 = h1[i1];
    const h2i1 = h2[i1];
    const h3i = h3[i];
    const ai = a[i];
    const ai1 = a[i1];
    
    if (h0i1 && h1i && h1i1 && h2i1 && h3i && ai && ai1) {
      h0i1.x = h2i1.x / ai1.x;
      ai.x = 4.0 - h0i1.x;
      h1i.x = (h3i.x - h1i1.x) / ai.x;

      h0i1.z = h2i1.z / ai1.z;
      ai.z = 4.0 - h0i1.z;
      h1i.z = (h3i.z - h1i1.z) / ai.z;
    }
  }

  const h1Last = h1[workingNumNubs - 3];
  if (h1Last) {
    b[workingNumNubs - 3] = h1Last;
  }

  for (let i = workingNumNubs - 4; i >= 0; i--) {
    const bi = b[i];
    const bi1 = b[i + 1];
    const h0i = h0[i];
    const h1i = h1[i];
    if (bi && bi1 && h0i && h1i) {
      bi.x = h1i.x - h0i.x * bi1.x;
      bi.z = h1i.z - h0i.z * bi1.z;
    }
  }

  for (let i = workingNumNubs - 2; i >= 1; i--) {
    const prevB = b[i - 1];
    if (prevB) b[i] = prevB;
  }

  const b0 = b[0];
  const bLast = b[workingNumNubs - 1];
  if (b0) {
    b0.x = 0;
    b0.z = 0;
  }
  if (bLast) {
    bLast.x = 0;
    bLast.z = 0;
  }

  for (let i = 0; i < workingNumNubs - 1; i++) {
    const ai = a[i];
    const bi = b[i];
    const bi1 = b[i + 1];
    const ci = c[i];
    const di = d[i];
    const di1 = d[i + 1];
    
    if (ai && bi && bi1 && ci && di && di1) {
      ci.x = di1.x - di.x - (2.0 * bi.x + bi1.x) * (1.0 / 3.0);
      ai.x = (bi1.x - bi.x) * (1.0 / 3.0);

      ci.z = di1.z - di.z - (2.0 * bi.z + bi1.z) * (1.0 / 3.0);
      ai.z = (bi1.z - bi.z) * (1.0 / 3.0);
    }
  }

  // NOW CALCULATE THE SPLINE POINTS
  let numPoints = 0;

  for (let i = 0; i < pointsPerSpan.length; i++) {
    const idx = startSpanIndex + i;
    const subdivisions = pointsPerSpan[i] ?? 1;

    const ai = a[idx], bi = b[idx], ci = c[idx], di = d[idx];
    
    if (!ai || !bi || !ci || !di) continue;

    for (let spanPoint = 0; spanPoint < subdivisions; spanPoint++) {
      const t = spanPoint / subdivisions;
      const point = points[numPoints];
      if (!point) continue;
      point.x = ((ai.x * t + bi.x) * t + ci.x) * t + di.x;
      point.z = ((ai.z * t + bi.z) * t + ci.z) * t + di.z;
      numPoints++;
    }
  }
  
  // ADD FINAL NUB AS POINT IF REQUIRED
  // For open splines, we want to include the very last point
  if (splineType === SplineType.OPEN) {
    const lastNub = nubs[numNubs - 1];
    const lastPoint = points[numPoints];

    // We can add the last nub as a point to ensure we reach the end exactly
    if (lastNub && lastPoint) {
       lastPoint.x = lastNub.x;
       lastPoint.z = lastNub.z;
       numPoints++;
    }
  }

  points = points.slice(0, numPoints);

  return points;
}
