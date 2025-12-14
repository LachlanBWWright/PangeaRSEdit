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
 * Convert BG3D bones to glTF joints (part of bg3dSkeletonToGltf)
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

  // Create joints for each bone
  parsedSkeleton.bones.forEach((bone, boneIndex) => {
    const joint = doc.createNode();
    joint.setName(bone.name || `bone_${boneIndex}`);

    // Convert Otto right-handed coordinates to glTF left-handed
    // Otto: +X right, +Y up, +Z forward
    // glTF: +X right, +Y up, +Z backward (left-handed)
    const gltfX = bone.coordX;
    const gltfY = bone.coordY;
    const gltfZ = -bone.coordZ; // Flip Z

    joint.setTranslation([gltfX, gltfY, gltfZ]);
    joints.push(joint);
    boneToJointMap.set(boneIndex, joint);
  });

  // Set up parent-child relationships
  parsedSkeleton.bones.forEach((bone, boneIndex) => {
    const joint = boneToJointMap.get(boneIndex)!;
    if (bone.parentBone >= 0 && bone.parentBone < joints.length) {
      const parentJoint = boneToJointMap.get(bone.parentBone)!;
      parentJoint.addChild(joint);
    }
  });

  // Create skeleton root (armature)
  const skeletonRoot = doc.createNode();
  skeletonRoot.setName("Armature");

  // Add root bones (bones with no parent) to skeleton root
  parsedSkeleton.bones.forEach((bone, boneIndex) => {
    if (bone.parentBone < 0) {
      const joint = boneToJointMap.get(boneIndex)!;
      skeletonRoot.addChild(joint);
    }
  });

  return { joints, skeletonRoot };
}

/**
 * Extract bones from glTF joints (part of gltfSkeletonToBg3d)
 */
export function gltfJointsToBg3dBones(joints: Node[], skin: Skin): BG3DBone[] {
  console.log(`Extracting ${joints.length} bones from glTF joints`);

  // First pass: create bones with basic data
  const bones: BG3DBone[] = joints.map((joint, index) => {
    // Extract translation from joint transform matrix
    const matrix = joint.getMatrix();
    let coordX = 0,
      coordY = 0,
      coordZ = 0;

    if (matrix && matrix.length >= 12) {
      // Matrix is in column-major order, translation is in elements 12, 13, 14
      coordX = matrix[12] || 0;
      coordY = matrix[13] || 0;
      coordZ = matrix[14] || 0;

      // Convert back from left-handed glTF to right-handed Otto (flip Z)
      coordZ = -coordZ;
    } else {
      // Fallback to translation if matrix not available
      const translation = joint.getTranslation() || [0, 0, 0];
      coordX = translation[0];
      coordY = translation[1];
      coordZ = -translation[2]; // Convert back from left-handed
    }

    // Infer parentBone from node hierarchy (glTF 2.0 compliant)
    let parentBone = -1;
    // `listParents()` already returns Node instances; no custom constructor extraction needed
    const jointParents = joint.listParents();
    if (jointParents.length > 0) {
      const jointParent = jointParents[0];
      if (jointParent) {
        // Check if parent is the skeleton root (Armature), if so, parentBone = -1
        const skeletonRoot = skin.getSkeleton();
        if (jointParent !== skeletonRoot) {
          // Find the index of the parent in the joints list
          const parentIndex = joints.findIndex((j) => j === (jointParent as Node));
          if (parentIndex !== -1) {
            parentBone = parentIndex;
          }
        }
      }
    }

    return {
      parentBone,
      name: joint.getName() || `bone_${index}`,
      coordX,
      coordY,
      coordZ,
      numPointsAttachedToBone: 0, // Will be calculated in skinning
      numNormalsAttachedToBone: 0, // Will be calculated in skinning
      pointIndices: [], // Will be populated in skinning
      normalIndices: [], // Will be populated in skinning
    };
  });

  // Calculate absolute world coordinates for Otto (convert from glTF relative transforms)
  // glTF stores relative transforms, but Otto uses absolute world coordinates
  const worldTransforms: Mat4[] = new Array(bones.length);

  bones.forEach((bone, index) => {
    const joint = joints[index];
    if (!joint) return;

    // Get the local transform matrix from the joint
    let localMatrix: Mat4;
    const jointMatrix = joint.getMatrix();
    if (jointMatrix && jointMatrix.length >= 16) {
      // Convert glTF matrix (column-major) to our Mat4
      localMatrix = createMatrix4();
      for (let i = 0; i < 16; i++) {
        localMatrix[i] = jointMatrix[i] ?? 0;
      }
    } else {
      // Build matrix from TRS components - simplified for now
      const translation = joint.getTranslation() || [0, 0, 0];
      localMatrix = createMatrix4();
      setTranslation(
        localMatrix,
        translation[0],
        translation[1],
        translation[2],
      );
    }

    // Calculate world transform by composing with parent
    if (bone.parentBone >= 0 && bone.parentBone < bones.length) {
      const parentWorld = worldTransforms[bone.parentBone];
      if (parentWorld) {
        worldTransforms[index] = multiply(parentWorld, localMatrix);
      } else {
        worldTransforms[index] = localMatrix;
      }
    } else {
      // Root bone
      worldTransforms[index] = localMatrix;
    }

    // Extract world translation and convert coordinate system
    const worldTranslation = getTranslation(worldTransforms[index]);
    bone.coordX = worldTranslation.x;
    bone.coordY = worldTranslation.y;
    bone.coordZ = -worldTranslation.z; // Convert from left-handed glTF to right-handed Otto
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
  const resource = originalSkeletonResource as Record<string, unknown>;
  if (resource.Bone) {
    Object.values(resource.Bone).forEach((boneData) => {
      const boneDataObj = boneData as Record<string, unknown>;
      if (boneDataObj.obj) {
        bones.push({
          parentBone: boneData.obj.parentBone,
          name: boneData.obj.name || "",
          coordX: boneData.obj.coordX || 0,
          coordY: boneData.obj.coordY || 0,
          coordZ: boneData.obj.coordZ || 0,
          numPointsAttachedToBone: boneData.obj.numPointsAttachedToBone || 0,
          numNormalsAttachedToBone: boneData.obj.numNormalsAttachedToBone || 0,
          pointIndices: [], // Initialize as empty array
          normalIndices: [], // Initialize as empty array
        });
      }
    });
  }

  // Populate point and normal indices
  if (resource.BonP) {
    Object.values(resource.BonP).forEach((bonPData: unknown, boneIndex) => {
      const bonPObj = bonPData as Record<string, unknown>;
      if (bonPObj.obj && bones[boneIndex] !== undefined) {
        const bone = bones[boneIndex];
        bone.pointIndices = (bonPObj.obj as unknown[]).map(
          (p) => (p as Record<string, unknown>).pointIndex as number,
        );
        bone.numPointsAttachedToBone = bone.pointIndices!.length;
      }
    });
  }
  if (resource.BonN) {
    Object.values(resource.BonN).forEach((bonNData: unknown, boneIndex) => {
      const bonNObj = bonNData as Record<string, unknown>;
      if (bonNObj.obj && bones[boneIndex] !== undefined) {
        const bone = bones[boneIndex];
        bone.normalIndices = (bonNObj.obj as unknown[]).map(
          (n) => (n as Record<string, unknown>).normal as number,
        );
        bone.numNormalsAttachedToBone = bone.normalIndices!.length;
      }
    });
  }

  return bones;
}
