// skeletonExport.ts
// Convert BG3D skeleton data back to skeleton resource format

import type {
  SkeletonResource,
  BoneEntry,
  BonPEntry,
  BonNEntry,
  AnHdEntry,
  EvntEntry,
  NumKEntry,
  KeyFEntry,
  RelPEntry,
} from "../python/structSpecs/skeleton/skeletonInterface";
import type { BG3DSkeleton } from "./parseBG3D";

/**
 * Convert BG3D skeleton data to SkeletonResource format
 * @param skeleton BG3D skeleton data
 * @param relP Optional RelP data from original skeleton resource (uses skeleton.relPoints if not provided)
 * @param evntData Optional Evnt data (uses skeleton.animations[].events if not provided)
 * @param alisData Optional alis data (uses skeleton.alisData if not provided)
 * @param metadata Optional metadata (uses skeleton.metadata if not provided)
 * @returns SkeletonResource object
 */
export function bg3dSkeletonToSkeletonResource(
  skeleton: BG3DSkeleton,
  relP?: Record<string, unknown>,
  evntData?: Record<string, unknown>,
  alisData?: Record<string, unknown>,
  metadata?: unknown,
): SkeletonResource {
  // Use skeleton's own data if not explicitly provided
  const effectiveRelP =
    relP || convertRelPointsToRelPFormat(skeleton.relPoints);
  const effectiveAlisData = alisData || skeleton.alisData;
  const effectiveMetadata = metadata || skeleton.metadata;

  // Debug: Check what RelP data we received
  const effectiveRelPObj = effectiveRelP as Record<string, unknown> | undefined;
  if (effectiveRelPObj && effectiveRelPObj["1000"]) {
    const rEntry = effectiveRelPObj["1000"] as
      | Record<string, unknown>
      | undefined;
    const len = Array.isArray(rEntry?.obj)
      ? (rEntry.obj as unknown[]).length
      : 0;
    console.log(`RelP received with ${len} points`);
  } else {
    console.log("No RelP data received");
  }

  // Create header
  const header = {
    version: skeleton.version,
    numAnims: skeleton.numAnims,
    numJoints: skeleton.numJoints,
    num3DMFLimbs: skeleton.num3DMFLimbs,
  };

  // Convert bones - use resource IDs starting from 1000
  const bones: Record<string, BoneEntry> = {};
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
        reserved0: bone.reserved0,
        reserved1: bone.reserved1,
        reserved2: bone.reserved2,
        reserved3: bone.reserved3,
        reserved4: bone.reserved4,
        reserved5: bone.reserved5,
        reserved6: bone.reserved6,
        reserved7: bone.reserved7,
      },
    };
  });

  // Convert bone point attachments - use resource IDs matching bone IDs (1000+)
  // Create resources for ALL bones, even if empty (size 0)
  const bonP: Record<string, BonPEntry> = {};
  skeleton.bones.forEach((bone, index) => {
    const resourceId = 1000 + index;
    bonP[resourceId.toString()] = {
      name: bone.name, // Use bone name, not generic "Bone Points"
      order: resourceId,
      obj: (bone.pointIndices || []).map((pointIndex) => ({ pointIndex })),
    };
  });

  // Convert bone normal attachments - use resource IDs matching bone IDs (1000+)
  // Create resources for ALL bones, even if empty (size 0)
  const bonN: Record<string, BonNEntry> = {};
  skeleton.bones.forEach((bone, index) => {
    const resourceId = 1000 + index;
    bonN[resourceId.toString()] = {
      name: bone.name, // Use bone name, not generic "Bone Normals"
      order: resourceId,
      obj: (bone.normalIndices || []).map((normal) => ({ normal })),
    };
  });

  // Convert animations
  const anHd: Record<string, AnHdEntry> = {};
  // Use provided evntData if available, otherwise create empty
  const evnt: Record<string, EvntEntry> =
    (evntData as Record<string, EvntEntry>) || {};
  const numK: Record<string, NumKEntry> = {};
  const keyF: Record<string, KeyFEntry> = {};

  skeleton.animations.forEach((animation, animIndex) => {
    const animResourceId = 1000 + animIndex;

    // Animation header - use resource IDs starting from 1000
    anHd[animResourceId.toString()] = {
      name: animation.name, // Use actual animation name, not generic "Animation Header"
      order: animResourceId,
      obj: {
        animName: animation.name,
        numAnimEvents: animation.numAnimEvents,
      },
    };

    // Animation events (only if evntData not provided)
    if (!evntData && animation.events.length > 0) {
      evnt[animResourceId.toString()] = {
        name: "Animation Events",
        order: animResourceId,
        obj: animation.events.map((event) => ({
          time: event.time,
          type: event.type,
          value: event.value,
        })),
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
      const keyFResourceId = 1000 + animIndex * 100 + boneIndex;

      // Get the bone name for this keyframe resource
      const boneName = skeleton.bones[boneIndex]?.name || "";

      keyF[keyFResourceId.toString()] = {
        name: boneName, // Use bone name, not generic "Keyframes"
        order: keyFResourceId,
        obj: (keyframes as unknown[]).map((kf) => {
          const kv = kf as Record<string, unknown>;
          return {
            tick: (kv.tick as number) || 0,
            accelerationMode: (kv.accelerationMode as number) || 0,
            coordX: (kv.coordX as number) || 0,
            coordY: (kv.coordY as number) || 0,
            coordZ: (kv.coordZ as number) || 0,
            rotationX: (kv.rotationX as number) || 0,
            rotationY: (kv.rotationY as number) || 0,
            rotationZ: (kv.rotationZ as number) || 0,
            scaleX: (kv.scaleX as number) || 1,
            scaleY: (kv.scaleY as number) || 1,
            scaleZ: (kv.scaleZ as number) || 1,
          } as unknown as import("../python/structSpecs/skeleton/skeletonInterface").KeyFObj;
        }),
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
        obj: header,
      },
    },
    Bone: bones,
    BonP: bonP,
    BonN: bonN,
    RelP: (effectiveRelP as unknown as Record<string, RelPEntry>) || {}, // Include RelP if provided or from skeleton, otherwise empty
    AnHd: anHd,
    Evnt: evnt,
    NumK: numK,
    KeyF: keyF,
    alis:
      effectiveAlisData && Object.keys(effectiveAlisData).length > 0
        ? effectiveAlisData
        : { "1000": { name: "alis", order: 1000, data: "00" } }, // Ensure alis resource exists (placeholder hex data if missing)
    _metadata: (effectiveMetadata as Record<string, unknown>) || {}, // Include metadata if provided or from skeleton, otherwise empty
  };
}

/**
 * Helper function to convert relPoints format to RelP resource format
 */
function convertRelPointsToRelPFormat(relPoints?: Record<string, [number, number, number][]>): Record<string, unknown> | undefined {
  if (!relPoints || Object.keys(relPoints).length === 0) {
    return undefined;
  }

  const relP: Record<string, RelPEntry> = {};
  Object.entries(relPoints).forEach(([resourceId, points]) => {
    relP[resourceId] = {
      name: `RelP_${resourceId}`,
      order: parseInt(resourceId, 10),
      obj: points.map(([x, y, z]) => ({
        relOffsetX: x,
        relOffsetY: y,
        relOffsetZ: z,
      })),
    };
  });
  return relP;
}
