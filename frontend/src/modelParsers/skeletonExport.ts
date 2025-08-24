// skeletonExport.ts
// Convert BG3D skeleton data back to skeleton resource format

import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";
import type { BG3DSkeleton } from "./parseBG3D";

/**
 * Convert BG3D skeleton data to SkeletonResource format
 * @param skeleton BG3D skeleton data
 * @returns SkeletonResource object
 */
export function bg3dSkeletonToSkeletonResource(skeleton: BG3DSkeleton): SkeletonResource {
  // Create header
  const header = {
    version: skeleton.version,
    numAnims: skeleton.numAnims,
    numJoints: skeleton.numJoints,
    num3DMFLimbs: skeleton.num3DMFLimbs,
  };

  // Convert bones
  const bones: { [key: string]: any } = {};
  skeleton.bones.forEach((bone, index) => {
    bones[index.toString()] = {
      name: "Bone",
      order: index + 1,
      obj: {
        parentBone: bone.parentBone,
        name: bone.name,
        coordX: bone.coordX,
        coordY: bone.coordY,
        coordZ: bone.coordZ,
        numPointsAttachedToBone: bone.numPointsAttachedToBone,
        numNormalsAttachedToBone: bone.numNormalsAttachedToBone,
      }
    };
  });

  // Convert bone point attachments (simplified for now)
  const bonP: { [key: string]: any } = {};
  skeleton.bones.forEach((bone, index) => {
    if (bone.pointIndices && bone.pointIndices.length > 0) {
      bonP[index.toString()] = {
        name: "Bone Points",
        order: skeleton.bones.length + index + 1,
        obj: bone.pointIndices.map(pointIndex => ({ pointIndex }))
      };
    }
  });

  // Convert bone normal attachments (simplified for now)
  const bonN: { [key: string]: any } = {};
  skeleton.bones.forEach((bone, index) => {
    if (bone.normalIndices && bone.normalIndices.length > 0) {
      bonN[index.toString()] = {
        name: "Bone Normals",
        order: skeleton.bones.length * 2 + index + 1,
        obj: bone.normalIndices.map(normal => ({ normal }))
      };
    }
  });

  // Convert animations
  const anHd: { [key: string]: any } = {};
  const evnt: { [key: string]: any } = {};
  const numK: { [key: string]: any } = {};
  const keyF: { [key: string]: any } = {};

  skeleton.animations.forEach((animation, animIndex) => {
    // Animation header
    anHd[animIndex.toString()] = {
      name: "Animation Header",
      order: skeleton.bones.length * 3 + animIndex + 1,
      obj: {
        animName: animation.name,
        numAnimEvents: animation.numAnimEvents,
      }
    };

    // Animation events
    if (animation.events.length > 0) {
      evnt[animIndex.toString()] = {
        name: "Animation Events",
        order: skeleton.bones.length * 3 + skeleton.animations.length + animIndex + 1,
        obj: animation.events.map(event => ({
          time: event.time,
          type: event.type,
          value: event.value,
        }))
      };
    }

    // Process keyframes for each bone
    Object.entries(animation.keyframes).forEach(([boneIndexStr, keyframes], boneKeyIndex) => {
      const keyId = `${animIndex}_${boneIndexStr}`;
      
      // Number of keyframes
      numK[keyId] = {
        name: "Number of Keyframes",
        order: skeleton.bones.length * 3 + skeleton.animations.length * 2 + boneKeyIndex + 1,
        obj: {
          numKeyFrames: keyframes.length,
        }
      };

      // Keyframes
      keyF[keyId] = {
        name: "Keyframes",
        order: skeleton.bones.length * 3 + skeleton.animations.length * 3 + boneKeyIndex + 1,
        obj: keyframes.map(kf => ({
          tick: kf.tick,
          accelerationMode: kf.accelerationMode,
          coordX: kf.coordX,
          coordY: kf.coordY,
          coordZ: kf.coordZ,
          rotationX: kf.rotationX,
          rotationY: kf.rotationY,
          rotationZ: kf.rotationZ,
          scaleX: kf.scaleX,
          scaleY: kf.scaleY,
          scaleZ: kf.scaleZ,
        }))
      };
    });
  });

  return {
    Hedr: {
      "1": {
        name: "Header",
        order: 0,
        obj: header
      }
    },
    Bone: bones,
    BonP: bonP,
    BonN: bonN,
    AnHd: anHd,
    Evnt: evnt,
    NumK: numK,
    KeyF: keyF,
  };
}

/**
 * Convert SkeletonResource to binary format using pyodide worker
 * @param skeletonResource Skeleton resource object
 * @param pyodideWorker Initialized pyodide worker
 * @returns Promise<ArrayBuffer> Binary skeleton file
 */
export async function skeletonResourceToBinary(
  skeletonResource: SkeletonResource,
  pyodideWorker: Worker
): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    pyodideWorker.onmessage = (event) => {
      if (event.data.type === "load_bytes_from_json") {
        resolve(event.data.result);
      } else {
        reject(new Error("Unexpected response from pyodide worker"));
      }
    };

    pyodideWorker.onerror = (error) => {
      reject(error);
    };

    // Use the skeleton specs to convert back to binary
    const message = {
      type: "load_bytes_from_json" as const,
      json_blob: skeletonResource,
      converters: ["skeleton"],
      only_types: [],
      skip_types: [],
      adf: "False" as const,
    };

    pyodideWorker.postMessage(message);
  });
}