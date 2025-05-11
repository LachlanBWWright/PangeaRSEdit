import { ottoSplinePoint } from "../python/structSpecs/ottoMaticInterface";
import { calcQuickDistance } from "./distanceCalc";

export function getPoints(nubs: ottoSplinePoint[]) {
  const pointsPerSpan = new Array<number>(nubs.length);

  for (let i = 0; i < nubs.length; i++) {
    //Get distance
    const distance = calcQuickDistance(
      nubs[i].x,
      nubs[i].z,
      nubs[(i + 1) % nubs.length].x,
      nubs[(i + 1) % nubs.length].z,
    );
    pointsPerSpan[i] = spanPoints(distance);
  }

  return bakeSpline(nubs, pointsPerSpan);
}

export function spanPoints(distance: number) {
  return Math.round(3.0 * distance);
}

//Code for creating spline (similar to OreoTerrain)
export function bakeSpline(nubs: ottoSplinePoint[], pointsPerSpan: number[]) {
  const numNubs = nubs.length;
  /*     SplinePointType** pointsHandle;
    SplinePointType**space,*points;
    SplinePointType*a, *b, *c, *d;
    SplinePointType*h0, *h1, *h2, *h3, *hi_a;
    int			numPoints;

    let 
 */
  // ALLOCATE 2D ARRAY FOR CALCULATIONS
  const space = new Array<ottoSplinePoint[]>(8);
  //Init array
  for (let i = 0; i < 8; i++) {
    space[i] = new Array<ottoSplinePoint>(numNubs);
    for (let j = 0; j < numNubs; j++) space[i][j] = { x: 0, z: 0 };
  }

  // ALLOC POINT ARRAY
  let maxPoints = 0;
  for (let i = 0; i < numNubs; i++) maxPoints += pointsPerSpan[i];

  //pointsHandle = (SplinePointType**) AllocHandle(sizeof(SplinePointType) * maxPoints);
  //let points = pointsHandle;
  let points = new Array<ottoSplinePoint>(maxPoints);
  //Initialise with zeros
  for (let i = 0; i < maxPoints; i++) points[i] = { x: 0, z: 0 };

  // DO MAGICAL CUBIC SPLINE CALCULATIONS ON CONTROL PTS
  const h0 = space[0];
  const h1 = space[1];
  const h2 = space[2];
  const h3 = space[3];

  const a = space[4];
  const b = space[5];
  const c = space[6];
  const d = space[7];

  // COPY CONTROL POINTS INTO ARRAY
  for (let i = 0; i < numNubs; i++) d[i] = nubs[i];

  for (let i = 0, imax = numNubs - 2; i < imax; i++) {
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

  for (let i = 1, i1 = 0, imax = numNubs - 2; i < imax; i++, i1++) {
    h0[i1].x = h2[i1].x / a[i1].x;
    a[i].x = 4.0 - h0[i1].x;
    h1[i].x = (h3[i].x - h1[i1].x) / a[i].x;

    h0[i1].z = h2[i1].z / a[i1].z;
    a[i].z = 4.0 - h0[i1].z;
    h1[i].z = (h3[i].z - h1[i1].z) / a[i].z;
  }

  b[numNubs - 3] = h1[numNubs - 3];

  for (let i = numNubs - 4; i >= 0; i--) {
    b[i].x = h1[i].x - h0[i].x * b[i + 1].x;
    b[i].z = h1[i].z - h0[i].z * b[i + 1].z;
  }

  for (let i = numNubs - 2; i >= 1; i--) b[i] = b[i - 1];

  b[0].x = 0;
  b[0].z = 0;
  b[numNubs - 1].x = 0;
  b[numNubs - 1].z = 0;

  //Pointer arithm
  //hi_a = a + numNubs - 1;

  for (let i = 0; i < numNubs - 1; i++ /*  a++, b++, c++, d++ */) {
    c[i].x = d[i + 1].x - d[i].x - (2.0 * b[i].x + b[i + 1].x) * (1.0 / 3.0);
    a[i].x = (b[i + 1].x - b[i].x) * (1.0 / 3.0);

    c[i].z = d[i + 1].z - d[i].z - (2.0 * b[i].z + b[i + 1].z) * (1.0 / 3.0);
    a[i].z = (b[i + 1].z - b[i].z) * (1.0 / 3.0);
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

    const subdivisions = pointsPerSpan[i];

    // CALC THIS SPAN

    for (let spanPoint = 0; spanPoint < subdivisions; spanPoint++) {
      //GAME_ASSERT(numPoints < maxPoints);										// see if overflow
      const t = spanPoint / subdivisions;
      points[numPoints].x = ((a[i].x * t + b[i].x) * t + c[i].x) * t + d[i].x; // save point
      points[numPoints].z = ((a[i].z * t + b[i].z) * t + c[i].z) * t + d[i].z;
      numPoints++;
    }
  }

  // ADD FINAL NUB AS POINT IF REQUIRED

  if (pointsPerSpan[numNubs - 1] == 1) {
    // see if overflow
    points[numPoints].x = nubs[numNubs - 1].x;
    points[numPoints].z = nubs[numNubs - 1].z;
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
