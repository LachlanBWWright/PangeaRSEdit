// bg3dWithSkeleton.ts
// Combined parser for BG3D/3DMF files with skeleton data

import { parseBG3D, BG3DParseResult } from "./parseBG3D";
import { parse3DMF } from "./parse3dmf";
import { parseSkeletonRsrc } from "./skeletonRsrc/parseSkeletonRsrcTS";
import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";
import { Result, err, isErr, ok } from "../types/result";

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

  try {
    // Parse skeleton data using the existing skeleton parser
    const skeletonData = await parseSkeletonRsrc(skeletonBuffer);

    // skeletonData is already the parsed JSON object
    const skeleton: SkeletonResource = skeletonData as SkeletonResource;

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
  } catch (error) {
    return err(error instanceof Error ? error : new Error(String(error)));
  }
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

      result.skeleton = {
        version: 1, // Default version for 3DMF skeletons
        numAnims,
        numJoints,
        num3DMFLimbs: numJoints, // Typically same as numJoints for 3DMF
        bones: boneEntries.map((bone: unknown, index: number) => {
          const boneObj = bone as Record<string, unknown>;
          const coord = boneObj.coord as Record<string, number> || { x: 0, y: 0, z: 0 };
          return {
            parentBone: typeof boneObj.parentBone === 'number' ? (boneObj.parentBone as number) : -1,
            name: (boneObj.name as string) || `bone_${index}`,
            coordX: coord.x ?? 0,
            coordY: coord.y ?? 0,
            coordZ: coord.z ?? 0,
            numPointsAttachedToBone: ((boneObj.pointList as number[]) || []).length,
            numNormalsAttachedToBone: ((boneObj.normalList as number[]) || []).length,
            pointIndices: (boneObj.pointList as number[]) || [],
            normalIndices: (boneObj.normalList as number[]) || [],
          };
        }),
        animations: animEntries.length > 0 ? animEntries.map((anim: unknown, animIndex: number) => {
          const animObj = anim as Record<string, unknown>;
          return {
            name: (animObj.name as string) || `anim_${animIndex}`,
            numAnimEvents: 0,
            events: [],
            keyframes: {},
          };
        }) : [],
      };
    }
    
    return ok(result);
  } else {
    // Parse BG3D file
    return parseBG3D(modelBuffer, skeleton);
  }
}
