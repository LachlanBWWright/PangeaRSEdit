/**
 * Skeleton conversion functions for BG3D ↔ glTF
 * Main entry points that orchestrate the modular conversion functions
 */

import { BG3DSkeleton, BG3DAnimation } from "../parseBG3D";

import { createSkeletonSystem } from "../skeletonSystemNew";

import { Document, Skin } from "@gltf-transform/core";
import { parseSkeletonRsrc } from "../skeletonRsrc/parseSkeletonRsrcTS";
import { isErr, Result, ok } from "../../types/result";

// Import modular functions
import {
  gltfJointsToBg3dBones,
  originalSkeletonBinaryToBg3dBones,
} from "./skeleton/bones";
import {
  gltfSkinningToBg3d,
  originalSkeletonBinarySkinningToBg3d,
} from "./skeleton/skinning";
// TODO: Implement animation conversion functions
// import {
//   gltfAnimationsToBg3d,
//   originalSkeletonBinaryAnimationsToBg3d,
// } from "./skeleton/animations";

/**
 * Convert BG3D skeleton to glTF skeleton system
 */
export function bg3dSkeletonToGltf(
  parsedSkeleton: BG3DSkeleton,
  doc: Document,
): Result<{ skin: Skin | null; animations: unknown[] }, Error> {
  console.log("Creating skeleton system with new implementation...");
  console.log(
    `Input skeleton has ${parsedSkeleton.bones.length} bones, ${parsedSkeleton.animations.length} animations`,
  );

  // The baseBuffer parameter is provided but we don't need it for glTF conversion
  // createSkeletonSystem uses a gltf-transform Buffer from the document, not a raw binary buffer
  // So we pass undefined and let the function use the document's buffers

  const skeletonSystemResult = createSkeletonSystem(
    doc,
    parsedSkeleton,
    undefined,
  );

  if (isErr(skeletonSystemResult)) {
    return skeletonSystemResult;
  }

  const skeletonSystem = skeletonSystemResult.value;

  console.log(
    `Skeleton system created: skin=${!!skeletonSystem.skin}, joints=${
      skeletonSystem.skin?.listJoints().length
    }, animations=${skeletonSystem.animations.length}`,
  );

  return ok(skeletonSystem);
}

/**
 * Convert glTF skeleton back to BG3D skeleton (when original binary not available)
 */
export function gltfSkeletonToBg3d(doc: Document): BG3DSkeleton | undefined {
  console.log(
    `Found ${doc.getRoot().listSkins().length} skins in glTF document`,
  );

  const skins = doc.getRoot().listSkins();
  if (skins.length === 0) {
    return undefined;
  }

  console.log("Extracting skeleton from glTF Skin and Animations...");
  const skin = skins[0];
  if (!skin) {
    return undefined;
  }
  const joints = skin.listJoints();

  console.log(`Skin has ${joints.length} joints`);
  joints.forEach((joint, i) => {
    console.log(`  Joint ${i}: ${joint.getName()}`);
  });

  if (joints.length === 0) {
    return undefined;
  }

  // Extract bones from glTF joints
  const bones = gltfJointsToBg3dBones(joints, skin);

  // Extract skinning data and populate bone influences
  gltfSkinningToBg3d(bones, doc);

  // Extract animations from glTF
  // TODO: Implement animation extraction
  const animations: BG3DAnimation[] = [];

  const skeleton: BG3DSkeleton = {
    version: 272,
    numAnims: animations.length,
    numJoints: bones.length,
    num3DMFLimbs: 0,
    bones,
    animations,
  };

  console.log(
    `Extracted skeleton: ${bones.length} bones, ${animations.length} animations`,
  );

  return skeleton;
}

/**
 * Convert original skeleton binary back to BG3D skeleton
 */
export function originalSkeletonBinaryToBg3d(
  originalSkeletonBinary: ArrayBuffer,
): BG3DSkeleton {
  console.log("Using original skeleton binary for exact roundtrip");
  // Parse the original skeleton binary to get exact skeleton data
  const originalSkeletonResource = parseSkeletonRsrc(originalSkeletonBinary);

  // Extract bones from original binary
  const bones = originalSkeletonBinaryToBg3dBones(originalSkeletonResource);

  // Extract skinning data from original binary
  originalSkeletonBinarySkinningToBg3d(bones, originalSkeletonResource);

  // Extract animations from original binary
  // TODO: Implement animation extraction from binary
  const animations: BG3DAnimation[] = [];

  return {
    version: 272,
    numAnims: animations.length,
    numJoints: bones.length,
    num3DMFLimbs: 0,
    bones,
    animations,
  };
}
