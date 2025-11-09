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
  evntData?: { [key: string]: any },
  alisData?: { [key: string]: any },
  metadata?: any
): SkeletonResource {
  // Debug: Check what RelP data we received
  if (relP && relP['1000']) {
    console.log(`RelP received with ${relP['1000'].obj?.length || 0} points`);
  } else {
    console.log('No RelP data received');
  }
  
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
        reserved0: (bone as any).reserved0 !== undefined ? (bone as any).reserved0 : 0,
        reserved1: (bone as any).reserved1 !== undefined ? (bone as any).reserved1 : 0,
        reserved2: (bone as any).reserved2 !== undefined ? (bone as any).reserved2 : 0,
        reserved3: (bone as any).reserved3 !== undefined ? (bone as any).reserved3 : 0,
        reserved4: (bone as any).reserved4 !== undefined ? (bone as any).reserved4 : 0,
        reserved5: (bone as any).reserved5 !== undefined ? (bone as any).reserved5 : 0,
        reserved6: (bone as any).reserved6 !== undefined ? (bone as any).reserved6 : 0,
        reserved7: (bone as any).reserved7 !== undefined ? (bone as any).reserved7 : 0,
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

    // NumK resource: ONE per animation, contains array of keyframe counts for all bones
    // Initialize array with skeleton.numJoints entries (all 0)
    const numKeyFramesArray = new Array(skeleton.numJoints).fill(0);
    
    // Process keyframes for each bone
    Object.entries(animation.keyframes).forEach(([boneIndexStr, keyframes]) => {
      const boneIndex = parseInt(boneIndexStr);
      
      // Store the number of keyframes for this bone in the array
      numKeyFramesArray[boneIndex] = keyframes.length;

      // KeyF resource ID: pattern is 1000 + (animIndex * 100) + boneIndex
      const keyFResourceId = 1000 + (animIndex * 100) + boneIndex;
      
      // Get the bone name for this keyframe resource
      const boneName = skeleton.bones[boneIndex]?.name || '';
      
      keyF[keyFResourceId.toString()] = {
        name: boneName, // Use bone name, not generic "Keyframes"
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
    
    // Create ONE NumK resource per animation with the array of keyframe counts
    numK[animResourceId.toString()] = {
      name: animation.name,
      order: animResourceId,
      obj: numKeyFramesArray, // Array of signed bytes, one per bone
    };
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
    alis: alisData || {}, // Include alis if provided, otherwise empty
    _metadata: metadata || {}, // Include metadata if provided, otherwise empty
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