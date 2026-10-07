/**
 * Utility functions for BG3D ↔ glTF conversion (functional API)
 * We use Float32Array(16) as the Mat4 representation.
 */

export type Mat4 = Float32Array;

/**
 * Safe accessor for typed array elements.
 * TypeScript's noUncheckedIndexedAccess treats typed array access as `number | undefined`,
 * but Float32Array always returns a number (defaulting to 0 for out-of-bounds).
 * This helper ensures type safety while acknowledging the runtime behavior.
 */
function at(arr: Float32Array, index: number): number {
  return arr[index] ?? 0;
}

export function createMatrix4(): Mat4 {
  const m = new Float32Array(16);
  return identity(m);
}

export function identity(out: Mat4): Mat4 {
  out.fill(0);
  out[0] = out[5] = out[10] = out[15] = 1;
  return out;
}

export function setTranslation(
  out: Mat4,
  x: number,
  y: number,
  z: number,
): Mat4 {
  out[12] = x;
  out[13] = y;
  out[14] = z;
  return out;
}

export function getTranslation(m: Mat4): { x: number; y: number; z: number } {
  return { x: at(m, 12), y: at(m, 13), z: at(m, 14) };
}

export function invert(m: Mat4): Mat4 {
  const inv = new Float32Array(16);
  const a = m;

  inv[0] =
    at(a, 5) * at(a, 10) * at(a, 15) -
    at(a, 5) * at(a, 11) * at(a, 14) -
    at(a, 9) * at(a, 6) * at(a, 15) +
    at(a, 9) * at(a, 7) * at(a, 14) +
    at(a, 13) * at(a, 6) * at(a, 11) -
    at(a, 13) * at(a, 7) * at(a, 10);
  inv[4] =
    -at(a, 4) * at(a, 10) * at(a, 15) +
    at(a, 4) * at(a, 11) * at(a, 14) +
    at(a, 8) * at(a, 6) * at(a, 15) -
    at(a, 8) * at(a, 7) * at(a, 14) -
    at(a, 12) * at(a, 6) * at(a, 11) +
    at(a, 12) * at(a, 7) * at(a, 10);
  inv[8] =
    at(a, 4) * at(a, 9) * at(a, 15) -
    at(a, 4) * at(a, 11) * at(a, 13) -
    at(a, 8) * at(a, 5) * at(a, 15) +
    at(a, 8) * at(a, 7) * at(a, 13) +
    at(a, 12) * at(a, 5) * at(a, 11) -
    at(a, 12) * at(a, 7) * at(a, 9);
  inv[12] =
    -at(a, 4) * at(a, 9) * at(a, 14) +
    at(a, 4) * at(a, 10) * at(a, 13) +
    at(a, 8) * at(a, 5) * at(a, 14) -
    at(a, 8) * at(a, 6) * at(a, 13) -
    at(a, 12) * at(a, 5) * at(a, 10) +
    at(a, 12) * at(a, 6) * at(a, 9);
  inv[1] =
    -at(a, 1) * at(a, 10) * at(a, 15) +
    at(a, 1) * at(a, 11) * at(a, 14) +
    at(a, 9) * at(a, 2) * at(a, 15) -
    at(a, 9) * at(a, 3) * at(a, 14) -
    at(a, 13) * at(a, 2) * at(a, 11) +
    at(a, 13) * at(a, 3) * at(a, 10);
  inv[5] =
    at(a, 0) * at(a, 10) * at(a, 15) -
    at(a, 0) * at(a, 11) * at(a, 14) -
    at(a, 8) * at(a, 2) * at(a, 15) +
    at(a, 8) * at(a, 3) * at(a, 14) +
    at(a, 12) * at(a, 2) * at(a, 11) -
    at(a, 12) * at(a, 3) * at(a, 10);
  inv[9] =
    -at(a, 0) * at(a, 9) * at(a, 15) +
    at(a, 0) * at(a, 11) * at(a, 13) +
    at(a, 8) * at(a, 1) * at(a, 15) -
    at(a, 8) * at(a, 3) * at(a, 13) -
    at(a, 12) * at(a, 1) * at(a, 11) +
    at(a, 12) * at(a, 3) * at(a, 9);
  inv[13] =
    at(a, 0) * at(a, 9) * at(a, 14) -
    at(a, 0) * at(a, 10) * at(a, 13) -
    at(a, 8) * at(a, 1) * at(a, 14) +
    at(a, 8) * at(a, 2) * at(a, 13) +
    at(a, 12) * at(a, 1) * at(a, 10) -
    at(a, 12) * at(a, 2) * at(a, 9);
  inv[2] =
    at(a, 1) * at(a, 6) * at(a, 15) -
    at(a, 1) * at(a, 7) * at(a, 14) -
    at(a, 5) * at(a, 2) * at(a, 15) +
    at(a, 5) * at(a, 3) * at(a, 14) +
    at(a, 13) * at(a, 2) * at(a, 7) -
    at(a, 13) * at(a, 3) * at(a, 6);
  inv[6] =
    -at(a, 0) * at(a, 6) * at(a, 15) +
    at(a, 0) * at(a, 7) * at(a, 14) +
    at(a, 4) * at(a, 2) * at(a, 15) -
    at(a, 4) * at(a, 3) * at(a, 14) -
    at(a, 12) * at(a, 2) * at(a, 7) +
    at(a, 12) * at(a, 3) * at(a, 6);
  inv[10] =
    at(a, 0) * at(a, 5) * at(a, 15) -
    at(a, 0) * at(a, 7) * at(a, 13) -
    at(a, 4) * at(a, 1) * at(a, 15) +
    at(a, 4) * at(a, 3) * at(a, 13) +
    at(a, 12) * at(a, 1) * at(a, 7) -
    at(a, 12) * at(a, 3) * at(a, 5);
  inv[14] =
    -at(a, 0) * at(a, 5) * at(a, 14) +
    at(a, 0) * at(a, 6) * at(a, 13) +
    at(a, 4) * at(a, 1) * at(a, 14) -
    at(a, 4) * at(a, 2) * at(a, 13) -
    at(a, 12) * at(a, 1) * at(a, 6) +
    at(a, 12) * at(a, 2) * at(a, 5);
  inv[3] =
    -at(a, 1) * at(a, 6) * at(a, 11) +
    at(a, 1) * at(a, 7) * at(a, 10) +
    at(a, 5) * at(a, 2) * at(a, 11) -
    at(a, 5) * at(a, 3) * at(a, 10) -
    at(a, 9) * at(a, 2) * at(a, 7) +
    at(a, 9) * at(a, 3) * at(a, 6);
  inv[7] =
    at(a, 0) * at(a, 6) * at(a, 11) -
    at(a, 0) * at(a, 7) * at(a, 10) -
    at(a, 4) * at(a, 2) * at(a, 11) +
    at(a, 4) * at(a, 3) * at(a, 10) +
    at(a, 8) * at(a, 2) * at(a, 7) -
    at(a, 8) * at(a, 3) * at(a, 6);
  inv[11] =
    -at(a, 0) * at(a, 5) * at(a, 11) +
    at(a, 0) * at(a, 7) * at(a, 9) +
    at(a, 4) * at(a, 1) * at(a, 11) -
    at(a, 4) * at(a, 3) * at(a, 9) -
    at(a, 8) * at(a, 1) * at(a, 7) +
    at(a, 8) * at(a, 3) * at(a, 5);
  inv[15] =
    at(a, 0) * at(a, 5) * at(a, 10) -
    at(a, 0) * at(a, 6) * at(a, 9) -
    at(a, 4) * at(a, 1) * at(a, 10) +
    at(a, 4) * at(a, 2) * at(a, 9) +
    at(a, 8) * at(a, 1) * at(a, 6) -
    at(a, 8) * at(a, 2) * at(a, 5);

  const det =
    at(a, 0) * at(inv, 0) +
    at(a, 1) * at(inv, 4) +
    at(a, 2) * at(inv, 8) +
    at(a, 3) * at(inv, 12);
  if (det === 0) {
    // Return identity to match former behavior
    return createMatrix4();
  }

  const invDet = 1.0 / det;
  for (let i = 0; i < 16; i++) {
    inv[i] = (inv[i] ?? 0) * invDet;
  }
  return inv;
}

export function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16);

  const a00 = at(a, 0),
    a01 = at(a, 1),
    a02 = at(a, 2),
    a03 = at(a, 3);
  const a10 = at(a, 4),
    a11 = at(a, 5),
    a12 = at(a, 6),
    a13 = at(a, 7);
  const a20 = at(a, 8),
    a21 = at(a, 9),
    a22 = at(a, 10),
    a23 = at(a, 11);
  const a30 = at(a, 12),
    a31 = at(a, 13),
    a32 = at(a, 14),
    a33 = at(a, 15);

  const b00 = at(b, 0),
    b01 = at(b, 1),
    b02 = at(b, 2),
    b03 = at(b, 3);
  const b10 = at(b, 4),
    b11 = at(b, 5),
    b12 = at(b, 6),
    b13 = at(b, 7);
  const b20 = at(b, 8),
    b21 = at(b, 9),
    b22 = at(b, 10),
    b23 = at(b, 11);
  const b30 = at(b, 12),
    b31 = at(b, 13),
    b32 = at(b, 14),
    b33 = at(b, 15);

  out[0] = a00 * b00 + a01 * b10 + a02 * b20 + a03 * b30;
  out[1] = a00 * b01 + a01 * b11 + a02 * b21 + a03 * b31;
  out[2] = a00 * b02 + a01 * b12 + a02 * b22 + a03 * b32;
  out[3] = a00 * b03 + a01 * b13 + a02 * b23 + a03 * b33;
  out[4] = a10 * b00 + a11 * b10 + a12 * b20 + a13 * b30;
  out[5] = a10 * b01 + a11 * b11 + a12 * b21 + a13 * b31;
  out[6] = a10 * b02 + a11 * b12 + a12 * b22 + a13 * b32;
  out[7] = a10 * b03 + a11 * b13 + a12 * b23 + a13 * b33;
  out[8] = a20 * b00 + a21 * b10 + a22 * b20 + a23 * b30;
  out[9] = a20 * b01 + a21 * b11 + a22 * b21 + a23 * b31;
  out[10] = a20 * b02 + a21 * b12 + a22 * b22 + a23 * b32;
  out[11] = a20 * b03 + a21 * b13 + a22 * b23 + a23 * b33;
  out[12] = a30 * b00 + a31 * b10 + a32 * b20 + a33 * b30;
  out[13] = a30 * b01 + a31 * b11 + a32 * b21 + a33 * b31;
  out[14] = a30 * b02 + a31 * b12 + a32 * b22 + a33 * b32;
  out[15] = a30 * b03 + a31 * b13 + a32 * b23 + a33 * b33;

  return out;
}

export function makeRotationFromQuaternion(
  q: { x: number; y: number; z: number; w: number },
  out?: Mat4,
): Mat4 {
  const outMat = out ?? new Float32Array(16);
  const x = q.x,
    y = q.y,
    z = q.z,
    w = q.w;
  const x2 = x + x,
    y2 = y + y,
    z2 = z + z;
  const xx = x * x2,
    xy = x * y2,
    xz = x * z2;
  const yy = y * y2,
    yz = y * z2,
    zz = z * z2;
  const wx = w * x2,
    wy = w * y2,
    wz = w * z2;

  outMat[0] = 1 - (yy + zz);
  outMat[1] = xy + wz;
  outMat[2] = xz - wy;
  outMat[3] = 0;

  outMat[4] = xy - wz;
  outMat[5] = 1 - (xx + zz);
  outMat[6] = yz + wx;
  outMat[7] = 0;

  outMat[8] = xz + wy;
  outMat[9] = yz - wx;
  outMat[10] = 1 - (xx + yy);
  outMat[11] = 0;

  outMat[12] = 0;
  outMat[13] = 0;
  outMat[14] = 0;
  outMat[15] = 1;

  return outMat;
}

export function makeScale(x: number, y: number, z: number, out?: Mat4): Mat4 {
  const outMat = out ?? new Float32Array(16);
  identity(outMat);
  outMat[0] = x;
  outMat[5] = y;
  outMat[10] = z;
  return outMat;
}
