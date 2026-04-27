/** Matrix4 utility class and helpers for 3D transformations. */

/** Column-major 4x4 matrix for 3D transformations. */
export class Matrix4 {
  data: Float32Array;

  /** Creates an identity matrix. */
  constructor() {
    this.data = new Float32Array(16);
    this.identity();
  }

  /** Safely reads a matrix element by index. */
  private at(index: number): number {
    return this.data[index] ?? 0;
  }

  /** Resets the matrix to identity. */
  identity(): Matrix4 {
    this.data.fill(0);
    this.data[0] = this.data[5] = this.data[10] = this.data[15] = 1;
    return this;
  }

  /** Sets the translation component of the matrix. */
  setTranslation(x: number, y: number, z: number): Matrix4 {
    this.data[12] = x;
    this.data[13] = y;
    this.data[14] = z;
    return this;
  }

  /** Returns the translation component as a vector-like object. */
  getTranslation(): { x: number; y: number; z: number } {
    return {
      x: this.at(12),
      y: this.at(13),
      z: this.at(14),
    };
  }

  /** Returns the inverse of this matrix, or identity if it is not invertible. */
  invert(): Matrix4 {
    const result = new Matrix4();
    const inv = result.data;

    inv[0] =
      this.at(5) * this.at(10) * this.at(15) -
      this.at(5) * this.at(11) * this.at(14) -
      this.at(9) * this.at(6) * this.at(15) +
      this.at(9) * this.at(7) * this.at(14) +
      this.at(13) * this.at(6) * this.at(11) -
      this.at(13) * this.at(7) * this.at(10);
    inv[4] =
      -this.at(4) * this.at(10) * this.at(15) +
      this.at(4) * this.at(11) * this.at(14) +
      this.at(8) * this.at(6) * this.at(15) -
      this.at(8) * this.at(7) * this.at(14) -
      this.at(12) * this.at(6) * this.at(11) +
      this.at(12) * this.at(7) * this.at(10);
    inv[8] =
      this.at(4) * this.at(9) * this.at(15) -
      this.at(4) * this.at(11) * this.at(13) -
      this.at(8) * this.at(5) * this.at(15) +
      this.at(8) * this.at(7) * this.at(13) +
      this.at(12) * this.at(5) * this.at(11) -
      this.at(12) * this.at(7) * this.at(9);
    inv[12] =
      -this.at(4) * this.at(9) * this.at(14) +
      this.at(4) * this.at(10) * this.at(13) +
      this.at(8) * this.at(5) * this.at(14) -
      this.at(8) * this.at(6) * this.at(13) -
      this.at(12) * this.at(5) * this.at(10) +
      this.at(12) * this.at(6) * this.at(9);
    inv[1] =
      -this.at(1) * this.at(10) * this.at(15) +
      this.at(1) * this.at(11) * this.at(14) +
      this.at(9) * this.at(2) * this.at(15) -
      this.at(9) * this.at(3) * this.at(14) -
      this.at(13) * this.at(2) * this.at(11) +
      this.at(13) * this.at(3) * this.at(10);
    inv[5] =
      this.at(0) * this.at(10) * this.at(15) -
      this.at(0) * this.at(11) * this.at(14) -
      this.at(8) * this.at(2) * this.at(15) +
      this.at(8) * this.at(3) * this.at(14) +
      this.at(12) * this.at(2) * this.at(11) -
      this.at(12) * this.at(3) * this.at(10);
    inv[9] =
      -this.at(0) * this.at(9) * this.at(15) +
      this.at(0) * this.at(11) * this.at(13) +
      this.at(8) * this.at(1) * this.at(15) -
      this.at(8) * this.at(3) * this.at(13) -
      this.at(12) * this.at(1) * this.at(11) +
      this.at(12) * this.at(3) * this.at(9);
    inv[13] =
      this.at(0) * this.at(9) * this.at(14) -
      this.at(0) * this.at(10) * this.at(13) -
      this.at(8) * this.at(1) * this.at(14) +
      this.at(8) * this.at(2) * this.at(13) +
      this.at(12) * this.at(1) * this.at(10) -
      this.at(12) * this.at(2) * this.at(9);
    inv[2] =
      this.at(1) * this.at(6) * this.at(15) -
      this.at(1) * this.at(7) * this.at(14) -
      this.at(5) * this.at(2) * this.at(15) +
      this.at(5) * this.at(3) * this.at(14) +
      this.at(13) * this.at(2) * this.at(7) -
      this.at(13) * this.at(3) * this.at(6);
    inv[6] =
      -this.at(0) * this.at(6) * this.at(15) +
      this.at(0) * this.at(7) * this.at(14) +
      this.at(4) * this.at(2) * this.at(15) -
      this.at(4) * this.at(3) * this.at(14) -
      this.at(12) * this.at(2) * this.at(7) +
      this.at(12) * this.at(3) * this.at(6);
    inv[10] =
      this.at(0) * this.at(5) * this.at(15) -
      this.at(0) * this.at(7) * this.at(13) -
      this.at(4) * this.at(1) * this.at(15) +
      this.at(4) * this.at(3) * this.at(13) +
      this.at(12) * this.at(1) * this.at(7) -
      this.at(12) * this.at(3) * this.at(5);
    inv[14] =
      -this.at(0) * this.at(5) * this.at(14) +
      this.at(0) * this.at(6) * this.at(13) +
      this.at(4) * this.at(1) * this.at(14) -
      this.at(4) * this.at(2) * this.at(13) -
      this.at(12) * this.at(1) * this.at(6) +
      this.at(12) * this.at(2) * this.at(5);
    inv[3] =
      -this.at(1) * this.at(6) * this.at(11) +
      this.at(1) * this.at(7) * this.at(10) +
      this.at(5) * this.at(2) * this.at(11) -
      this.at(5) * this.at(3) * this.at(10) -
      this.at(9) * this.at(2) * this.at(7) +
      this.at(9) * this.at(3) * this.at(6);
    inv[7] =
      this.at(0) * this.at(6) * this.at(11) -
      this.at(0) * this.at(7) * this.at(10) -
      this.at(4) * this.at(2) * this.at(11) +
      this.at(4) * this.at(3) * this.at(10) +
      this.at(8) * this.at(2) * this.at(7) -
      this.at(8) * this.at(3) * this.at(6);
    inv[11] =
      -this.at(0) * this.at(5) * this.at(11) +
      this.at(0) * this.at(7) * this.at(9) +
      this.at(4) * this.at(1) * this.at(11) -
      this.at(4) * this.at(3) * this.at(9) -
      this.at(8) * this.at(1) * this.at(7) +
      this.at(8) * this.at(3) * this.at(5);
    inv[15] =
      this.at(0) * this.at(5) * this.at(10) -
      this.at(0) * this.at(6) * this.at(9) -
      this.at(4) * this.at(1) * this.at(10) +
      this.at(4) * this.at(2) * this.at(9) +
      this.at(8) * this.at(1) * this.at(6) -
      this.at(8) * this.at(2) * this.at(5);

    const det =
      this.at(0) * (inv[0] ?? 0) +
      this.at(1) * (inv[4] ?? 0) +
      this.at(2) * (inv[8] ?? 0) +
      this.at(3) * (inv[12] ?? 0);

    if (det === 0) {
      console.warn("Matrix is not invertible");
      return result.identity();
    }

    const invDet = 1.0 / det;
    for (let i = 0; i < 16; i++) {
      const val = inv[i];
      if (val !== undefined) {
        inv[i] = val * invDet;
      }
    }

    return result;
  }

  /** Multiplies this matrix by another matrix and returns the result. */
  multiply(other: Matrix4): Matrix4 {
    const result = new Matrix4();
    const a = this.data;
    const b = other.data;
    const out = result.data;

    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < 4; i++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          const aVal = a[k * 4 + i] ?? 0;
          const bVal = b[j * 4 + k] ?? 0;
          sum += aVal * bVal;
        }
        out[j * 4 + i] = sum;
      }
    }

    return result;
  }

  /** Replaces the matrix contents with a rotation derived from a quaternion. */
  makeRotationFromQuaternion(q: {
    x: number;
    y: number;
    z: number;
    w: number;
  }): Matrix4 {
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

    this.data[0] = 1 - (yy + zz);
    this.data[1] = xy + wz;
    this.data[2] = xz - wy;
    this.data[3] = 0;

    this.data[4] = xy - wz;
    this.data[5] = 1 - (xx + zz);
    this.data[6] = yz + wx;
    this.data[7] = 0;

    this.data[8] = xz + wy;
    this.data[9] = yz - wx;
    this.data[10] = 1 - (xx + yy);
    this.data[11] = 0;

    this.data[12] = 0;
    this.data[13] = 0;
    this.data[14] = 0;
    this.data[15] = 1;

    return this;
  }

  /** Replaces the matrix contents with a scale transform. */
  makeScale(x: number, y: number, z: number): Matrix4 {
    this.identity();
    this.data[0] = x;
    this.data[5] = y;
    this.data[10] = z;
    return this;
  }
}
