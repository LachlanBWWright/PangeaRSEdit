/** Rotation utilities for Euler/quaternion conversion in Otto Matic's coordinate space. */

import { Vector3 } from "three";
import { Matrix4 } from "./matrix4Utils";
import { BG3DBone } from "./parseBG3D";

/** Safely reads a Float32Array element while preserving a plain number return type. */
function atF32(arr: Float32Array, index: number): number {
  return arr[index] ?? 0;
}

/** Converts Euler angles in radians to a quaternion using Otto's XYZ rotation order. */
export function eulerToQuaternion(
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

  // Extrinsic XYZ (= intrinsic ZYX) rotation order: q = qz * qy * qx
  const qx = c2 * c3 * s1 - s2 * s3 * c1;
  const qy = c1 * c3 * s2 + s1 * c2 * s3;
  const qz = c1 * c2 * s3 - s1 * s2 * c3;
  const qw = c1 * c2 * c3 + s1 * s2 * s3;

  return [qx, qy, qz, qw];
}

/** Converts a quaternion back into Euler angles in radians. */
export function quaternionToEuler(
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

  // Convert quaternion to rotation matrix
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

  // Rotation matrix elements (using R[row][col] indexing)
  const R00 = 1 - (yy + zz);
  const R01 = xy - wz;
  const R10 = xy + wz;
  const R11 = 1 - (xx + zz);
  const R20 = xz - wy;
  const R21 = yz + wx;
  const R22 = 1 - (xx + yy);

  // Extract Euler angles for EXTRINSIC XYZ order (= Rz * Ry * Rx)
  const clamp = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  // y = asin(-R20) where R20 = -sin(y)
  const ry = Math.asin(clamp(-R20, -1, 1));

  let rx: number, rz: number;
  if (Math.abs(R20) < 0.9999999) {
    // x = atan2(R21, R22) where R21 = sin(x)*cos(y), R22 = cos(x)*cos(y)
    rx = Math.atan2(R21, R22);
    // z = atan2(R10, R00) where R10 = cos(y)*sin(z), R00 = cos(y)*cos(z)
    rz = Math.atan2(R10, R00);
  } else {
    // Gimbal lock case: y = ±90°, cos(y) = 0
    // In this case, we can only determine x+z or x-z
    // We set z=0 and solve for x from the remaining matrix elements
    rx = Math.atan2(-R01, R11);
    rz = 0;
  }

  return [rx, ry, rz];
}

/** Decomposes a 4x4 transform matrix into translation, rotation, and scale. */
export function decomposeMatrix(matrix: Matrix4): {
  translation: Vector3;
  rotation: [number, number, number, number];
  scale: Vector3;
} {
  const m = matrix.data;

  // Extract translation
  const translation = new Vector3(atF32(m, 12), atF32(m, 13), atF32(m, 14));

  // Extract scale
  const sx = Math.sqrt(
    atF32(m, 0) * atF32(m, 0) +
      atF32(m, 1) * atF32(m, 1) +
      atF32(m, 2) * atF32(m, 2),
  );
  const sy = Math.sqrt(
    atF32(m, 4) * atF32(m, 4) +
      atF32(m, 5) * atF32(m, 5) +
      atF32(m, 6) * atF32(m, 6),
  );
  const sz = Math.sqrt(
    atF32(m, 8) * atF32(m, 8) +
      atF32(m, 9) * atF32(m, 9) +
      atF32(m, 10) * atF32(m, 10),
  );
  const scale = new Vector3(sx, sy, sz);

  // Extract rotation (simplified - assuming no shear)
  // Normalize the rotation matrix
  const rotMatrix = [
    atF32(m, 0) / sx,
    atF32(m, 1) / sx,
    atF32(m, 2) / sx,
    atF32(m, 4) / sy,
    atF32(m, 5) / sy,
    atF32(m, 6) / sy,
    atF32(m, 8) / sz,
    atF32(m, 9) / sz,
    atF32(m, 10) / sz,
  ];

  // Get rotation matrix values safely
  const r0 = rotMatrix[0] ?? 0;
  const r1 = rotMatrix[1] ?? 0;
  const r2 = rotMatrix[2] ?? 0;
  const r3 = rotMatrix[3] ?? 0;
  const r4 = rotMatrix[4] ?? 0;
  const r5 = rotMatrix[5] ?? 0;
  const r6 = rotMatrix[6] ?? 0;
  const r7 = rotMatrix[7] ?? 0;
  const r8 = rotMatrix[8] ?? 0;

  // Convert rotation matrix to quaternion
  const trace = r0 + r4 + r8;
  let qw, qx, qy, qz;

  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1.0);
    qw = 0.25 / s;
    qx = (r7 - r5) * s;
    qy = (r2 - r6) * s;
    qz = (r3 - r1) * s;
  } else {
    if (r0 > r4 && r0 > r8) {
      const s = 2.0 * Math.sqrt(1.0 + r0 - r4 - r8);
      qw = (r7 - r5) / s;
      qx = 0.25 * s;
      qy = (r1 + r3) / s;
      qz = (r2 + r6) / s;
    } else if (r4 > r8) {
      const s = 2.0 * Math.sqrt(1.0 + r4 - r0 - r8);
      qw = (r2 - r6) / s;
      qx = (r1 + r3) / s;
      qy = 0.25 * s;
      qz = (r5 + r7) / s;
    } else {
      const s = 2.0 * Math.sqrt(1.0 + r8 - r0 - r4);
      qw = (r3 - r1) / s;
      qx = (r2 + r6) / s;
      qy = (r5 + r7) / s;
      qz = 0.25 * s;
    }
  }

  const rotation: [number, number, number, number] = [qx, qy, qz, qw];

  return { translation, rotation, scale };
}

/** Calculates a bone's local transform relative to its parent bone. */
export function calculateLocalTransform(
  bone: BG3DBone,
  bones: BG3DBone[],
): Matrix4 {
  // Get bone's absolute position in Otto coordinate system
  const bonePos = new Vector3(bone.coordX, bone.coordY, bone.coordZ);

  // If this bone has a valid parent, calculate relative transform
  if (bone.parentBone >= 0 && bone.parentBone < bones.length) {
    const parentBone = bones[bone.parentBone];
    if (!parentBone) {
      return new Matrix4().setTranslation(bonePos.x, bonePos.y, bonePos.z);
    }
    const parentPos = new Vector3(
      parentBone.coordX,
      parentBone.coordY,
      parentBone.coordZ,
    );

    // Calculate relative translation
    const relativeTranslation = new Vector3().subVectors(bonePos, parentPos);

    // Create transform matrix with relative translation
    return new Matrix4().setTranslation(
      relativeTranslation.x,
      relativeTranslation.y,
      relativeTranslation.z,
    );
  } else {
    // Root bone: use absolute position
    return new Matrix4().setTranslation(bonePos.x, bonePos.y, bonePos.z);
  }
}
