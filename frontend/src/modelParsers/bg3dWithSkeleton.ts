// bg3dWithSkeleton.ts
// Combined parser for BG3D/3DMF files with skeleton data

import { mapErr } from "@/utils/mapErr";
import {
  parseBG3D,
  BG3DParseResult,
  type BG3DAnimation,
  type BG3DAnimationEvent,
  type BG3DKeyframe,
} from "./parseBG3D";
import { parse3DMF } from "./parse3dmf";
import { parseSkeletonRsrc } from "./skeletonRsrc/parseSkeletonRsrcTS";
import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";
import { err, ok, ResultAsync, type Result } from "neverthrow";


/**
 * Detect if a buffer is a 3DMF file based on magic number
 */
function is3DMFBuffer(buffer: ArrayBuffer): boolean {
  if (buffer.byteLength < 4) return false;
  const view = new DataView(buffer);
  const magic = view.getUint32(0, false); // Big-endian
  // 3DMF magic: '3DMF' = 0x33444d46
  return magic === 0x33444d46;
}

/**
 * Parse a BG3D or 3DMF file along with its associated skeleton file
 * @param modelBuffer ArrayBuffer containing the .bg3d or .3dmf file
 * @param skeletonBuffer ArrayBuffer containing the .skeleton.rsrc file
 * @returns Promise<Result<BG3DParseResult, string>> with skeleton data included
 */
export async function parseBG3DWithSkeleton(
  modelBuffer: ArrayBuffer,
  skeletonBuffer: ArrayBuffer,
): Promise<Result<BG3DParseResult, string>> {
  console.log("Parsing skeleton resource...");

  // Parse skeleton data using the existing skeleton parser
  const skeletonResult = await ResultAsync.fromPromise(
    parseSkeletonRsrc(skeletonBuffer),
    mapErr,
  );
  if (skeletonResult.isErr()) {
    return err(skeletonResult.error);
  }

  const skeleton = skeletonResult.value;

  console.log("Parsing model with skeleton data...");

  // Parse model with skeleton data
  const result = parseModelWithSkeletonResource(modelBuffer, skeleton);

  if (result.isErr()) {
    return result;
  }

  console.log("Successfully parsed model with skeleton:", {
    materials: result.value.materials.length,
    groups: result.value.groups.length,
    skeleton: result.value.skeleton
      ? `${result.value.skeleton.bones.length} bones, ${result.value.skeleton.animations.length} animations`
      : "none",
  });

  return result;
}

/**
 * Parse a BG3D or 3DMF file with skeleton data from a SkeletonResource object
 * @param modelBuffer ArrayBuffer containing the .bg3d or .3dmf file
 * @param skeleton Parsed skeleton resource
 * @returns Result<BG3DParseResult, string> with skeleton data included
 */
export function parseBG3DWithSkeletonResource(
  modelBuffer: ArrayBuffer,
  skeleton: SkeletonResource,
): Result<BG3DParseResult, string> {
  return parseModelWithSkeletonResource(modelBuffer, skeleton);
}

/**
 * Parse a model buffer (BG3D or 3DMF) with optional skeleton data
 */
function parseModelWithSkeletonResource(
  modelBuffer: ArrayBuffer,
  skeleton: SkeletonResource,
): Result<BG3DParseResult, string> {
  if (is3DMFBuffer(modelBuffer)) {
    // Parse 3DMF file - note: 3DMF models with skeletons may need special handling
    // For now, parse the model and add skeleton data manually
    const modelResult = parse3DMF(modelBuffer);
    if (modelResult.isErr()) {
      return modelResult;
    }

    // Add skeleton data if available
    // Note: 3DMF skeleton data needs conversion from SkeletonResource format to BG3DSkeleton format
    const result = modelResult.value;

    if (skeleton && skeleton.Bone) {
      // Sort bone entries by order (same approach as parseBG3D.ts)
      const boneKeyValues = Object.entries(skeleton.Bone);
      boneKeyValues.sort(([, a], [, b]) => a.order - b.order);

      const animEntries = Object.values(skeleton.AnHd || {});
      const numAnims = animEntries.length ?? 0;
      const numJoints = boneKeyValues.length;

      // Extract header info if available
      const headerEntries = Object.values(skeleton.Hedr || {});
      const header = headerEntries[0]?.obj;
      const num3DMFLimbs = header?.num3DMFLimbs ?? numJoints;

      result.skeleton = {
        version: header?.version ?? 1,
        numAnims,
        numJoints,
        num3DMFLimbs,
        bones: boneKeyValues.map(([boneId, boneEntry], index) => {
          const boneObj = boneEntry.obj;

          // Read point indices from the BonP resource (same as parseBG3D)
          const pointIndices: number[] = [];
          const bonePEntry = skeleton.BonP?.[boneId];
          if (bonePEntry) {
            pointIndices.push(
              ...bonePEntry.obj.map((p) => p.pointIndex),
            );
          }

          // Read normal indices from the BonN resource (same as parseBG3D)
          const normalIndices: number[] = [];
          const boneNEntry = skeleton.BonN?.[boneId];
          if (boneNEntry) {
            normalIndices.push(
              ...boneNEntry.obj.map((n) => n.normal),
            );
          }

          return {
            parentBone: boneObj.parentBone,
            name: boneObj.name || boneEntry.name || `bone_${index}`,
            coordX: boneObj.coordX,
            coordY: boneObj.coordY,
            coordZ: boneObj.coordZ,
            numPointsAttachedToBone: boneObj.numPointsAttachedToBone,
            numNormalsAttachedToBone: boneObj.numNormalsAttachedToBone,
            reserved0: boneObj.reserved0,
            reserved1: boneObj.reserved1,
            reserved2: boneObj.reserved2,
            reserved3: boneObj.reserved3,
            reserved4: boneObj.reserved4,
            reserved5: boneObj.reserved5,
            reserved6: boneObj.reserved6,
            reserved7: boneObj.reserved7,
            pointIndices,
            normalIndices,
          };
        }),
        animations: buildAnimations(skeleton, numJoints),
      };
    }

    return ok(result);
  } else {
    // Parse BG3D file
    return parseBG3D(modelBuffer, skeleton);
  }
}

function buildAnimations(
  skeleton: SkeletonResource,
  numJoints: number,
): BG3DAnimation[] {
  const anims: BG3DAnimation[] = [];
  const animHeaderEntries = Object.entries(skeleton.AnHd || {});
  animHeaderEntries.sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10));

  animHeaderEntries.forEach(([animId, animEntry]) => {
    const animHeader = animEntry.obj;
    const animResourceId = parseInt(animId, 10);
    const animIndex = animResourceId - 1000;

    const events: BG3DAnimationEvent[] = [];
    const eventEntry = skeleton.Evnt?.[animId];
    if (eventEntry) {
      eventEntry.obj.forEach((event) => {
        events.push({
          time: event.time,
          type: event.type,
          value: event.value,
        });
      });
    }

    const keyframes: Record<number, BG3DKeyframe[]> = {};
    for (let boneIndex = 0; boneIndex < numJoints; boneIndex++) {
      keyframes[boneIndex] = [];
      const keyframeResourceId = (1000 + animIndex * 100 + boneIndex).toString();
      const keyframeEntry = skeleton.KeyF?.[keyframeResourceId];

      if (keyframeEntry && keyframeEntry.obj && Array.isArray(keyframeEntry.obj)) {
        keyframeEntry.obj.forEach((keyframe) => {
          keyframes[boneIndex]?.push({
            tick: keyframe.tick,
            accelerationMode: keyframe.accelerationMode,
            coordX: keyframe.coordX,
            coordY: keyframe.coordY,
            coordZ: keyframe.coordZ,
            rotationX: keyframe.rotationX,
            rotationY: keyframe.rotationY,
            rotationZ: keyframe.rotationZ,
            scaleX: keyframe.scaleX,
            scaleY: keyframe.scaleY,
            scaleZ: keyframe.scaleZ,
          });
        });
      }
    }

    anims.push({
      name:
        typeof animHeader?.animName === "string"
          ? animHeader.animName
          : typeof animEntry.name === "string"
            ? animEntry.name
            : `anim_${animIndex}`,
      numAnimEvents: events.length,
      events,
      keyframes,
    });
  });

  return anims;
}
