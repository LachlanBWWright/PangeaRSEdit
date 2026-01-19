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
    return nubs.length === 1 ? [{ x: nubs[0].x, z: nubs[0].z }] : [];
  }

  const pointsPerSpan = calculatePointsPerSpan(nubs, splineType);
  return bakeSpline(nubs, pointsPerSpan, splineType);
}

/**
 * Calculate how many points each span should have
 */
function calculatePointsPerSpan(
  nubs: SplinePoint[],
  splineType: SplineType,
): number[] {
  const numSpans = splineType === SplineType.CIRCULAR
    ? nubs.length  // Circular: includes segment from last to first
    : nubs.length - 1;  // Open: no wrap-around

  const pointsPerSpan = new Array<number>(numSpans);

  for (let i = 0; i < numSpans; i++) {
    const currentNub = nubs[i];
    const nextNub = nubs[(i + 1) % nubs.length];

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

  // For circular splines, create a working array that wraps around
  const workingNubs = splineType === SplineType.CIRCULAR
    ? createCircularNubArray(nubs)
    : nubs;

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
  const numSpans = splineType === SplineType.CIRCULAR ? numNubs : numNubs - 1;
  let numPoints = 0;

  for (let span = 0; span < numSpans; span++) {
    // For circular splines with phantom points, we need to pick the correct span indices
    // createCircularNubArray adds 1 point at start, so original index 0 is at index 1 in working array
    const idx = splineType === SplineType.CIRCULAR ? span + 1 : span;

    const subdivisions = pointsPerSpan[span] ?? 1;
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
    // Or we can rely on the last interpolation reaching it.
    // The original code had logic to add it if pointsPerSpan was 1.
    // Let's add it if we haven't overflowed
    if (lastNub && lastPoint) {
       lastPoint.x = lastNub.x;
       lastPoint.z = lastNub.z;
       numPoints++;
    }
  }

  points = points.slice(0, numPoints);

  return points;
}

/**
 * For circular splines, create array with phantom points for smooth wrap-around
 */
function createCircularNubArray(nubs: SplinePoint[]): SplinePoint[] {
  // Add phantom points before first and after last for proper wrapping
  // We want the spline to pass through all points and loop smoothly.
  // The 'phantom' points are essentially copies of the neighbors to simulate the loop context.
  // Since nubs[0] == nubs[n-1] in the data for circular splines (usually),
  // we effectively have:
  // [last-1, first, second, ..., last-1, last(==first), second]

  const n = nubs.length;
  if (n < 2) return [...nubs];

  // Assuming nubs[0] and nubs[n-1] are the same point (or very close)
  // We want to construct an array that lets the cubic spline algorithm
  // see the continuity.

  // Spline logic expects p[i-1], p[i], p[i+1], p[i+2] basically.

  // Let's try to pad with:
  // [n-2] -> [0] -> [1] ... [n-2] -> [0] -> [1]
  // But wait, the standard algorithm iterates from 0 to numNubs-2.

  // If we just add one point at the beginning (the one before start)
  // and one point at the end (the one after end)

  return [
    nubs[n - 2],   // Point before first (wrapping around)
    ...nubs,       // The actual nubs (where 0 and n-1 are same)
    nubs[1],       // Point after last (wrapping around)
  ];
}
