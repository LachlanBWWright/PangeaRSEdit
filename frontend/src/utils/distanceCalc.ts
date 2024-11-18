//Adapted from Pangea Software source code

export function calcQuickDistance(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const diffX = Math.abs(x1 - x2);
  const diffY = Math.abs(y1 - y2);

  if (diffX > diffY) {
    return diffX + 0.375 * diffY; // same as (3*diffY)/8
  } else {
    return diffY + 0.375 * diffX;
  }
}
