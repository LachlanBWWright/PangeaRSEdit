// bg3dWithSkeleton.ts
// Combined parser for BG3D/3DMF files with skeleton data

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
import { Result, err, isErr, ok, fromPromise } from "../types/result";

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
 * @returns Promise<Result<BG3DParseResult, Error>> with skeleton data included
 */
export async function parseBG3DWithSkeleton(
  modelBuffer: ArrayBuffer,
  skeletonBuffer: ArrayBuffer,
): Promise<Result<BG3DParseResult, Error>> {
  console.log("Parsing skeleton resource...");

  // Parse skeleton data using the existing skeleton parser
  const skeletonResult = await fromPromise(parseSkeletonRsrc(skeletonBuffer));
  if (skeletonResult.isErr()) {
    return err(skeletonResult.error);
  }

  const skeleton = skeletonResult.value;

  console.log("Parsing model with skeleton data...");

  // Parse model with skeleton data
  const result = parseModelWithSkeletonResource(modelBuffer, skeleton);

  if (isErr(result)) {
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
 * @returns Result<BG3DParseResult, Error> with skeleton data included
 */
export function parseBG3DWithSkeletonResource(
  modelBuffer: ArrayBuffer,
  skeleton: SkeletonResource,
): Result<BG3DParseResult, Error> {
  return parseModelWithSkeletonResource(modelBuffer, skeleton);
}

/**
 * Parse a model buffer (BG3D or 3DMF) with optional skeleton data
 */
function parseModelWithSkeletonResource(
  modelBuffer: ArrayBuffer,
  skeleton: SkeletonResource,
): Result<BG3DParseResult, Error> {
  if (is3DMFBuffer(modelBuffer)) {
    // Parse 3DMF file - note: 3DMF models with skeletons may need special handling
    // For now, parse the model and add skeleton data manually
    const modelResult = parse3DMF(modelBuffer);
    if (isErr(modelResult)) {
      return modelResult;
    }

    // Add skeleton data if available
    // Note: 3DMF skeleton data needs conversion from SkeletonResource format to BG3DSkeleton format
    const result = modelResult.value;

    if (skeleton && skeleton.Bone) {
      // Extract header info
      const boneEntries = Object.values(skeleton.Bone || {});
      const animEntries = Object.values(skeleton.AnHd || {});
      const numAnims = animEntries.length ?? 0;
      const numJoints = boneEntries.length;

      // Type guard helper
      function isRecord(value: unknown): value is Record<string, unknown> {
        return (
          typeof value === "object" && value !== null && !Array.isArray(value)
        );
      }

      function getNumberArray(value: unknown): number[] {
        if (Array.isArray(value) && value.every((v) => typeof v === "number")) {
          return value;
        }
        return [];
      }

      result.skeleton = {
        version: 1, // Default version for 3DMF skeletons
        numAnims,
        numJoints,
        num3DMFLimbs: numJoints, // Typically same as numJoints for 3DMF
        bones: boneEntries.map((bone: unknown, index: number) => {
          if (!isRecord(bone)) {
            return {
              parentBone: -1,
              name: `bone_${index}`,
              coordX: 0,
              coordY: 0,
              coordZ: 0,
              numPointsAttachedToBone: 0,
              numNormalsAttachedToBone: 0,
              pointIndices: [],
              normalIndices: [],
            };
          }
          
          // In SkeletonResource, bone is a BoneEntry like { name, order, obj }
          // We need to access bone.obj for the actual bone data
          const boneEntry = bone;
          const boneObj = isRecord(boneEntry.obj) ? boneEntry.obj : boneEntry;
          
          // Handle both old formats (coord.x, pointList) and new formats (coordX, pointIndices)
          const coordX = typeof boneObj.coordX === "number" ? boneObj.coordX : 
                         (isRecord(boneObj.coord) && typeof boneObj.coord.x === "number" ? boneObj.coord.x : 0);
          const coordY = typeof boneObj.coordY === "number" ? boneObj.coordY : 
                         (isRecord(boneObj.coord) && typeof boneObj.coord.y === "number" ? boneObj.coord.y : 0);
          const coordZ = typeof boneObj.coordZ === "number" ? boneObj.coordZ : 
                         (isRecord(boneObj.coord) && typeof boneObj.coord.z === "number" ? boneObj.coord.z : 0);
          
          const pointList = getNumberArray(boneObj.pointIndices || boneObj.pointList);
          const normalList = getNumberArray(boneObj.normalIndices || boneObj.normalList);
          
          // Note: rsrcdump might use 'parentBone', 'name', 'numPointsAttachedToBone' directly on obj
          return {
            parentBone: typeof boneObj.parentBone === "number" ? boneObj.parentBone : -1,
            name: typeof boneObj.name === "string" ? boneObj.name : 
                  (typeof boneEntry.name === "string" ? boneEntry.name : `bone_${index}`),
            coordX,
            coordY,
            coordZ,
            numPointsAttachedToBone: typeof boneObj.numPointsAttachedToBone === "number" ? boneObj.numPointsAttachedToBone : pointList.length,
            numNormalsAttachedToBone: typeof boneObj.numNormalsAttachedToBone === "number" ? boneObj.numNormalsAttachedToBone : normalList.length,
            pointIndices: pointList,
            normalIndices: normalList,
          };
        }),
        animations: (() => {
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
            for (let boneIndex = 0; boneIndex < boneEntries.length; boneIndex++) {
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
              name: typeof animHeader?.animName === "string" ? animHeader.animName : 
                    (typeof animEntry.name === "string" ? animEntry.name : `anim_${animIndex}`),
              numAnimEvents: events.length,
              events,
              keyframes,
            });
          });
          return anims;
        })(),
      };
    }

    return ok(result);
  } else {
    // Parse BG3D file
    return parseBG3D(modelBuffer, skeleton);
  }
}
