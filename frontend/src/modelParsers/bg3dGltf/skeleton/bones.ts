/**
 * Bone hierarchy conversion functions for BG3D ↔ glTF (both directions)
 */

import { BG3DSkeleton, BG3DBone } from "../../parseBG3D";
import { Document, Skin } from "@gltf-transform/core";
import type { Node } from "@gltf-transform/core";
import {
  Mat4,
  createMatrix4,
  setTranslation,
  getTranslation,
  multiply,
} from "./utils.ts";

/**
 * Type guard helper functions for safe extraction from unknown values
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function getNumber(value: unknown, defaultValue = 0): number {
  return typeof value === 'number' ? value : defaultValue;
}

function getString(value: unknown, defaultValue = ''): string {
  return typeof value === 'string' ? value : defaultValue;
}

/**
 * Convert BG3D bones to glTF joints (part of bg3dSkeletonToGltf)
 *
 * Otto stores ABSOLUTE world positions for each bone.
 * glTF joints use LOCAL transforms relative to their parent node.
 * Both Otto and glTF use right-handed Y-up coordinate systems,
 * so no coordinate flip is needed.
 */
export function bg3dBonesToGltf(
  parsedSkeleton: BG3DSkeleton,
  doc: Document,
): { joints: Node[]; skeletonRoot: Node } {
  console.log(
    `Converting ${parsedSkeleton.bones.length} BG3D bones to glTF joints`,
  );

  const joints: Node[] = [];
  const boneToJointMap = new Map<number, Node>();

  // Create joints for each bone with LOCAL (parent-relative) translations
  parsedSkeleton.bones.forEach((bone, boneIndex) => {
    const joint = doc.createNode();
    joint.setName(bone.name || `bone_${boneIndex}`);

    // Compute local translation relative to parent bone
    let localX = bone.coordX;
    let localY = bone.coordY;
    let localZ = bone.coordZ;

    if (bone.parentBone >= 0 && bone.parentBone < parsedSkeleton.bones.length) {
      const parent = parsedSkeleton.bones[bone.parentBone];
      if (parent) {
        localX = bone.coordX - parent.coordX;
        localY = bone.coordY - parent.coordY;
        localZ = bone.coordZ - parent.coordZ;
      }
    }

    joint.setTranslation([localX, localY, localZ]);
    joints.push(joint);
    boneToJointMap.set(boneIndex, joint);
  });

  // Set up parent-child relationships
  parsedSkeleton.bones.forEach((bone, boneIndex) => {
    const joint = boneToJointMap.get(boneIndex);
    if (!joint) return;
    if (bone.parentBone >= 0 && bone.parentBone < joints.length) {
      const parentJoint = boneToJointMap.get(bone.parentBone);
      if (parentJoint) {
        parentJoint.addChild(joint);
      }
    }
  });

  // Create skeleton root (armature)
  const skeletonRoot = doc.createNode();
  skeletonRoot.setName("Armature");

  // Add root bones (bones with no parent) to skeleton root
  parsedSkeleton.bones.forEach((bone, boneIndex) => {
    if (bone.parentBone < 0) {
      const joint = boneToJointMap.get(boneIndex);
      if (joint) {
        skeletonRoot.addChild(joint);
      }
    }
  });

  return { joints, skeletonRoot };
}

/**
 * Extract bones from glTF joints (part of gltfSkeletonToBg3d)
 *
 * Recovers absolute world positions from glTF local transforms.
 * Both coordinate systems are right-handed Y-up, no flip needed.
 */
export function gltfJointsToBg3dBones(joints: Node[], skin: Skin): BG3DBone[] {
  console.log(`Extracting ${joints.length} bones from glTF joints`);

  // First pass: create bones with parent info and local translations
  const bones: BG3DBone[] = joints.map((joint, index) => {
    // Infer parentBone from node hierarchy (glTF 2.0 compliant)
    let parentBone = -1;
    const jointParent = joint.getParentNode();
    if (jointParent) {
      const skeletonRoot = skin.getSkeleton();
      if (jointParent !== skeletonRoot) {
        const parentIndex = joints.findIndex((j) => j === jointParent);
        if (parentIndex !== -1) {
          parentBone = parentIndex;
        }
      }
    }

    return {
      parentBone,
      name: joint.getName() || `bone_${index}`,
      coordX: 0,
      coordY: 0,
      coordZ: 0,
      numPointsAttachedToBone: 0,
      numNormalsAttachedToBone: 0,
      pointIndices: [],
      normalIndices: [],
    };
  });

  // Second pass: compute absolute world positions from hierarchical local transforms
  const worldTransforms: Mat4[] = new Array(bones.length);

  bones.forEach((bone, index) => {
    const joint = joints[index];
    if (!joint) return;

    // Build local transform matrix from joint TRS
    let localMatrix: Mat4;
    const jointMatrix = joint.getMatrix();
    if (jointMatrix && jointMatrix.length >= 16) {
      localMatrix = createMatrix4();
      for (let i = 0; i < 16; i++) {
        localMatrix[i] = jointMatrix[i] ?? 0;
      }
    } else {
      const translation = joint.getTranslation() || [0, 0, 0];
      localMatrix = createMatrix4();
      setTranslation(
        localMatrix,
        translation[0],
        translation[1],
        translation[2],
      );
    }

    // Compose with parent to get world transform
    if (bone.parentBone >= 0 && bone.parentBone < bones.length) {
      const parentWorld = worldTransforms[bone.parentBone];
      if (parentWorld) {
        worldTransforms[index] = multiply(parentWorld, localMatrix);
      } else {
        worldTransforms[index] = localMatrix;
      }
    } else {
      worldTransforms[index] = localMatrix;
    }

    // Extract absolute world position (no coordinate flip needed)
    const worldTranslation = getTranslation(worldTransforms[index]);
    bone.coordX = worldTranslation.x;
    bone.coordY = worldTranslation.y;
    bone.coordZ = worldTranslation.z;
  });

  return bones;
}

/**
 * Extract bones from original skeleton binary (part of originalSkeletonBinaryToBg3d)
 */
export function originalSkeletonBinaryToBg3dBones(
  originalSkeletonResource: unknown,
): BG3DBone[] {
  console.log("Extracting bones from original skeleton binary");

  const bones: BG3DBone[] = [];
  if (!isRecord(originalSkeletonResource)) return bones;
  
  const resource = originalSkeletonResource;
  if (resource.Bone && isRecord(resource.Bone)) {
    Object.values(resource.Bone).forEach((boneData) => {
      if (isRecord(boneData) && isRecord(boneData.obj)) {
        const obj = boneData.obj;
        bones.push({
          parentBone: getNumber(obj.parentBone, -1),
          name: getString(obj.name),
          coordX: getNumber(obj.coordX),
          coordY: getNumber(obj.coordY),
          coordZ: getNumber(obj.coordZ),
          numPointsAttachedToBone: getNumber(obj.numPointsAttachedToBone),
          numNormalsAttachedToBone: getNumber(obj.numNormalsAttachedToBone),
          pointIndices: [], // Initialize as empty array
          normalIndices: [], // Initialize as empty array
        });
      }
    });
  }

  // Populate point and normal indices
  if (resource.BonP && isRecord(resource.BonP)) {
    Object.values(resource.BonP).forEach((bonPData: unknown, boneIndex) => {
      if (isRecord(bonPData) && isArray(bonPData.obj) && bones[boneIndex] !== undefined) {
        const bone = bones[boneIndex];
        bone.pointIndices = bonPData.obj.map(
          (p) => getNumber(isRecord(p) ? p.pointIndex : undefined),
        );
        if (bone.pointIndices) {
          bone.numPointsAttachedToBone = bone.pointIndices.length;
        }
      }
    });
  }
  if (resource.BonN && isRecord(resource.BonN)) {
    Object.values(resource.BonN).forEach((bonNData: unknown, boneIndex) => {
      if (isRecord(bonNData) && isArray(bonNData.obj) && bones[boneIndex] !== undefined) {
        const bone = bones[boneIndex];
        bone.normalIndices = bonNData.obj.map(
          (n) => getNumber(isRecord(n) ? n.normal : undefined),
        );
        if (bone.normalIndices) {
          bone.numNormalsAttachedToBone = bone.normalIndices.length;
        }
      }
    });
  }

  return bones;
}
