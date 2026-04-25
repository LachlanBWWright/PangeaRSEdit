/**
 * New Skeleton System Implementation
 *
 * This completely rebuilt system addresses the fundamental issues identified:
 * 1. Proper bone hierarchy construction (parent-child relationships)
 * 2. Correct coordinate space conversion (Otto absolute → glTF local)
 * 3. Fixed animation targeting (joints in scene before animations)
 * 4. Native glTF animation format with BG3D animation events preserved in extras
 */

import { Document, Node, Skin, Animation, Buffer } from "@gltf-transform/core";
import { Matrix4 } from "./matrix4Utils";
import {
  BG3DSkeleton,
  BG3DBone,
  BG3DAnimation,
  BG3DKeyframe,
  BG3DAnimationEvent,
} from "./parseBG3D";
import { ok, err } from "neverthrow";
import { Result } from "neverthrow";
import {
  eulerToQuaternion,
  quaternionToEuler,
  decomposeMatrix,
  calculateLocalTransform,
} from "./rotationUtils";
import { plainObjectSchema, getNumberField } from "@/schemas/common";

const ANIMATION_EXTRA_NAMESPACE = "pangears";

function isRecord(value: unknown): value is Record<string, unknown> {
  return plainObjectSchema.safeParse(value).success;
}

function parseAnimationEventsFromExtras(anim: Animation): BG3DAnimationEvent[] {
  const extras = anim.getExtras();
  const namespaced = isRecord(extras)
    ? isRecord(extras[ANIMATION_EXTRA_NAMESPACE])
      ? extras[ANIMATION_EXTRA_NAMESPACE]
      : undefined
    : undefined;
  const candidate =
    namespaced && Array.isArray(namespaced.events)
      ? namespaced
      : isRecord(extras) && Array.isArray(extras.events)
        ? extras
        : undefined;

  if (!candidate || !Array.isArray(candidate.events)) {
    return [];
  }

  return candidate.events
    .map((event) => {
      if (!isRecord(event)) {
        return null;
      }
      return {
        time: getNumberField(event, "time", 0),
        type: getNumberField(event, "type", 0),
        value: getNumberField(event, "value", 0),
      };
    })
    .filter((event): event is BG3DAnimationEvent => event !== null);
}

/**
 * Processed animation data ready for glTF conversion
 */
interface ProcessedAnimation {
  name: string;
  duration: number;
  channels: AnimationChannelData[];
  events: BG3DAnimationEvent[];
}

interface AnimationChannelData {
  boneIndex: number;
  path: "translation" | "rotation" | "scale";
  times: number[];
  values: number[];
}

/**
 * Create joint nodes (bones) for the skeleton with proper local transforms.
 *
 * IMPORTANT: Bone names are preserved exactly as they appear in the Otto Matic files,
 * including spaces (e.g., "Left Hand"). This ensures perfect roundtrip accuracy.
 * Modern Three.js versions handle spaces in bone names correctly.
 *
 * Note: Otto stores absolute world coordinates for each bone. glTF requires relative
 * transforms, so we calculate local transforms relative to parent bones.
 * Both Otto and glTF use right-handed coordinate systems, so no coordinate flip is needed.
 * The mesh vertices are kept in Otto's coordinate space, so the skeleton must match.
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
 * so long as they're in the scene hierarchy.
 */
function buildJointHierarchy(
  doc: Document,
  joints: Node[],
  bones: BG3DBone[],
): Result<Node, Error> {
  if (joints.length !== bones.length) {
    return err(
      new Error(`Mismatch: ${joints.length} joints vs ${bones.length} bones`),
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

    if (!bone || !joint) {
      console.warn(`Bone or joint at index ${boneIndex} not found`);
      return;
    }

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
      .map((i) => bones[i]?.name ?? "undefined")
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
      const joint = joints[index];
      if (!addedBones.has(index) && joint) {
        console.warn(`Adding orphaned bone ${bone.name} directly to Armature`);
        skeletonRoot.addChild(joint);
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

  return ok(skeletonRoot);
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
      if (parentWorld) {
        worldTransforms[index] = parentWorld.multiply(localTransform);
      } else {
        worldTransforms[index] = localTransform;
      }
    } else {
      // Root bone
      worldTransforms[index] = localTransform;
    }

    // Calculate inverse bind matrix (inverse of world transform)
    const currentWorld = worldTransforms[index];
    const invBindMatrix = currentWorld
      ? currentWorld.invert()
      : new Matrix4().identity();

    // Store in column-major order (glTF requirement)
    const offset = index * 16;
    for (let i = 0; i < 16; i++) {
      matrices[offset + i] = invBindMatrix.data[i] ?? 0;
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
  const buffer = doc.getRoot().listBuffers()[0] ?? null;
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
 * TODO: This function is not currently used but may be useful for optimization
 */
// function _hasVariation(values: number[], threshold = 0.001): boolean {
//   if (values.length < 2) return false;
//   const first = values[0];
//   if (first === undefined) return false;
//   return values.some((v) => Math.abs(v - first) > threshold);
// }

/**
 * Process skeleton animation data into glTF-compatible format
 * Converts absolute keyframe coordinates to relative transforms
 */
function processSkeletonAnimations(
  bg3dAnimations: BG3DAnimation[],
  bones: BG3DBone[],
): ProcessedAnimation[] {
  console.log("Processing skeleton animations...");

  return bg3dAnimations.map((anim) => {
    const channels: AnimationChannelData[] = [];
    let maxTime = 0;
    const events = anim.events.map((event) => ({
      time: event.time,
      type: event.type,
      value: event.value,
    }));

    console.log(`  Processing animation "${anim.name}"`);

    // Process each bone's keyframes for this animation
    Object.entries(anim.keyframes).forEach(([boneIndexStr, keyframes]) => {
      const boneIndex = parseInt(boneIndexStr);

      if (boneIndex >= 0 && boneIndex < bones.length && keyframes.length > 0) {
        const bone = bones[boneIndex];
        if (!bone) return;

        // Convert timing from Otto's 30 FPS system to seconds
        const times = keyframes.map((kf) => kf.tick / 30.0);
        maxTime = Math.max(maxTime, ...times);

        // Otto keyframe coord is LOCAL (relative to parent), which matches glTF joint translation
        // glTF animation values REPLACE the node's TRS, so we use kf.coord directly
        // No coordinate flip needed - mesh vertices are in Otto space, so skeleton should match
        const translations = keyframes
          .map((kf) => {
            return [kf.coordX, kf.coordY, kf.coordZ];
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
        // Otto uses EXTRINSIC XYZ rotation order (R = Rz * Ry * Rx)
        // No coordinate flip needed - keeping skeleton in Otto coordinate space to match mesh
        const rotationQuats = keyframes.map((kf) => {
          // Convert Otto Euler angles to quaternion (extrinsic XYZ = intrinsic ZYX)
          const [qx, qy, qz, qw] = eulerToQuaternion(
            kf.rotationX,
            kf.rotationY,
            kf.rotationZ,
          );
          return [qx, qy, qz, qw];
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

        const lastTime = times[times.length - 1];
        console.log(
          `    Bone ${bone.name}: ${keyframes.length} keyframes, ${(
            lastTime ?? 0
          ).toFixed(2)}s`,
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
      events,
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

  console.log(`Creating ${processedAnimations.length} animations`);

  return processedAnimations.map((anim) => {
    const gltfAnimation = doc.createAnimation(anim.name);

    console.log(
      `  Creating animation "${anim.name}" with ${anim.channels.length} channels`,
    );

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

      const timeAccessor = doc
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

      const valueAccessor = doc
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

      // Create sampler with robust error handling
      const sampler = doc
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
      // Create channel with robust error handling
      const channel = doc
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

      gltfAnimation.addSampler(sampler).addChannel(channel);
    });

    gltfAnimation.setExtras({
      [ANIMATION_EXTRA_NAMESPACE]: {
        numAnimEvents: anim.events.length,
        events: anim.events.map((event) => ({
          time: event.time,
          type: event.type,
          value: event.value,
        })),
      },
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
): Result<{ skin: Skin; animations: Animation[] }, Error> {
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
      return err(new Error("Failed to create default scene in glTF document"));
    }
  } else {
    console.log(`Using existing default scene: "${scene.getName()}"`);
  }

  // Step 1: Create joint nodes with absolute transforms (Otto uses absolute coordinates)
  const joints = createJointNodes(doc, skeleton.bones);

  // Step 2: Build hierarchy (returns the skeleton root node)
  const skeletonRootResult = buildJointHierarchy(doc, joints, skeleton.bones);
  if (skeletonRootResult.isErr()) {
    console.error("Error building joint hierarchy:", skeletonRootResult.error);
    return err(skeletonRootResult.error);
  }
  const skeletonRoot = skeletonRootResult.value;

  // Step 3: Create skin with proper skeleton root
  const skin = createSkin(doc, joints, skeleton.bones, skeletonRoot);

  // Add the skeleton parent to the scene (glTF 2.0 requirement)
  const skeleton_root = skin.getSkeleton();
  if (skeleton_root) {
    scene.addChild(skeleton_root);
  }

  // Step 4: Process animations
  console.log(`Processing ${skeleton.animations.length} animations...`);
  const processedAnimations = processSkeletonAnimations(
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

  return ok({ skin, animations });
}

/**
 * Convert quaternion to Euler angles (EXTRINSIC XYZ rotation order = Rz * Ry * Rx)
 * Uses quaternion -> rotation matrix -> Euler extraction.
 * This is numerically stable compared to direct conversion.
 * Returns angles in radians.
 *
 * For extrinsic XYZ (R = Rz * Ry * Rx), the matrix is:
 *   R = [cy*cz,             sx*sy*cz-cx*sz,    cx*sy*cz+sx*sz  ]
 *       [cy*sz,             sx*sy*sz+cx*cz,    cx*sy*sz-sx*cz  ]
 *       [-sy,               sx*cy,             cx*cy           ]
 *
 * Extraction:
 *   y = asin(-R20)
 *   x = atan2(R21, R22)
 *   z = atan2(R10, R00)
 */

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
  const firstSkin = skins[0];
  const joints = firstSkin ? firstSkin.listJoints() : [];

  return animations.map((anim) => {
    console.log(`Extracting animation "${anim.getName()}" from glTF`);

    const keyframes: Record<string, BG3DKeyframe[]> = {};

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

      const inputArray = inputAccessor.getArray();
      const outputArray = outputAccessor.getArray();

      if (!inputArray || !outputArray) return;

      const times = Array.from(inputArray);
      const values = Array.from(outputArray);

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
        const time = times[i];
        if (time === undefined) continue;
        const tick = Math.round(time * 30); // Convert back to 30 FPS

        // Find or create keyframe for this tick
        const boneKeyframes = keyframes[boneIndexStr];
        if (!boneKeyframes) continue;
        let keyframe = boneKeyframes.find((kf) => kf.tick === tick);
        if (!keyframe) {
          // Initialize with bone's LOCAL rest position (computed from absolute coords)
          // For root bone: localPos = bone.coord
          // For child bone: localPos = bone.coord - parent.coord
          let localX = bone?.coordX ?? 0;
          let localY = bone?.coordY ?? 0;
          let localZ = bone?.coordZ ?? 0;
          if (
            bone &&
            bones &&
            bone.parentBone >= 0 &&
            bone.parentBone < bones.length
          ) {
            const parent = bones[bone.parentBone];
            if (parent) {
              localX = bone.coordX - parent.coordX;
              localY = bone.coordY - parent.coordY;
              localZ = bone.coordZ - parent.coordZ;
            }
          }
          keyframe = {
            tick,
            accelerationMode: 1,
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
          // No coordinate flip needed - both systems are compatible
          const glTFX = values[valueIndex] || 0;
          const glTFY = values[valueIndex + 1] || 0;
          const glTFZ = values[valueIndex + 2] || 0;

          keyframe.coordX = glTFX;
          keyframe.coordY = glTFY;
          keyframe.coordZ = glTFZ;
        } else if (path === "rotation") {
          // Convert quaternion (x, y, z, w) back to Euler angles (extrinsic XYZ order)
          // This matches Otto's OGLMatrix4x4_SetRotate_XYZ which uses R = Rz * Ry * Rx
          const qx = values[valueIndex] || 0;
          const qy = values[valueIndex + 1] || 0;
          const qz = values[valueIndex + 2] || 0;
          const qw = values[valueIndex + 3] || 1;
          const [rx, ry, rz] = quaternionToEuler(qx, qy, qz, qw);
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

    const events = parseAnimationEventsFromExtras(anim);

    return {
      name: anim.getName() || "Unknown",
      numAnimEvents: events.length,
      events,
      keyframes,
    };
  });
}
