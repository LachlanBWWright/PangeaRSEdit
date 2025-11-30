import { describe, it, expect } from "vitest";

/**
 * Convert Euler angles (in radians) to quaternion
 * Order: X-Y-Z rotation order
 */
function eulerToQuaternion(
  x: number,
  y: number,
  z: number,
): [number, number, number, number] {
  const c1 = Math.cos(x / 2);
  const c2 = Math.cos(y / 2);
  const c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2);
  const s2 = Math.sin(y / 2);
  const s3 = Math.sin(z / 2);

  const qx = s1 * c2 * c3 + c1 * s2 * s3;
  const qy = c1 * s2 * c3 - s1 * c2 * s3;
  const qz = c1 * c2 * s3 + s1 * s2 * c3;
  const qw = c1 * c2 * c3 - s1 * s2 * s3;

  return [qx, qy, qz, qw];
}

/**
 * Convert quaternion back to Euler angles (XYZ order)
 * Three.js setFromRotationMatrix implementation
 */
function quaternionToEuler(
  x: number,
  y: number,
  z: number,
  w: number,
): [number, number, number] {
  // Normalize the quaternion to avoid numerical issues
  const len = Math.sqrt(x * x + y * y + z * z + w * w);
  if (len > 0) {
    x /= len;
    y /= len;
    z /= len;
    w /= len;
  }

  // Convert quaternion to rotation matrix (Three.js approach)
  // Matrix is column-major, indexed as m[col][row] = m[col*4 + row]
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

  // Rotation matrix elements (column-major)
  const m11 = 1 - (yy + zz); // te[0]
  const m12 = xy - wz; // te[4]
  const m13 = xz + wy; // te[8]
  const m21 = xy + wz; // te[1]
  const m22 = 1 - (xx + zz); // te[5]
  const m23 = yz - wx; // te[9]
  // const m31 = xz - wy;     // te[2]
  // const m32 = yz + wx;     // te[6]
  const m33 = 1 - (xx + yy); // te[10]

  // Extract Euler angles from rotation matrix (XYZ order)
  // Three.js setFromRotationMatrix implementation
  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  const ry = Math.asin(clamp(m13, -1, 1)); // Y rotation (pitch)

  let rx: number, rz: number;
  if (Math.abs(m13) < 0.9999999) {
    rx = Math.atan2(-m23, m33); // X rotation (roll)
    rz = Math.atan2(-m12, m11); // Z rotation (yaw)
  } else {
    // Gimbal lock case
    rx = Math.atan2(m21, m22);
    rz = 0;
  }

  return [rx, ry, rz];
}

/**
 * Simulate Float32 precision (like glTF storage)
 */
function toFloat32(n: number): number {
  const arr = new Float32Array(1);
  arr[0] = n;
  return arr[0];
}

describe("Quaternion/Euler Roundtrip with Float32", () => {
  it("should be a stable fixed point after one euler->quat->euler cycle with Float32", () => {
    // Test various euler angles, simulating what happens in the skeleton system
    const testCases = [
      [0.1, 0.2, 0.3],
      [0.5, 0.7, -0.3],
      [-1.2, 0.4, 0.8],
      [Math.PI / 4, Math.PI / 6, Math.PI / 8],
      [0, 0, 0],
    ];

    for (const [rx, ry, rz] of testCases) {
      console.log(
        `\n=== Testing euler: [${rx.toFixed(6)}, ${ry.toFixed(6)}, ${rz.toFixed(
          6,
        )}] ===`,
      );

      // First roundtrip: euler -> quat -> euler (simulating RT1)
      const [qx1, qy1, qz1, qw1] = eulerToQuaternion(rx, ry, rz);
      const qx1_f32 = toFloat32(qx1),
        qy1_f32 = toFloat32(qy1),
        qz1_f32 = toFloat32(qz1),
        qw1_f32 = toFloat32(qw1);
      const [rx1, ry1, rz1] = quaternionToEuler(
        qx1_f32,
        qy1_f32,
        qz1_f32,
        qw1_f32,
      );

      // Serialize euler to Float32 (simulating binary output)
      const rx1_f32 = toFloat32(rx1),
        ry1_f32 = toFloat32(ry1),
        rz1_f32 = toFloat32(rz1);

      console.log(
        `  RT1 euler (Float32): [${rx1_f32.toFixed(10)}, ${ry1_f32.toFixed(
          10,
        )}, ${rz1_f32.toFixed(10)}]`,
      );

      // Second roundtrip: euler -> quat -> euler (simulating RT2)
      const [qx2, qy2, qz2, qw2] = eulerToQuaternion(rx1_f32, ry1_f32, rz1_f32);
      const qx2_f32 = toFloat32(qx2),
        qy2_f32 = toFloat32(qy2),
        qz2_f32 = toFloat32(qz2),
        qw2_f32 = toFloat32(qw2);
      const [rx2, ry2, rz2] = quaternionToEuler(
        qx2_f32,
        qy2_f32,
        qz2_f32,
        qw2_f32,
      );

      // Serialize euler to Float32
      const rx2_f32 = toFloat32(rx2),
        ry2_f32 = toFloat32(ry2),
        rz2_f32 = toFloat32(rz2);

      console.log(
        `  RT2 euler (Float32): [${rx2_f32.toFixed(10)}, ${ry2_f32.toFixed(
          10,
        )}, ${rz2_f32.toFixed(10)}]`,
      );

      // Compare RT1 and RT2 Float32 output - they SHOULD be identical for roundtrip stability
      const diffX = Math.abs(rx2_f32 - rx1_f32);
      const diffY = Math.abs(ry2_f32 - ry1_f32);
      const diffZ = Math.abs(rz2_f32 - rz1_f32);

      console.log(
        `  Diff: [${diffX.toExponential(4)}, ${diffY.toExponential(
          4,
        )}, ${diffZ.toExponential(4)}]`,
      );

      // The tolerance should be 0 for exact binary match
      // But allow tiny Float32 representation differences
      const tolerance = 1e-7;
      expect(diffX).toBeLessThan(tolerance);
      expect(diffY).toBeLessThan(tolerance);
      expect(diffZ).toBeLessThan(tolerance);
    }
  });

  it("should perfectly roundtrip euler -> quaternion -> euler", () => {
    // Test various euler angles
    const testCases = [
      [0, 0, 0],
      [0.1, 0.2, 0.3],
      [Math.PI / 4, Math.PI / 6, Math.PI / 8],
      [-0.5, 0.7, -0.3],
      [1.2, -0.8, 0.4],
      [0, Math.PI / 2, 0], // Edge case near gimbal lock
    ];

    for (const [rx, ry, rz] of testCases) {
      console.log(
        `\nTesting euler: [${rx.toFixed(6)}, ${ry.toFixed(6)}, ${rz.toFixed(
          6,
        )}]`,
      );

      // Forward: euler -> quaternion
      const [qx, qy, qz, qw] = eulerToQuaternion(rx, ry, rz);
      console.log(
        `  -> quaternion: [${qx.toFixed(6)}, ${qy.toFixed(6)}, ${qz.toFixed(
          6,
        )}, ${qw.toFixed(6)}]`,
      );

      // Inverse: quaternion -> euler
      const [rx2, ry2, rz2] = quaternionToEuler(qx, qy, qz, qw);
      console.log(
        `  -> euler back: [${rx2.toFixed(6)}, ${ry2.toFixed(6)}, ${rz2.toFixed(
          6,
        )}]`,
      );

      // Check within tolerance
      const tolerance = 1e-6;
      expect(Math.abs(rx2 - rx)).toBeLessThan(tolerance);
      expect(Math.abs(ry2 - ry)).toBeLessThan(tolerance);
      expect(Math.abs(rz2 - rz)).toBeLessThan(tolerance);
    }
  });

  it("should perfectly double-roundtrip euler -> quat -> euler -> quat -> euler", () => {
    const testCases = [
      [0.1, 0.2, 0.3],
      [0.5, 0.7, -0.3],
      [-1.2, 0.4, 0.8],
    ];

    for (const [rx, ry, rz] of testCases) {
      console.log(
        `\nTesting double roundtrip for: [${rx.toFixed(6)}, ${ry.toFixed(
          6,
        )}, ${rz.toFixed(6)}]`,
      );

      // First roundtrip: euler -> quat -> euler
      const [qx1, qy1, qz1, qw1] = eulerToQuaternion(rx, ry, rz);
      const [rx1, ry1, rz1] = quaternionToEuler(qx1, qy1, qz1, qw1);

      // Second roundtrip: euler -> quat -> euler
      const [qx2, qy2, qz2, qw2] = eulerToQuaternion(rx1, ry1, rz1);
      const [rx2, ry2, rz2] = quaternionToEuler(qx2, qy2, qz2, qw2);

      console.log(
        `  After RT1: [${rx1.toFixed(6)}, ${ry1.toFixed(6)}, ${rz1.toFixed(
          6,
        )}]`,
      );
      console.log(
        `  After RT2: [${rx2.toFixed(6)}, ${ry2.toFixed(6)}, ${rz2.toFixed(
          6,
        )}]`,
      );

      // RT1 should equal RT2 exactly (both should equal original)
      const tolerance = 1e-6;
      expect(Math.abs(rx2 - rx1)).toBeLessThan(tolerance);
      expect(Math.abs(ry2 - ry1)).toBeLessThan(tolerance);
      expect(Math.abs(rz2 - rz1)).toBeLessThan(tolerance);
    }
  });
});
