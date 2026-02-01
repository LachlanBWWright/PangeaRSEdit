import { SplinePoint } from "@/python/structSpecs/LevelTypes";
import { calcQuickDistance } from "./distanceCalc";

/**
 * Helper function to safely get array element with default
 */
function getSplineArray(arr: SplinePoint[][], index: number): SplinePoint[] {
  return arr[index] ?? [];
}

/**
 * Generate points along a spline from control nubs.
 * @param nubs - Array of control points (nubs)
 * @param circular - If true, the spline is a closed loop (last nub connects to first)
 */
export function getPoints(nubs: SplinePoint[], circular = true) {
  const numNubs = circular ? nubs.length : nubs.length - 1;
  const pointsPerSpan = new Array<number>(numNubs);

  for (let i = 0; i < numNubs; i++) {
    //Get distance
    const currentNub = nubs[i];
    const nextIndex = circular ? (i + 1) % nubs.length : i + 1;
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

  return bakeSpline(nubs, pointsPerSpan, circular);
}

export function spanPoints(distance: number) {
  return Math.round(3.0 * distance);
}

/**
 * Bake a spline from control nubs into a series of points.
 * @param nubs - Array of control points
 * @param pointsPerSpan - Number of interpolated points per segment
 * @param circular - Reserved for future use. The circular parameter affects
 *                   distance calculation in getPoints(); this baking function
 *                   will be enhanced to properly handle circular vs open splines.
 */
export function bakeSpline(nubs: SplinePoint[], pointsPerSpan: number[], circular?: boolean) {
  // TODO(Plan-004): Implement circular-aware baking to properly close the loop
  // for circular splines. Currently, the spline curve generation always produces
  // a continuous curve - the circular behavior is handled by getPoints() which
  // controls segment count and by Spline.tsx which handles nub synchronization.
  void circular;
  const numNubs = nubs.length;
  /*     SplinePointType** pointsHandle;
    SplinePointType**space,*points;
    SplinePointType*a, *b, *c, *d;
    SplinePointType*h0, *h1, *h2, *h3, *hi_a;
    int			numPoints;

    let 
 */
  // ALLOCATE 2D ARRAY FOR CALCULATIONS
  const space: SplinePoint[][] = [];
  //Init array
  for (let i = 0; i < 8; i++) {
    const row: SplinePoint[] = [];
    for (let j = 0; j < numNubs; j++) {
      row.push({ x: 0, z: 0 });
    }
    space.push(row);
  }

  // ALLOC POINT ARRAY
  let maxPoints = 0;
  for (let i = 0; i < numNubs; i++) maxPoints += pointsPerSpan[i] ?? 0;

  //pointsHandle = (SplinePointType**) AllocHandle(sizeof(SplinePointType) * maxPoints);
  //let points = pointsHandle;
  let points = new Array<SplinePoint>(maxPoints);
  //Initialise with zeros
  for (let i = 0; i < maxPoints; i++) points[i] = { x: 0, z: 0 };

  // DO MAGICAL CUBIC SPLINE CALCULATIONS ON CONTROL PTS
  // These arrays are fully initialized in the loop above
  const h0 = getSplineArray(space, 0);
  const h1 = getSplineArray(space, 1);
  const h2 = getSplineArray(space, 2);
  const h3 = getSplineArray(space, 3);

  const a = getSplineArray(space, 4);
  const b = getSplineArray(space, 5);
  const c = getSplineArray(space, 6);
  const d = getSplineArray(space, 7);

  // COPY CONTROL POINTS INTO ARRAY
  for (let i = 0; i < numNubs; i++) {
    const nub = nubs[i];
    if (nub) d[i] = nub;
  }

  for (let i = 0, imax = numNubs - 2; i < imax; i++) {
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
  const h2LastIdx = h2[numNubs - 3];
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

  for (let i = 1, i1 = 0, imax = numNubs - 2; i < imax; i++, i1++) {
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

  const h1Last = h1[numNubs - 3];
  if (h1Last) {
    b[numNubs - 3] = h1Last;
  }

  for (let i = numNubs - 4; i >= 0; i--) {
    const bi = b[i];
    const bi1 = b[i + 1];
    const h0i = h0[i];
    const h1i = h1[i];
    if (bi && bi1 && h0i && h1i) {
      bi.x = h1i.x - h0i.x * bi1.x;
      bi.z = h1i.z - h0i.z * bi1.z;
    }
  }

  for (let i = numNubs - 2; i >= 1; i--) {
    const prevB = b[i - 1];
    if (prevB) b[i] = prevB;
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

  //Pointer arithm
  //hi_a = a + numNubs - 1;

  for (let i = 0; i < numNubs - 1; i++ /*  a++, b++, c++, d++ */) {
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
  //Not needed - not using pointer arithm
  /*   a = space[4];
  b = space[5];
  c = space[6];
  d = space[7]; */

  let numPoints = 0;
  for (let i = 0; i < numNubs - 1; i++) {
    //GAME_ASSERT(nub < numNubs - 1);

    const subdivisions = pointsPerSpan[i] ?? 0;
    const ai = a[i];
    const bi = b[i];
    const ci = c[i];
    const di = d[i];
    
    if (!ai || !bi || !ci || !di) continue;

    // CALC THIS SPAN

    for (let spanPoint = 0; spanPoint < subdivisions; spanPoint++) {
      //GAME_ASSERT(numPoints < maxPoints);										// see if overflow
      const t = spanPoint / subdivisions;
      const point = points[numPoints];
      if (!point) continue;
      point.x = ((ai.x * t + bi.x) * t + ci.x) * t + di.x; // save point
      point.z = ((ai.z * t + bi.z) * t + ci.z) * t + di.z;
      numPoints++;
    }
  }

  // ADD FINAL NUB AS POINT IF REQUIRED
  const lastPointsPerSpan = pointsPerSpan[numNubs - 1];
  const lastNub = nubs[numNubs - 1];
  const lastPoint = points[numPoints];
  
  if (lastPointsPerSpan === 1 && lastNub && lastPoint) {
    // see if overflow
    lastPoint.x = lastNub.x;
    lastPoint.z = lastNub.z;
    numPoints++;
  }

  points = points.slice(0, numPoints);

  return points;
}
/* static SplinePointType** BakeSpline(int numNubs, const SplinePointType *nubs, const int* pointsPerSpan)
{
    SplinePointType** pointsHandle;
    SplinePointType**space,*points;
    SplinePointType*a, *b, *c, *d;
    SplinePointType*h0, *h1, *h2, *h3, *hi_a;
    int			numPoints;


				// ALLOCATE 2D ARRAY FOR CALCULATIONS 

	Alloc_2d_array(SplinePointType, space, 8, numNubs);


				// ALLOC POINT ARRAY 

	int maxPoints = 0;
	for (int i = 0; i < numNubs; i++)
		maxPoints += pointsPerSpan[i];

	pointsHandle = (SplinePointType**) AllocHandle(sizeof(SplinePointType) * maxPoints);
	points = *pointsHandle;


		// DO MAGICAL CUBIC SPLINE CALCULATIONS ON CONTROL PTS 

	h0 = space[0];
	h1 = space[1];
	h2 = space[2];
	h3 = space[3];

	a = space[4];
	b = space[5];
	c = space[6];
	d = space[7];


				// COPY CONTROL POINTS INTO ARRAY 

	for (int i = 0; i < numNubs; i++)
		d[i] = nubs[i];


	for (int i = 0, imax = numNubs - 2; i < imax; i++)
	{
		h2[i].x = 1;
		h2[i].z = 1;
		h3[i].x = 3 * (d[i + 2].x - 2 * d[i + 1].x + d[i].x);
		h3[i].z = 3 * (d[i + 2].z - 2 * d[i + 1].z + d[i].z);
	}
	h2[numNubs - 3].x = 0;
	h2[numNubs - 3].z = 0;

	a[0].x = 4;
	a[0].z = 4;
	h1[0].x = h3[0].x / a[0].x;
	h1[0].z = h3[0].z / a[0].z;

	for (int i = 1, i1 = 0, imax = numNubs - 2; i < imax; i++, i1++)
	{
		h0[i1].x = h2[i1].x / a[i1].x;
		a[i].x = 4.0f - h0[i1].x;
		h1[i].x = (h3[i].x - h1[i1].x) / a[i].x;

		h0[i1].z = h2[i1].z / a[i1].z;
		a[i].z = 4.0f - h0[i1].z;
		h1[i].z = (h3[i].z - h1[i1].z) / a[i].z;
	}

	b[numNubs - 3] = h1[numNubs - 3];

	for (int i = numNubs - 4; i >= 0; i--)
	{
 		b[i].x = h1[i].x - h0[i].x * b[i+ 1].x;
 		b[i].z = h1[i].z - h0[i].z * b[i+ 1].z;
 	}

	for (int i = numNubs - 2; i >= 1; i--)
		b[i] = b[i - 1];

	b[0].x = 0;
	b[0].z = 0;
	b[numNubs - 1].x = 0;
	b[numNubs - 1].z = 0;
	hi_a = a + numNubs - 1;

	for (; a < hi_a; a++, b++, c++, d++)
	{
		c->x = ((d+1)->x - d->x) -(2.0f * b->x + (b+1)->x) * (1.0f/3.0f);
		a->x = ((b+1)->x - b->x) * (1.0f/3.0f);

		c->z = ((d+1)->z - d->z) -(2.0f * b->z + (b+1)->z) * (1.0f/3.0f);
		a->z = ((b+1)->z - b->z) * (1.0f/3.0f);
	}

		// NOW CALCULATE THE SPLINE POINTS 

	a = space[4];
	b = space[5];
	c = space[6];
	d = space[7];

  	numPoints = 0;
	for (int nub = 0; a < hi_a; a++, b++, c++, d++, nub++)
	{
		GAME_ASSERT(nub < numNubs - 1);

		int subdivisions = pointsPerSpan[nub];

				// CALC THIS SPAN

		for (int spanPoint = 0; spanPoint < subdivisions; spanPoint++)
		{
			GAME_ASSERT(numPoints < maxPoints);										// see if overflow
			float t = spanPoint / (float) subdivisions;
			points[numPoints].x = ((a->x * t + b->x) * t + c->x) * t + d->x;		// save point
			points[numPoints].z = ((a->z * t + b->z) * t + c->z) * t + d->z;
			numPoints++;
		}
	}


		// ADD FINAL NUB AS POINT IF REQUIRED 



	if (pointsPerSpan[numNubs - 1] == 1)
	{
								// see if overflow
		points[numPoints].x = nubs[numNubs - 1].x;
		points[numPoints].z = nubs[numNubs - 1].z;
		numPoints++;
	}





	return pointsHandle;
} */
