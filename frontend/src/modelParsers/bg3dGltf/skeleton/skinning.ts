/**
 * Skinning/vertex binding conversion functions for BG3D ↔ glTF (both directions)
 */

import { BG3DBone } from "../../parseBG3D";
import { Document, Skin, Node, Buffer } from "@gltf-transform/core";

// Minimal shape for original skeleton binary data we read in this module
interface SkeletonResourceLike {
  BonP?: Record<string, { obj?: { pointIndex: number }[] }>;
  BonN?: Record<string, { obj?: { normal: number }[] }>;
}

/**
 * Create glTF skinning data from BG3D bone influences (part of bg3dSkeletonToGltf)
 */
export function bg3dSkinningToGltf(
  parsedSkeleton: { bones: BG3DBone[] },
  joints: Node[],
  doc: Document,
  baseBuffer: Buffer,
): Skin | null {
  console.log("Creating glTF skinning data from BG3D bone influences");

  if (!parsedSkeleton.bones || parsedSkeleton.bones.length === 0) {
    console.log("No bones found, skipping skin creation");
    return null;
  }

  // Create inverse bind matrices for the skin
  const numJoints = joints.length;
  const inverseBindMatrices = new Float32Array(numJoints * 16);

  // For now, use identity matrices for inverse bind matrices
  // In a full implementation, these would be calculated from the bone transforms
  for (let i = 0; i < numJoints; i++) {
    const offset = i * 16;
    inverseBindMatrices[offset + 0] = 1; // Identity matrix
    inverseBindMatrices[offset + 5] = 1;
    inverseBindMatrices[offset + 10] = 1;
    inverseBindMatrices[offset + 15] = 1;
  }

  const inverseBindMatricesAccessor = doc
    .createAccessor()
    .setType("MAT4")
    .setArray(inverseBindMatrices)
    .setBuffer(baseBuffer);

  // Create the skin
  const skin = doc.createSkin();
  // Use first joint as skeleton root (parent lookup omitted for type-safety)
  skin.setSkeleton(joints[0]);
  skin.setInverseBindMatrices(inverseBindMatricesAccessor);

  // Add all joints to the skin
  joints.forEach((joint) => skin.addJoint(joint));

  console.log(`Created skin with ${joints.length} joints`);
  return skin;
}

/**
 * Extract skinning data from glTF and populate bone vertex influences (part of gltfSkeletonToBg3d)
 */
export function gltfSkinningToBg3d(bones: BG3DBone[], doc: Document): void {
  console.log(
    "Extracting skinning data from glTF to populate BG3D bone influences",
  );

  // Collect all vertices influenced by each bone from JOINTS_0 and WEIGHTS_0 attributes
  const bonePointSets: Set<number>[] = bones.map(() => new Set<number>());
  const boneNormalSets: Set<number>[] = bones.map(() => new Set<number>());

  let globalVertexOffset = 0;
  doc
    .getRoot()
    .listMeshes()
    .forEach((mesh) => {
      mesh.listPrimitives().forEach((prim) => {
        const jointsAcc = prim.getAttribute("JOINTS_0");
        const weightsAcc = prim.getAttribute("WEIGHTS_0");
        const posAcc = prim.getAttribute("POSITION");

        if (jointsAcc && weightsAcc && posAcc) {
          const jointsArray = jointsAcc.getArray() as Uint16Array;
          const weightsArray = weightsAcc.getArray() as Float32Array;
          const numVertices = posAcc.getCount();

          for (let vi = 0; vi < numVertices; vi++) {
            const globalVertexIndex = globalVertexOffset + vi;

            // Each vertex has up to 4 joint influences
            for (let ji = 0; ji < 4; ji++) {
              const jointIndex = jointsArray[vi * 4 + ji];
              const weight = weightsArray[vi * 4 + ji];

              // Only consider influences with non-zero weight
              if (weight > 0 && jointIndex < bones.length) {
                bonePointSets[jointIndex].add(globalVertexIndex);
                // For normals, use same indices as points
                boneNormalSets[jointIndex].add(globalVertexIndex);
              }
            }
          }

          globalVertexOffset += numVertices;
        }
      });
    });

  // Update bones with calculated vertex influence data
  bones.forEach((bone, index) => {
    bone.pointIndices = Array.from(bonePointSets[index]).sort((a, b) => a - b);
    bone.normalIndices = Array.from(boneNormalSets[index]).sort(
      (a, b) => a - b,
    );
    bone.numPointsAttachedToBone = bone.pointIndices.length;
    bone.numNormalsAttachedToBone = bone.normalIndices.length;
  });

  console.log(`Populated vertex influences for ${bones.length} bones`);
}

/**
 * Extract skinning data from original skeleton binary (part of originalSkeletonBinaryToBg3d)
 */
export function originalSkeletonBinarySkinningToBg3d(
  bones: BG3DBone[],
  originalSkeletonResource: SkeletonResourceLike,
): void {
  console.log("Extracting skinning data from original skeleton binary");

  // Populate point and normal indices from original binary
  if (originalSkeletonResource.BonP) {
    const bonPArray = Object.values(originalSkeletonResource.BonP) as {
      obj?: { pointIndex: number }[];
    }[];
    bonPArray.forEach((bonPData, boneIndex) => {
      if (bonPData.obj && bones[boneIndex] !== undefined) {
        const bone = bones[boneIndex];
        bone.pointIndices = bonPData.obj.map((p) => p.pointIndex);
        bone.numPointsAttachedToBone = bone.pointIndices!.length;
      }
    });
  }
  if (originalSkeletonResource.BonN) {
    const bonNArray = Object.values(originalSkeletonResource.BonN) as {
      obj?: { normal: number }[];
    }[];
    bonNArray.forEach((bonNData, boneIndex) => {
      if (bonNData.obj && bones[boneIndex] !== undefined) {
        const bone = bones[boneIndex];
        bone.normalIndices = bonNData.obj.map((n) => n.normal);
        bone.numNormalsAttachedToBone = bone.normalIndices!.length;
      }
    });
  }

  console.log(
    `Extracted skinning data for ${bones.length} bones from original binary`,
  );
}
