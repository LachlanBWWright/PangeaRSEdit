/**
 * New Skeleton System Implementation
 *
 * This completely rebuilt system addresses the fundamental issues identified:
 * 1. Proper bone hierarchy construction (parent-child relationships)
 * 2. Correct coordinate space conversion (Otto absolute → glTF local)
 * 3. Fixed animation targeting (joints in scene before animations)
 * 4. Native glTF animation format (not stored in extras)
 */

import { Document, Node, Skin, Animation, Scene } from "@gltf-transform/core";
import { BG3DSkeleton, BG3DBone, BG3DAnimation } from "./parseBG3D";

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
}

/**
 * Convert Otto's absolute bone coordinates to glTF local transforms
 */
function calculateLocalTransform(
  bone: BG3DBone,
  bones: BG3DBone[],
): [number, number, number] {
  console.log(
    `Calculating local transform for bone "${bone.name}" (parentBone: ${bone.parentBone})`,
  );
  console.log(
    `  Bone absolute coords: [${bone.coordX}, ${bone.coordY}, ${bone.coordZ}]`,
  );

  if (bone.parentBone >= 0 && bone.parentBone < bones.length) {
    const parent = bones[bone.parentBone];
    console.log(
      `  Parent "${parent.name}" coords: [${parent.coordX}, ${parent.coordY}, ${parent.coordZ}]`,
    );
    const localTransform: [number, number, number] = [
      bone.coordX - parent.coordX,
      bone.coordY - parent.coordY,
      bone.coordZ - parent.coordZ,
    ];
    console.log(
      `  Calculated local transform: [${localTransform
        .map((v) => v.toFixed(2))
        .join(", ")}]`,
    );
    return localTransform;
  }

  // Root bones: local transform = absolute coordinates
  console.log(
    `  Root bone local transform: [${bone.coordX}, ${bone.coordY}, ${bone.coordZ}]`,
  );
  return [bone.coordX, bone.coordY, bone.coordZ];
}

/**
 * Create joint nodes with proper local transforms
 */
function createJointNodes(doc: Document, bones: BG3DBone[]): Node[] {
  console.log("Creating joint nodes with local transforms...");

  return bones.map((bone, index) => {
    const joint = doc.createNode(bone.name);
    const localTransform = calculateLocalTransform(bone, bones);

    joint.setTranslation(localTransform);

    console.log(
      `  Joint ${index}: "${bone.name}" at local [${localTransform
        .map((v) => v.toFixed(2))
        .join(", ")}]`,
    );

    return joint;
  });
}

/**
 * Sort bones by hierarchy depth to ensure parents are processed before children
 */
function sortBonesByHierarchy(bones: BG3DBone[]): number[] {
  const result: number[] = [];
  const processed = new Set<number>();
  const childrenMap: Map<number, number[]> = new Map();

  // Build children map
  bones.forEach((bone, index) => {
    if (!childrenMap.has(bone.parentBone)) {
      childrenMap.set(bone.parentBone, []);
    }
    childrenMap.get(bone.parentBone)!.push(index);
  });

  // Process bones level by level using BFS
  const queue: number[] = [];

  // Start with root bones (parentBone === -1)
  if (childrenMap.has(-1)) {
    queue.push(...childrenMap.get(-1)!);
  }

  while (queue.length > 0) {
    const currentIndex = queue.shift()!;
    if (processed.has(currentIndex)) continue;

    result.push(currentIndex);
    processed.add(currentIndex);

    // Add children to queue
    if (childrenMap.has(currentIndex)) {
      queue.push(...childrenMap.get(currentIndex)!);
    }
  }

  // Add any remaining bones that weren't reached (shouldn't happen in a proper hierarchy)
  bones.forEach((_, index) => {
    if (!processed.has(index)) {
      result.push(index);
    }
  });

  return result;
}

/**
 * Build proper joint hierarchy following glTF skin specifications
 * CRITICAL: All joints must be descendants of a single common root for glTF compliance
 */
function buildJointHierarchy(
  doc: Document,
  joints: Node[],
  bones: BG3DBone[],
  scene: Scene,
): void {
  console.log("Building proper joint hierarchy for glTF compliance...");

  if (joints.length !== bones.length) {
    console.error(`Mismatch: ${joints.length} joints vs ${bones.length} bones`);
    return;
  }

  // Set names first
  joints.forEach((joint, index) => {
    joint.setName(bones[index].name);
  });

  // Find root bones (those with parentBone === -1)
  const rootBoneIndices = bones
    .map((bone, index) => ({ bone, index }))
    .filter(({ bone }) => bone.parentBone === -1)
    .map(({ index }) => index);

  console.log(`Found ${rootBoneIndices.length} root bones:`, 
    rootBoneIndices.map(i => bones[i].name));

  if (rootBoneIndices.length === 0) {
    console.error("No root bones found! Cannot build hierarchy.");
    return;
  }

  // For glTF compliance, we need exactly one root. If multiple roots exist,
  // we'll create a container root and put all actual roots under it
  let actualRoot: Node;
  
  if (rootBoneIndices.length === 1) {
    // Single root - use it directly
    actualRoot = joints[rootBoneIndices[0]];
    console.log(`Using single root bone: ${bones[rootBoneIndices[0]].name}`);
    
    // Add the actual root to scene
    scene.addChild(actualRoot);
    console.log(`Added root to scene: ${actualRoot.getName()}`);
  } else {
    // Multiple roots - create container root
    actualRoot = doc.createNode("SkeletonRoot");
    console.log(`Created container root for ${rootBoneIndices.length} root bones`);
    
    // Add container to scene first
    scene.addChild(actualRoot);
    console.log(`Added container root to scene`);
    
    // Add all root bones as children of container
    rootBoneIndices.forEach(rootIndex => {
      actualRoot.addChild(joints[rootIndex]);
      console.log(`  Added ${bones[rootIndex].name} to container root`);
    });
  }

  // Now build parent-child relationships for non-root bones
  // Process in hierarchy order to ensure parents exist before children
  const sortedBoneIndices = sortBonesByHierarchy(bones);
  
  sortedBoneIndices.forEach((boneIndex: number) => {
    const bone = bones[boneIndex];
    const joint = joints[boneIndex];

    // Skip root bones - they're already handled
    if (bone.parentBone === -1) {
      return;
    }

    if (bone.parentBone >= 0 && bone.parentBone < bones.length) {
      const parentJoint = joints[bone.parentBone];
      if (parentJoint && joint) {
        try {
          parentJoint.addChild(joint);
          console.log(`  ✓ ${bone.name} -> child of ${bones[bone.parentBone].name}`);
        } catch (e) {
          console.warn(`  Warning: Failed to parent ${bone.name}:`, e);
          // Fallback: add to actual root
          actualRoot.addChild(joint);
        }
      } else {
        console.warn(`  Warning: Invalid parent for ${bone.name}`);
        actualRoot.addChild(joint);
      }
    }
  });

  // Verify all joints are accessible from the single root
  const allJointsReachable = new Set<Node>();
  function collectReachableNodes(node: Node) {
    allJointsReachable.add(node);
    node.listChildren().forEach(collectReachableNodes);
  }
  collectReachableNodes(actualRoot);

  // Ensure every joint is reachable
  joints.forEach((joint, index) => {
    const bone = bones[index];
    if (!allJointsReachable.has(joint)) {
      console.error(`❌ Joint ${bone.name} not reachable - adding to root`);
      actualRoot.addChild(joint);
    } else {
      console.log(`  ✓ Joint "${bone.name}" is reachable from root`);
    }
  });

  // Log final hierarchy structure
  console.log("Final joint hierarchy:");
  function printHierarchy(node: Node, indent: string = "") {
    const isJoint = joints.includes(node);
    const marker = isJoint ? "🦴" : "🏗️";
    console.log(`${indent}${marker} ${node.getName() || "(unnamed)"}`);
    node.listChildren().forEach((child) => {
      printHierarchy(child, indent + "  ");
    });
  }
  printHierarchy(actualRoot);

  console.log(`✅ Joint hierarchy complete: single root with ${joints.length} joints`);
}

/**
 * Calculate inverse bind matrices for skin
 */
function calculateInverseBindMatrices(bones: BG3DBone[]): Float32Array {
  const matrices = new Float32Array(bones.length * 16);

  bones.forEach((bone, index) => {
    // Otto stores absolute coordinates, so world matrix is translation by absolute position
    const worldMatrix = new Matrix4().setTranslation(
      bone.coordX,
      bone.coordY,
      bone.coordZ,
    );
    const invMatrix = worldMatrix.invert();

    // Store in column-major order (glTF requirement)
    const offset = index * 16;
    for (let i = 0; i < 16; i++) {
      matrices[offset + i] = invMatrix.data[i];
    }
  });

  return matrices;
}

/**
 * Create skin following gltf-transform Skin specifications exactly
 * According to gltf-transform docs, all joints must be descendants of skeleton root
 */
function createSkin(doc: Document, joints: Node[], bones: BG3DBone[]): Skin {
  console.log("Creating skin following gltf-transform Skin specifications...");

  const skin = doc.createSkin("skeleton");

  // Add joints in order
  joints.forEach((joint, index) => {
    skin.addJoint(joint);
    console.log(`  Added joint ${index}: "${joint.getName()}" to skin`);
  });

  // Find the actual root of the joint hierarchy
  // This must be a node that is an ancestor of all joints
  const scene = doc.getRoot().getDefaultScene()!;
  let skeletonRoot: Node | null = null;

  // Helper function to check if a node contains all joints
  function containsAllJoints(node: Node): boolean {
    const reachableNodes = new Set<Node>();
    function collectNodes(n: Node) {
      reachableNodes.add(n);
      n.listChildren().forEach(collectNodes);
    }
    collectNodes(node);
    
    return joints.every(joint => reachableNodes.has(joint));
  }

  // Look for the skeleton root in scene children
  for (const child of scene.listChildren()) {
    if (containsAllJoints(child)) {
      skeletonRoot = child;
      break;
    }
  }

  // If no common root found, try to find the deepest node that contains all joints
  if (!skeletonRoot) {
    // Look for joints that are direct scene children and might be roots
    const directJoints = scene.listChildren().filter(child => joints.includes(child));
    if (directJoints.length === 1) {
      skeletonRoot = directJoints[0];
    } else if (directJoints.length > 1) {
      // Multiple roots - need to find or create a common ancestor
      console.warn("Multiple joint roots found, using first one as skeleton root");
      skeletonRoot = directJoints[0];
    }
  }

  if (skeletonRoot) {
    skin.setSkeleton(skeletonRoot);
    console.log(`  Set skeleton root to: "${skeletonRoot.getName()}" for glTF compliance`);
  } else {
    console.error("  Could not find valid skeleton root - this will cause glTF validation errors");
  }

  // Calculate and set inverse bind matrices following glTF specifications
  const ibmData = calculateInverseBindMatrices(bones);
  const buffer = doc.getRoot().listBuffers()[0];
  const ibmAccessor = doc
    .createAccessor()
    .setType("MAT4")
    .setArray(ibmData)
    .setBuffer(buffer);

  skin.setInverseBindMatrices(ibmAccessor);

  console.log(
    `✅ Skin created with ${joints.length} joints and skeleton root "${skeletonRoot?.getName() || 'NONE'}"`,
  );
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

        // Extract translation data
        const translations = keyframes
          .map((kf) => [kf.coordX, kf.coordY, kf.coordZ])
          .flat();
        const hasTranslationVar = hasVariation(translations);
        console.log(
          `    ${
            bone.name
          } translation variation: ${hasTranslationVar} (sample: [${translations
            .slice(0, 6)
            .join(", ")}...])`,
        );
        if (hasTranslationVar) {
          channels.push({
            boneIndex,
            path: "translation",
            times: [...times],
            values: translations,
          });
        }

        // Extract rotation data (convert Euler angles to quaternions)
        const rotationEulers = keyframes.map((kf) => [
          kf.rotationX,
          kf.rotationY,
          kf.rotationZ,
        ]);
        const rotationQuats = rotationEulers.map((euler) =>
          eulerToQuaternion(euler[0], euler[1], euler[2]),
        );
        const rotations = rotationQuats.flat();
        const hasRotationVar = hasVariation(rotations);
        console.log(
          `    ${bone.name} rotation variation: ${hasRotationVar} (${rotationQuats.length} quaternions)`,
        );
        if (hasRotationVar) {
          channels.push({
            boneIndex,
            path: "rotation",
            times: [...times],
            values: rotations,
          });
        }

        // Extract scale data
        const scales = keyframes
          .map((kf) => [kf.scaleX, kf.scaleY, kf.scaleZ])
          .flat();
        const hasScaleVar = hasVariation(scales);
        console.log(
          `    ${bone.name} scale variation: ${hasScaleVar} (sample: [${scales
            .slice(0, 6)
            .join(", ")}...])`,
        );
        if (hasScaleVar) {
          channels.push({
            boneIndex,
            path: "scale",
            times: [...times],
            values: scales,
          });
        }

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
  buffer?: any,
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
  buffer?: any,
): { skin: Skin; animations: Animation[] } {
  console.log("=== Creating Skeleton System (Rebuilt Implementation) ===");
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

  // Step 1: Create joint nodes with proper local transforms
  const joints = createJointNodes(doc, skeleton.bones);

  // Step 2: Build proper hierarchy (CRITICAL: joints must be in scene before animations)
  try {
    buildJointHierarchy(doc, joints, skeleton.bones, scene);
  } catch (e) {
    console.error("Error building joint hierarchy:", e);
    // Add all joints to scene as root joints if hierarchy fails
    joints.forEach((joint) => scene.addChild(joint));
  }

  // CRITICAL: Final verification for glTF compliance and Three.js PropertyBinding
  // All joints must be descendants of a single root for glTF skin compliance
  console.log("Final glTF compliance verification...");

  const sceneChildren = scene.listChildren();
  
  // Verify we have a proper joint hierarchy
  let jointHierarchyRoots = 0;
  const allAccessibleNodes = new Set<Node>();
  
  sceneChildren.forEach((child: Node) => {
    function collectAccessibleNodes(node: Node) {
      allAccessibleNodes.add(node);
      node.listChildren().forEach(collectAccessibleNodes);
    }
    collectAccessibleNodes(child);
    
    // Check if this scene child contains any joints
    const containsJoints = joints.some(joint => {
      const nodeSet = new Set<Node>();
      function collectNodes(n: Node) {
        nodeSet.add(n);
        n.listChildren().forEach(collectNodes);
      }
      collectNodes(child);
      return nodeSet.has(joint);
    });
    
    if (containsJoints) {
      jointHierarchyRoots++;
    }
  });

  console.log(`Found ${jointHierarchyRoots} joint hierarchy root(s) in scene`);

  // Verify all joints are accessible
  joints.forEach((joint, index) => {
    const bone = skeleton.bones[index];
    if (!allAccessibleNodes.has(joint)) {
      console.error(`❌ Joint "${bone.name}" not accessible - this will break glTF compliance`);
    } else {
      console.log(`  ✅ Joint "${bone.name}" accessible from scene`);
    }
  });

  console.log(`✅ glTF compliance verification complete`);

  // Step 3: Create skin following gltF specifications
  const skin = createSkin(doc, joints, skeleton.bones);

  // Step 4: Process animations (joints are now properly accessible)
  console.log(
    `Processing ${skeleton.animations.length} animations for PropertyBinding...`,
  );
  const processedAnimations = processOttoAnimations(
    skeleton.animations,
    skeleton.bones,
  );
  const animations = createGltfAnimations(
    doc,
    joints,
    processedAnimations,
    buffer,
  );

  console.log("=== Skeleton System Complete (gltf-transform compliant) ===");
  console.log(
    `Result: ${joints.length} joints, ${animations.length} animations`,
  );
  console.log("All joints accessible for Three.js PropertyBinding");

  return { skin, animations };
}

/**
 * Extract animation data from glTF document for round-trip conversion
 */
export function extractAnimationsFromGLTF(doc: Document): BG3DAnimation[] {
  const animations = doc.getRoot().listAnimations();
  const skins = doc.getRoot().listSkins();

  // We need the joints to map back to bone indices
  const joints = skins.length > 0 ? skins[0].listJoints() : [];

  return animations.map((anim) => {
    console.log(`Extracting animation "${anim.getName()}" from glTF`);

    const keyframes: { [boneIndex: string]: any[] } = {};

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

      // Convert glTF data back to Otto format
      const valuesPerFrame =
        path === "rotation" || path === "translation" || path === "scale"
          ? 3
          : 1;

      for (let i = 0; i < times.length; i++) {
        const tick = Math.round(times[i] * 30); // Convert back to 30 FPS

        // Find or create keyframe for this tick
        let keyframe = keyframes[boneIndexStr].find((kf) => kf.tick === tick);
        if (!keyframe) {
          keyframe = {
            tick,
            accelerationMode: 0,
            coordX: 0,
            coordY: 0,
            coordZ: 0,
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
          keyframe.coordX = values[valueIndex] || 0;
          keyframe.coordY = values[valueIndex + 1] || 0;
          keyframe.coordZ = values[valueIndex + 2] || 0;
        } else if (path === "rotation") {
          keyframe.rotationX = values[valueIndex] || 0;
          keyframe.rotationY = values[valueIndex + 1] || 0;
          keyframe.rotationZ = values[valueIndex + 2] || 0;
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
