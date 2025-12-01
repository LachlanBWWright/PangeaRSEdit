/**
 * New Skeleton System Implementation
 *
 * This completely rebuilt system addresses the fundamental issues identified:
 * 1. Proper bone hierarchy construction (parent-child relationships)
 * 2. Correct coordinate space conversion (Otto absolute → glTF local)
 * 3. Fixed animation targeting (joints in scene before animations)
 * 4. Native glTF animation format (not stored in extras)
 */

import { Document, Node, Skin, Animation, Buffer } from "@gltf-transform/core";
import { Vector3 } from "three";
import {
  BG3DSkeleton,
  BG3DBone,
  BG3DAnimation,
  BG3DKeyframe,
} from "./parseBG3D";

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
 * Processed animation data ready for glTF conversion
 */
interface ProcessedAnimation {
  name: string;
  duration: number;
  channels: AnimationChannelData[];
}

interface AnimationChannelData {
  boneIndex: number;
  path: "translation" | "rotation" | "scale";
  times: number[];
  values: number[];
}

/**
 * Matrix utilities for coordinate transformations
 */
class Matrix4 {
  data: Float32Array;

  constructor() {
    this.data = new Float32Array(16);
    this.identity();
  }

  identity(): Matrix4 {
    this.data.fill(0);
    this.data[0] = this.data[5] = this.data[10] = this.data[15] = 1;
    return this;
  }

  setTranslation(x: number, y: number, z: number): Matrix4 {
    this.data[12] = x;
    this.data[13] = y;
    this.data[14] = z;
    return this;
  }

  invert(): Matrix4 {
    const result = new Matrix4();
    const m = this.data;
    const inv = result.data;

    // Calculate matrix inverse using standard algorithm
    inv[0] =
      m[5] * m[10] * m[15] -
      m[5] * m[11] * m[14] -
      m[9] * m[6] * m[15] +
      m[9] * m[7] * m[14] +
      m[13] * m[6] * m[11] -
      m[13] * m[7] * m[10];
    inv[4] =
      -m[4] * m[10] * m[15] +
      m[4] * m[11] * m[14] +
      m[8] * m[6] * m[15] -
      m[8] * m[7] * m[14] -
      m[12] * m[6] * m[11] +
      m[12] * m[7] * m[10];
    inv[8] =
      m[4] * m[9] * m[15] -
      m[4] * m[11] * m[13] -
      m[8] * m[5] * m[15] +
      m[8] * m[7] * m[13] +
      m[12] * m[5] * m[11] -
      m[12] * m[7] * m[9];
    inv[12] =
      -m[4] * m[9] * m[14] +
      m[4] * m[10] * m[13] +
      m[8] * m[5] * m[14] -
      m[8] * m[6] * m[13] -
      m[12] * m[5] * m[10] +
      m[12] * m[6] * m[9];
    inv[1] =
      -m[1] * m[10] * m[15] +
      m[1] * m[11] * m[14] +
      m[9] * m[2] * m[15] -
      m[9] * m[3] * m[14] -
      m[13] * m[2] * m[11] +
      m[13] * m[3] * m[10];
    inv[5] =
      m[0] * m[10] * m[15] -
      m[0] * m[11] * m[14] -
      m[8] * m[2] * m[15] +
      m[8] * m[3] * m[14] +
      m[12] * m[2] * m[11] -
      m[12] * m[3] * m[10];
    inv[9] =
      -m[0] * m[9] * m[15] +
      m[0] * m[11] * m[13] +
      m[8] * m[1] * m[15] -
      m[8] * m[3] * m[13] -
      m[12] * m[1] * m[11] +
      m[12] * m[3] * m[9];
    inv[13] =
      m[0] * m[9] * m[14] -
      m[0] * m[10] * m[13] -
      m[8] * m[1] * m[14] +
      m[8] * m[2] * m[13] +
      m[12] * m[1] * m[10] -
      m[12] * m[2] * m[9];
    inv[2] =
      m[1] * m[6] * m[15] -
      m[1] * m[7] * m[14] -
      m[5] * m[2] * m[15] +
      m[5] * m[3] * m[14] +
      m[13] * m[2] * m[7] -
      m[13] * m[3] * m[6];
    inv[6] =
      -m[0] * m[6] * m[15] +
      m[0] * m[7] * m[14] +
      m[4] * m[2] * m[15] -
      m[4] * m[3] * m[14] -
      m[12] * m[2] * m[7] +
      m[12] * m[3] * m[6];
    inv[10] =
      m[0] * m[5] * m[15] -
      m[0] * m[7] * m[13] -
      m[4] * m[1] * m[15] +
      m[4] * m[3] * m[13] +
      m[12] * m[1] * m[7] -
      m[12] * m[3] * m[5];
    inv[14] =
      -m[0] * m[5] * m[14] +
      m[0] * m[6] * m[13] +
      m[4] * m[1] * m[14] -
      m[4] * m[2] * m[13] -
      m[12] * m[1] * m[6] +
      m[12] * m[2] * m[5];
    inv[3] =
      -m[1] * m[6] * m[11] +
      m[1] * m[7] * m[10] +
      m[5] * m[2] * m[11] -
      m[5] * m[3] * m[10] -
      m[9] * m[2] * m[7] +
      m[9] * m[3] * m[6];
    inv[7] =
      m[0] * m[6] * m[11] -
      m[0] * m[7] * m[10] -
      m[4] * m[2] * m[11] +
      m[4] * m[3] * m[10] +
      m[8] * m[2] * m[7] -
      m[8] * m[3] * m[6];
    inv[11] =
      -m[0] * m[5] * m[11] +
      m[0] * m[7] * m[9] +
      m[4] * m[1] * m[11] -
      m[4] * m[3] * m[9] -
      m[8] * m[1] * m[7] +
      m[8] * m[3] * m[5];
    inv[15] =
      m[0] * m[5] * m[10] -
      m[0] * m[6] * m[9] -
      m[4] * m[1] * m[10] +
      m[4] * m[2] * m[9] +
      m[8] * m[1] * m[6] -
      m[8] * m[2] * m[5];

    const det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];

    if (det === 0) {
      console.warn("Matrix is not invertible");
      return result.identity();
    }

    const invDet = 1.0 / det;
    for (let i = 0; i < 16; i++) {
      inv[i] *= invDet;
    }

    return result;
  }

  multiply(other: Matrix4): Matrix4 {
    // Column-major matrix multiplication: result = this * other
    // For column-major storage: m[col*4 + row]
    // So a[0], a[1], a[2], a[3] is column 0 (rows 0-3)
    //    a[4], a[5], a[6], a[7] is column 1 (rows 0-3), etc.

    const result = new Matrix4();
    const a = this.data;
    const b = other.data;
    const out = result.data;

    // For each column j of result
    for (let j = 0; j < 4; j++) {
      // For each row i of result
      for (let i = 0; i < 4; i++) {
        // result[j][i] = sum over k of a[k][i] * b[j][k]
        // In column-major: result[j*4+i] = sum(a[k*4+i] * b[j*4+k])
        let sum = 0;
        for (let k = 0; k < 4; k++) {
          sum += a[k * 4 + i] * b[j * 4 + k];
        }
        out[j * 4 + i] = sum;
      }
    }

    return result;
  }
}

/**
 * Calculate local transform for a bone relative to its parent
 * Converts from Otto's absolute coordinates to glTF's relative transforms
 * Also handles coordinate system conversion (right-handed Otto to left-handed glTF)
 */
function calculateLocalTransform(bone: BG3DBone, bones: BG3DBone[]): Matrix4 {
  // Get bone's absolute position in Otto coordinate system (right-handed)
  //const bonePos = new Vector3(bone.coordX, bone.coordY, bone.coordZ);

  // Convert to left-handed glTF coordinate system (flip Z)
  const gltfBonePos = new Vector3(bone.coordX, bone.coordY, -bone.coordZ);

  // If this bone has a valid parent, calculate relative transform
  if (bone.parentBone >= 0 && bone.parentBone < bones.length) {
    const parentBone = bones[bone.parentBone];
    const parentPos = new Vector3(
      parentBone.coordX,
      parentBone.coordY,
      -parentBone.coordZ,
    );

    // Calculate relative translation
    const relativeTranslation = new Vector3().subVectors(
      gltfBonePos,
      parentPos,
    );

    // Create transform matrix with relative translation
    return new Matrix4().setTranslation(
      relativeTranslation.x,
      relativeTranslation.y,
      relativeTranslation.z,
    );
  } else {
    // Root bone: use absolute position (converted to left-handed)
    return new Matrix4().setTranslation(
      gltfBonePos.x,
      gltfBonePos.y,
      gltfBonePos.z,
    );
  }
}

/**
 * Decompose a 4x4 matrix into translation, rotation (quaternion), and scale
 */
function decomposeMatrix(matrix: Matrix4): {
  translation: Vector3;
  rotation: [number, number, number, number];
  scale: Vector3;
} {
  const m = matrix.data;

  // Extract translation
  const translation = new Vector3(m[12], m[13], m[14]);

  // Extract scale
  const sx = Math.sqrt(m[0] * m[0] + m[1] * m[1] + m[2] * m[2]);
  const sy = Math.sqrt(m[4] * m[4] + m[5] * m[5] + m[6] * m[6]);
  const sz = Math.sqrt(m[8] * m[8] + m[9] * m[9] + m[10] * m[10]);
  const scale = new Vector3(sx, sy, sz);

  // Extract rotation (simplified - assuming no shear)
  // Normalize the rotation matrix
  const rotMatrix = [
    m[0] / sx,
    m[1] / sx,
    m[2] / sx,
    m[4] / sy,
    m[5] / sy,
    m[6] / sy,
    m[8] / sz,
    m[9] / sz,
    m[10] / sz,
  ];

  // Convert rotation matrix to quaternion
  const trace = rotMatrix[0] + rotMatrix[4] + rotMatrix[8];
  let qw, qx, qy, qz;

  if (trace > 0) {
    const s = 0.5 / Math.sqrt(trace + 1.0);
    qw = 0.25 / s;
    qx = (rotMatrix[7] - rotMatrix[5]) * s;
    qy = (rotMatrix[2] - rotMatrix[6]) * s;
    qz = (rotMatrix[3] - rotMatrix[1]) * s;
  } else {
    if (rotMatrix[0] > rotMatrix[4] && rotMatrix[0] > rotMatrix[8]) {
      const s =
        2.0 * Math.sqrt(1.0 + rotMatrix[0] - rotMatrix[4] - rotMatrix[8]);
      qw = (rotMatrix[7] - rotMatrix[5]) / s;
      qx = 0.25 * s;
      qy = (rotMatrix[1] + rotMatrix[3]) / s;
      qz = (rotMatrix[2] + rotMatrix[6]) / s;
    } else if (rotMatrix[4] > rotMatrix[8]) {
      const s =
        2.0 * Math.sqrt(1.0 + rotMatrix[4] - rotMatrix[0] - rotMatrix[8]);
      qw = (rotMatrix[2] - rotMatrix[6]) / s;
      qx = (rotMatrix[1] + rotMatrix[3]) / s;
      qy = 0.25 * s;
      qz = (rotMatrix[5] + rotMatrix[7]) / s;
    } else {
      const s =
        2.0 * Math.sqrt(1.0 + rotMatrix[8] - rotMatrix[0] - rotMatrix[4]);
      qw = (rotMatrix[3] - rotMatrix[1]) / s;
      qx = (rotMatrix[2] + rotMatrix[6]) / s;
      qy = (rotMatrix[5] + rotMatrix[7]) / s;
      qz = 0.25 * s;
    }
  }

  const rotation: [number, number, number, number] = [qx, qy, qz, qw];

  return { translation, rotation, scale };
}

/**
 * Create joint nodes (bones) for the skeleton with proper local transforms.
 *
 * IMPORTANT: Bone names are preserved exactly as they appear in the Otto Matic files,
 * including spaces (e.g., "Left Hand"). This ensures perfect roundtrip accuracy.
 * Modern Three.js versions handle spaces in bone names correctly.
 *
 * Note: Otto stores absolute world coordinates for each bone. glTF requires relative
 * transforms, so we calculate local transforms relative to parent bones and convert
 * to left-handed coordinate system.
 */
function createJointNodes(doc: Document, bones: BG3DBone[]): Node[] {
  return bones.map((bone) => {
    // Preserve original bone names for perfect roundtrip accuracy
    const joint = doc.createNode(bone.name);

    // Calculate and set local transform
    const localTransform = calculateLocalTransform(bone, bones);

    // Decompose matrix into TRS components for better glTF compatibility
    const { translation, rotation, scale } = decomposeMatrix(localTransform);

    joint.setTranslation([translation.x, translation.y, translation.z]);
    joint.setRotation(rotation);
    joint.setScale([scale.x, scale.y, scale.z]);

    return joint;
  });
}

/**
 * Build proper joint hierarchy for glTF 2.0 compliance
 *
 * glTF 2.0 REQUIRES all joints in a skin to have a common root in the scene hierarchy.
 * We create an "Armature" node as the common parent of all joints.
 *
 * IMPORTANT: The Armature node itself must be added to the scene. Skinned meshes will be
 * added as children of the Armature (or as siblings, but descendant of scene).
 *
 * Note: Three.js PropertyBinding can find joints by name even when they're nested,
 * as long as they're in the scene hierarchy.
 */
function buildJointHierarchy(
  doc: Document,
  joints: Node[],
  bones: BG3DBone[],
): Node {
  if (joints.length !== bones.length) {
    throw new Error(
      `Mismatch: ${joints.length} joints vs ${bones.length} bones`,
    );
  }

  console.log("\n=== Building Joint Hierarchy (glTF 2.0 Compliant) ===");
  console.log(`Total bones: ${bones.length}`);

  // Create armature root as common parent for all joints (glTF 2.0 requirement)
  const skeletonRoot = doc.createNode("Armature");

  // Build hierarchy based on parentBone relationships
  const addedBones = new Set<number>();

  // Helper function to recursively add bone and its children
  function addBoneHierarchy(boneIndex: number, parentNode: Node) {
    if (addedBones.has(boneIndex)) {
      console.warn(`Bone ${boneIndex} already added, skipping to avoid cycles`);
      return;
    }

    const bone = bones[boneIndex];
    const joint = joints[boneIndex];

    parentNode.addChild(joint);
    addedBones.add(boneIndex);

    console.log(`  ✓ Added "${bone.name}" under ${parentNode.getName()}`);

    // Find and add children
    bones.forEach((childBone, childIndex) => {
      if (childBone.parentBone === boneIndex && !addedBones.has(childIndex)) {
        addBoneHierarchy(childIndex, joint);
      }
    });
  }

  // Find root bones (those with no valid parent)
  const rootBoneIndices: number[] = [];
  bones.forEach((bone, index) => {
    if (
      bone.parentBone === -1 ||
      bone.parentBone >= bones.length ||
      bone.parentBone < -1
    ) {
      rootBoneIndices.push(index);
    }
  });

  console.log(
    `Found ${rootBoneIndices.length} root bones: ${rootBoneIndices
      .map((i) => bones[i].name)
      .join(", ")}`,
  );

  // Add root bones as children of Armature
  rootBoneIndices.forEach((rootIndex) => {
    addBoneHierarchy(rootIndex, skeletonRoot);
  });

  // Check if all bones were added
  if (addedBones.size !== bones.length) {
    console.warn(
      `Not all bones were added to hierarchy. Added: ${addedBones.size}, Total: ${bones.length}`,
    );
    // Add any remaining bones as children of Armature to ensure they're in the scene
    bones.forEach((bone, index) => {
      if (!addedBones.has(index)) {
        console.warn(`Adding orphaned bone ${bone.name} directly to Armature`);
        skeletonRoot.addChild(joints[index]);
        addedBones.add(index);
      }
    });
  }

  // Add the Armature to the scene
  // Note: skeletonRoot is now added to scene via skeletonParent in createSkeletonSystem
  // scene.addChild(skeletonRoot);

  console.log(`✅ Created Armature with hierarchical bone structure`);
  console.log(`✅ Armature added to scene root`);
  console.log(`✅ Satisfies glTF 2.0 common root requirement`);

  return skeletonRoot;
}

/**
 * Calculate inverse bind matrices for skin using hierarchical transforms
 * Inverse bind matrices transform vertices from model space to bone space at bind pose
 */
function calculateInverseBindMatrices(bones: BG3DBone[]): Float32Array {
  const matrices = new Float32Array(bones.length * 16);

  // First, calculate world transforms for all bones
  const worldTransforms: Matrix4[] = new Array(bones.length);

  bones.forEach((bone, index) => {
    // Calculate local transform (already handles coordinate system conversion)
    const localTransform = calculateLocalTransform(bone, bones);

    // Calculate world transform by composing with parent transforms
    if (bone.parentBone >= 0 && bone.parentBone < bones.length) {
      const parentWorld = worldTransforms[bone.parentBone];
      worldTransforms[index] = parentWorld.multiply(localTransform);
    } else {
      // Root bone
      worldTransforms[index] = localTransform;
    }

    // Calculate inverse bind matrix (inverse of world transform)
    const invBindMatrix = worldTransforms[index].invert();

    // Store in column-major order (glTF requirement)
    const offset = index * 16;
    for (let i = 0; i < 16; i++) {
      matrices[offset + i] = invBindMatrix.data[i];
    }
  });

  return matrices;
}

/**
 * Create skin following glTF 2.0 specifications
 * Sets the skeleton root to a parent node of the joint hierarchy
 */
function createSkin(
  doc: Document,
  joints: Node[],
  bones: BG3DBone[],
  skeletonRoot: Node,
): Skin {
  const skin = doc.createSkin("skeleton");

  // Add joints in order (required for proper skinning)
  joints.forEach((joint) => {
    skin.addJoint(joint);
  });

  // Create a skeleton root node that is the parent of the joint hierarchy
  // This follows glTF 2.0 spec where skeleton can be a parent of the common root
  const skeletonParent = doc.createNode("Skeleton");
  skeletonParent.addChild(skeletonRoot);
  skin.setSkeleton(skeletonParent);

  // Calculate and set inverse bind matrices
  // These transform vertices from model space to bone space
  const ibmData = calculateInverseBindMatrices(bones);
  const buffer = doc.getRoot().listBuffers()[0];
  const ibmAccessor = doc
    .createAccessor()
    .setType("MAT4")
    .setArray(ibmData)
    .setBuffer(buffer);

  skin.setInverseBindMatrices(ibmAccessor);

  return skin;
}

/**
 * Check if array values have meaningful variation (not all same)
 */
function hasVariation(values: number[], threshold = 0.001): boolean {
  if (values.length < 2) return false;
  const first = values[0];
  return values.some((v) => Math.abs(v - first) > threshold);
}

/**
 * Process Otto animation data into glTF-compatible format
 * Converts absolute keyframe coordinates to relative transforms
 */
function processOttoAnimations(
  bg3dAnimations: BG3DAnimation[],
  bones: BG3DBone[],
): ProcessedAnimation[] {
  console.log("Processing Otto animations...");

  return bg3dAnimations.map((anim) => {
    const channels: AnimationChannelData[] = [];
    let maxTime = 0;

    console.log(`  Processing animation "${anim.name}"`);

    // Process each bone's keyframes for this animation
    Object.entries(anim.keyframes).forEach(([boneIndexStr, keyframes]) => {
      const boneIndex = parseInt(boneIndexStr);

      if (boneIndex >= 0 && boneIndex < bones.length && keyframes.length > 0) {
        const bone = bones[boneIndex];

        // Convert timing from Otto's 30 FPS system to seconds
        const times = keyframes.map((kf) => kf.tick / 30.0);
        maxTime = Math.max(maxTime, ...times);

        // Otto keyframe coord is LOCAL (relative to parent), which matches glTF joint translation
        // glTF animation values REPLACE the node's TRS, so we use kf.coord directly (with Z-flip)
        const translations = keyframes
          .map((kf) => {
            // Convert Otto LOCAL coord to glTF coord (just flip Z)
            return [kf.coordX, kf.coordY, -kf.coordZ];
          })
          .flat();
        // Always include translation channel for roundtrip stability
        // (hasVariation filtering causes non-deterministic behavior on roundtrip)
        channels.push({
          boneIndex,
          path: "translation",
          times: [...times],
          values: translations,
        });

        // Extract rotation data (convert Euler angles to quaternions)
        // Note: Otto rotations are relative to rest pose, so no subtraction needed
        // Coordinate system conversion: Otto uses +Z forward, glTF uses +Z backward
        // When Z axis is flipped, the rotation axis (ax, ay, az) becomes (ax, ay, -az)
        // For quaternion q = (qx, qy, qz, qw), the transformed quaternion is:
        // q' = (qx, qy, -qz, qw)
        const rotationQuats = keyframes.map((kf) => {
          // First convert Otto Euler angles to quaternion
          const [qx, qy, qz, qw] = eulerToQuaternion(
            kf.rotationX,
            kf.rotationY,
            kf.rotationZ,
          );
          // Apply Z-flip transformation to quaternion: negate qz only
          return [qx, qy, -qz, qw];
        });
        const rotations = rotationQuats.flat();
        // Always include rotation channel for roundtrip stability
        channels.push({
          boneIndex,
          path: "rotation",
          times: [...times],
          values: rotations,
        });

        // Extract scale data (relative to rest pose scale of 1.0)
        const scales = keyframes
          .map((kf) => [kf.scaleX, kf.scaleY, kf.scaleZ])
          .flat();
        // Always include scale channel for roundtrip stability
        channels.push({
          boneIndex,
          path: "scale",
          times: [...times],
          values: scales,
        });

        console.log(
          `    Bone ${bone.name}: ${keyframes.length} keyframes, ${times[
            times.length - 1
          ].toFixed(2)}s`,
        );
      }
    });

    console.log(
      `  Animation "${anim.name}": ${
        channels.length
      } channels, ${maxTime.toFixed(2)}s duration`,
    );

    return {
      name: anim.name,
      duration: maxTime,
      channels,
    };
  });
}

/**
 * Create glTF animations with proper node targeting
 */
function createGltfAnimations(
  doc: Document,
  joints: Node[],
  processedAnimations: ProcessedAnimation[],
  buffer?: Buffer,
): Animation[] {
  console.log("Creating glTF animations...");

  // Use provided buffer or fallback to first buffer
  const targetBuffer = buffer || doc.getRoot().listBuffers()[0];

  if (!targetBuffer) {
    console.error("No buffer available for animation data");
    return [];
  }

  // Filter out animations with no channels
  const validAnimations = processedAnimations.filter(
    (anim) => anim.channels.length > 0,
  );
  console.log(
    `Creating ${validAnimations.length} animations (filtered from ${processedAnimations.length})`,
  );

  return validAnimations.map((anim) => {
    const gltfAnimation = doc.createAnimation(anim.name);

    console.log(
      `  Creating animation "${anim.name}" with ${anim.channels.length} channels`,
    );

    let successfulChannels = 0;

    // Process all channels
    const allChannels = anim.channels;

    allChannels.forEach((channelData) => {
      const joint = joints[channelData.boneIndex];

      // Validate input data first
      if (!channelData.times || channelData.times.length === 0) {
        console.warn(
          `Skipping channel for joint ${joint?.getName()} path ${
            channelData.path
          }: no time data`,
        );
        return;
      }

      if (!channelData.values || channelData.values.length === 0) {
        console.warn(
          `Skipping channel for joint ${joint?.getName()} path ${
            channelData.path
          }: no value data`,
        );
        return;
      }

      // Enhanced validation for animation data
      const expectedValuesPerTime =
        channelData.path === "rotation"
          ? 4
          : channelData.path === "translation" || channelData.path === "scale"
          ? 3
          : 1;
      const expectedValueCount =
        channelData.times.length * expectedValuesPerTime;

      if (channelData.values.length !== expectedValueCount) {
        console.warn(
          `Skipping channel for joint ${joint?.getName()} path ${
            channelData.path
          }: value count mismatch. Expected ${expectedValueCount}, got ${
            channelData.values.length
          }`,
        );
        return;
      }

      // Validate for NaN or infinite values
      if (channelData.times.some((t) => !isFinite(t))) {
        console.warn(
          `Skipping channel for joint ${joint?.getName()} path ${
            channelData.path
          }: invalid time values`,
        );
        return;
      }

      if (channelData.values.some((v) => !isFinite(v))) {
        console.warn(
          `Skipping channel for joint ${joint?.getName()} path ${
            channelData.path
          }: invalid value data`,
        );
        return;
      }

      // Validate joint exists
      if (!joint) {
        console.warn(
          `Skipping channel for path ${channelData.path}: joint not found (index ${channelData.boneIndex})`,
        );
        return;
      }

      // Create time accessor with additional validation
      let timeAccessor;
      try {
        // Debug: Check the time data
        console.log(
          `        Time data for ${joint.getName()}.${
            channelData.path
          }: [${channelData.times.slice(0, 3).join(", ")}...] (${
            channelData.times.length
          } values)`,
        );

        timeAccessor = doc
          .createAccessor()
          .setType("SCALAR")
          .setArray(new Float32Array(channelData.times))
          .setBuffer(targetBuffer);

        if (!timeAccessor) {
          console.warn(
            `Failed to create time accessor for joint ${joint.getName()} path ${
              channelData.path
            }`,
          );
          return;
        }
      } catch (error) {
        console.warn(
          `Error creating time accessor for joint ${joint.getName()} path ${
            channelData.path
          }:`,
          error,
        );
        return;
      }

      // Create value accessor based on path type with validation
      let valueType: "VEC3" | "VEC4";
      switch (channelData.path) {
        case "translation":
        case "scale":
          valueType = "VEC3";
          break;
        case "rotation":
          valueType = "VEC4"; // Quaternions are VEC4
          break;
        default:
          valueType = "VEC3";
      }

      let valueAccessor;
      try {
        valueAccessor = doc
          .createAccessor()
          .setType(valueType)
          .setArray(new Float32Array(channelData.values))
          .setBuffer(targetBuffer);

        if (!valueAccessor) {
          console.warn(
            `Failed to create value accessor for joint ${joint.getName()} path ${
              channelData.path
            }`,
          );
          return;
        }
      } catch (error) {
        console.warn(
          `Error creating value accessor for joint ${joint.getName()} path ${
            channelData.path
          }:`,
          error,
        );
        return;
      }

      // Create sampler with robust error handling
      let sampler;
      try {
        sampler = doc
          .createAnimationSampler()
          .setInput(timeAccessor)
          .setOutput(valueAccessor)
          .setInterpolation("LINEAR");

        if (!sampler) {
          console.warn(
            `Failed to create sampler for joint ${joint.getName()} path ${
              channelData.path
            }`,
          );
          return;
        }
      } catch (error) {
        console.warn(
          `Error creating sampler for joint ${joint.getName()} path ${
            channelData.path
          }:`,
          error,
        );
        return;
      }
      // Create channel with robust error handling
      let channel;
      try {
        channel = doc
          .createAnimationChannel()
          .setTargetNode(joint) // Joint is now properly in scene graph
          .setTargetPath(channelData.path)
          .setSampler(sampler);

        if (!channel) {
          console.warn(
            `Failed to create channel for joint ${joint.getName()} path ${
              channelData.path
            }`,
          );
          return;
        }
      } catch (error) {
        console.warn(
          `Error creating channel for joint ${joint.getName()} path ${
            channelData.path
          }:`,
          error,
        );
        return;
      }

      try {
        gltfAnimation.addSampler(sampler).addChannel(channel);
        successfulChannels++;
        console.log(
          `    Added sampler and channel: ${joint.getName()}.${
            channelData.path
          }`,
        );
      } catch (error) {
        console.warn(
          `Error adding sampler and channel for joint ${joint.getName()} path ${
            channelData.path
          }:`,
          error,
        );
      }
    });

    // Debug: Check if the animation has samplers after adding channels
    const samplers = gltfAnimation.listSamplers();
    console.log(
      `  Animation "${anim.name}" final result: ${successfulChannels} channels added, ${samplers.length} samplers detected`,
    );

    // Debug: List the channels we just added
    const channels = gltfAnimation.listChannels();
    console.log(
      `  Animation "${anim.name}" channels: ${channels.length} found`,
    );
    channels.forEach((channel, index) => {
      const sampler = channel.getSampler();
      const node = channel.getTargetNode();
      console.log(
        `    Channel ${index}: ${node?.getName()}.${channel.getTargetPath()}, sampler: ${
          sampler ? "present" : "missing"
        }`,
      );
    });

    return gltfAnimation;
  });
}

/**
 * Main function to create complete skeleton system
 */
export function createSkeletonSystem(
  doc: Document,
  skeleton: BG3DSkeleton,
  buffer?: Buffer,
): { skin: Skin; animations: Animation[] } {
  console.log("=== Creating Skeleton System (glTF 2.0 Compliant) ===");
  console.log(
    `Bones: ${skeleton.bones.length}, Animations: ${skeleton.animations.length}`,
  );

  let scene = doc.getRoot().getDefaultScene();
  if (!scene) {
    console.log("No default scene found, creating one...");
    const newScene = doc.createScene("default");
    doc.getRoot().setDefaultScene(newScene);
    scene = doc.getRoot().getDefaultScene();
    if (!scene) {
      throw new Error("Failed to create default scene in glTF document");
    }
  } else {
    console.log(`Using existing default scene: "${scene.getName()}"`);
  }

  // Step 1: Create joint nodes with absolute transforms (Otto uses absolute coordinates)
  const joints = createJointNodes(doc, skeleton.bones);

  // Step 2: Build hierarchy (returns the skeleton root node)
  let skeletonRoot: Node;
  try {
    skeletonRoot = buildJointHierarchy(doc, joints, skeleton.bones);
  } catch (e) {
    console.error("Error building joint hierarchy:", e);
    throw e; // Don't silently fail - skeleton issues must be fixed
  }

  // Step 3: Create skin with proper skeleton root
  const skin = createSkin(doc, joints, skeleton.bones, skeletonRoot);

  // Add the skeleton parent to the scene (glTF 2.0 requirement)
  scene.addChild(skin.getSkeleton()!);

  // Step 4: Process animations
  console.log(`Processing ${skeleton.animations.length} animations...`);
  const processedAnimations = processOttoAnimations(
    skeleton.animations,
    skeleton.bones,
  );

  console.log(`Processed ${processedAnimations.length} animations:`);
  processedAnimations.slice(0, 5).forEach((anim) => {
    console.log(
      `  - "${anim.name}": ${anim.duration.toFixed(2)}s, ${
        anim.channels.length
      } channels`,
    );
  });

  const animations = createGltfAnimations(
    doc,
    joints,
    processedAnimations,
    buffer,
  );

  console.log("=== Skeleton System Complete (glTF 2.0 Compliant) ===");
  console.log(
    `Result: ${joints.length} joints, ${animations.length} animations`,
  );

  return { skin, animations };
}

/**
 * Convert quaternion to Euler angles (XYZ rotation order)
 * Uses Three.js-compatible approach: quaternion -> rotation matrix -> Euler
 * This is more numerically stable than direct conversion
 * Returns angles in radians
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
 * Extract animation data from glTF document for round-trip conversion
 *
 * Converts glTF animation channels back to Otto's keyframe format:
 * - glTF quaternions (VEC4) → Otto Euler angles (rotationX, rotationY, rotationZ)
 * - glTF translation (VEC3) → Otto coordinates (coordX, coordY, coordZ)
 *   Note: glTF stores relative offsets, Otto stores absolute positions
 *   We add bone rest pose to convert from relative to absolute
 * - glTF scale (VEC3) → Otto scale (scaleX, scaleY, scaleZ)
 *
 * @param doc glTF Document to extract from
 * @param bones Optional array of BG3DBone for converting relative translations back to absolute
 */
export function extractAnimationsFromGLTF(
  doc: Document,
  bones?: BG3DBone[],
): BG3DAnimation[] {
  const animations = doc.getRoot().listAnimations();
  const skins = doc.getRoot().listSkins();

  // We need the joints to map back to bone indices
  const joints = skins.length > 0 ? skins[0].listJoints() : [];

  return animations.map((anim) => {
    console.log(`Extracting animation "${anim.getName()}" from glTF`);

    const keyframes: { [boneIndex: string]: BG3DKeyframe[] } = {};

    // Process each channel in the animation
    const channels = anim.listChannels();
    channels.forEach((channel) => {
      const target = channel.getTargetNode();
      const sampler = channel.getSampler();
      const path = channel.getTargetPath();

      if (!target || !sampler) return;

      // Find the bone index for this joint
      const boneIndex = joints.indexOf(target);
      if (boneIndex === -1) return;

      const boneIndexStr = boneIndex.toString();

      // Get time and value data
      const inputAccessor = sampler.getInput();
      const outputAccessor = sampler.getOutput();

      if (!inputAccessor || !outputAccessor) return;

      const times = Array.from(inputAccessor.getArray() as Float32Array);
      const values = Array.from(outputAccessor.getArray() as Float32Array);

      // Initialize keyframes for this bone if not exists
      if (!keyframes[boneIndexStr]) {
        keyframes[boneIndexStr] = [];
      }

      // Determine values per frame based on path type
      // glTF stores rotation as quaternion (VEC4), translation and scale as VEC3
      const valuesPerFrame =
        path === "rotation"
          ? 4
          : path === "translation" || path === "scale"
          ? 3
          : 1;

      // Get bone rest pose for converting relative translations to absolute
      const bone = bones && boneIndex < bones.length ? bones[boneIndex] : null;

      for (let i = 0; i < times.length; i++) {
        const tick = Math.round(times[i] * 30); // Convert back to 30 FPS

        // Find or create keyframe for this tick
        let keyframe = keyframes[boneIndexStr].find((kf) => kf.tick === tick);
        if (!keyframe) {
          // Initialize with bone's LOCAL rest position (computed from absolute coords)
          // For root bone: localPos = bone.coord
          // For child bone: localPos = bone.coord - parent.coord
          let localX = bone?.coordX ?? 0;
          let localY = bone?.coordY ?? 0;
          let localZ = bone?.coordZ ?? 0;
          if (bone && bones && bone.parentBone >= 0 && bone.parentBone < bones.length) {
            const parent = bones[bone.parentBone];
            localX = bone.coordX - parent.coordX;
            localY = bone.coordY - parent.coordY;
            localZ = bone.coordZ - parent.coordZ;
          }
          keyframe = {
            tick,
            accelerationMode: 0,
            coordX: localX,
            coordY: localY,
            coordZ: localZ,
            rotationX: 0,
            rotationY: 0,
            rotationZ: 0,
            scaleX: 1,
            scaleY: 1,
            scaleZ: 1,
          };
          keyframes[boneIndexStr].push(keyframe);
        }

        // Apply the values based on path
        const valueIndex = i * valuesPerFrame;
        if (path === "translation") {
          // glTF animation translation is LOCAL (same as Otto kf.coord)
          // Just convert coordinate system: flip Z back
          const glTFX = values[valueIndex] || 0;
          const glTFY = values[valueIndex + 1] || 0;
          const glTFZ = values[valueIndex + 2] || 0;
          
          // Flip Z back to Otto's coordinate system
          keyframe.coordX = glTFX;
          keyframe.coordY = glTFY;
          keyframe.coordZ = -glTFZ;
        } else if (path === "rotation") {
          // Convert quaternion (x, y, z, w) back to Euler angles (XYZ order)
          // glTF stores quaternion with Z-flip applied: (qx, qy, -qz, qw)
          // Reverse the Z-flip: negate qz to get back to Otto's coordinate system
          const qx = values[valueIndex] || 0;
          const qy = values[valueIndex + 1] || 0;
          const qz = values[valueIndex + 2] || 0;
          const qw = values[valueIndex + 3] || 1;
          // Inverse of forward transformation (qx, qy, -qz, qw): negate qz back
          const [rx, ry, rz] = quaternionToEuler(qx, qy, -qz, qw);
          keyframe.rotationX = rx;
          keyframe.rotationY = ry;
          keyframe.rotationZ = rz;
        } else if (path === "scale") {
          keyframe.scaleX = values[valueIndex] || 1;
          keyframe.scaleY = values[valueIndex + 1] || 1;
          keyframe.scaleZ = values[valueIndex + 2] || 1;
        }
      }
    });

    // Sort keyframes by tick for each bone
    Object.values(keyframes).forEach((boneKeyframes) => {
      boneKeyframes.sort((a, b) => a.tick - b.tick);
    });

    console.log(
      `Extracted animation "${anim.getName()}" with ${
        Object.keys(keyframes).length
      } bone tracks`,
    );

    return {
      name: anim.getName() || "Unknown",
      numAnimEvents: 0,
      events: [],
      keyframes,
    };
  });
}
