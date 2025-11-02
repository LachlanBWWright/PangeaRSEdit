// skeletonExport.ts
// Convert BG3D skeleton data back to skeleton resource format

import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";
import type { BG3DSkeleton } from "./parseBG3D";

/**
 * Convert BG3D skeleton data to SkeletonResource format
 * @param skeleton BG3D skeleton data
 * @param relP Optional RelP data from original skeleton resource
 * @returns SkeletonResource object
 */
export function bg3dSkeletonToSkeletonResource(
  skeleton: BG3DSkeleton,
  relP?: { [key: string]: any },
  evntData?: { [key: string]: any }
): SkeletonResource {
  // Create header
  const header = {
    version: skeleton.version,
    numAnims: skeleton.numAnims,
    numJoints: skeleton.numJoints,
    num3DMFLimbs: skeleton.num3DMFLimbs,
  };

  // Convert bones - use resource IDs starting from 1000
  const bones: { [key: string]: any } = {};
  skeleton.bones.forEach((bone, index) => {
    const resourceId = 1000 + index;
    bones[resourceId.toString()] = {
      name: bone.name, // Use actual bone name, not generic "Bone"
      order: resourceId,
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

  // Convert bone point attachments - use resource IDs matching bone IDs (1000+)
  // Create resources for ALL bones, even if empty (size 0)
  const bonP: { [key: string]: any } = {};
  skeleton.bones.forEach((bone, index) => {
    const resourceId = 1000 + index;
    bonP[resourceId.toString()] = {
      name: bone.name, // Use bone name, not generic "Bone Points"
      order: resourceId,
      obj: (bone.pointIndices || []).map(pointIndex => ({ pointIndex }))
    };
  });

  // Convert bone normal attachments - use resource IDs matching bone IDs (1000+)
  // Create resources for ALL bones, even if empty (size 0)
  const bonN: { [key: string]: any } = {};
  skeleton.bones.forEach((bone, index) => {
    const resourceId = 1000 + index;
    bonN[resourceId.toString()] = {
      name: bone.name, // Use bone name, not generic "Bone Normals"
      order: resourceId,
      obj: (bone.normalIndices || []).map(normal => ({ normal }))
    };
  });

  // Convert animations
  const anHd: { [key: string]: any } = {};
  // Use provided evntData if available, otherwise create empty
  const evnt: { [key: string]: any } = evntData || {};
  const numK: { [key: string]: any } = {};
  const keyF: { [key: string]: any } = {};

  skeleton.animations.forEach((animation, animIndex) => {
    const animResourceId = 1000 + animIndex;
    
    // Animation header - use resource IDs starting from 1000
    anHd[animResourceId.toString()] = {
      name: animation.name, // Use actual animation name, not generic "Animation Header"
      order: animResourceId,
      obj: {
        animName: animation.name,
        numAnimEvents: animation.numAnimEvents,
      }
    };

    // Animation events (only if evntData not provided)
    if (!evntData && animation.events.length > 0) {
      evnt[animResourceId.toString()] = {
        name: "Animation Events",
        order: animResourceId,
        obj: animation.events.map(event => ({
          time: event.time,
          type: event.type,
          value: event.value,
        }))
      };
    }

    // Process keyframes for each bone
    Object.entries(animation.keyframes).forEach(([boneIndexStr, keyframes]) => {
      const boneIndex = parseInt(boneIndexStr);
      
      // NumK resource ID: use same as animation (1000 + animIndex)
      const numKResourceId = animResourceId;
      numK[numKResourceId.toString()] = {
        name: "Number of Keyframes",
        order: numKResourceId,
        obj: {
          numKeyFrames: keyframes.length,
        }
      };

      // KeyF resource ID: pattern is 1000 + (animIndex * 100) + boneIndex
      const keyFResourceId = 1000 + (animIndex * 100) + boneIndex;
      keyF[keyFResourceId.toString()] = {
        name: "Keyframes",
        order: keyFResourceId,
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
      "1000": {
        name: "Header",
        order: 1000,
        obj: header
      }
    },
    Bone: bones,
    BonP: bonP,
    BonN: bonN,
    RelP: relP || {}, // Include RelP if provided, otherwise empty
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