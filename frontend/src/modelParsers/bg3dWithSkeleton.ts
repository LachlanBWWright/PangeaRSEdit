// bg3dWithSkeleton.ts
// Combined parser for BG3D/3DMF files with skeleton data

import { parseBG3D, BG3DParseResult } from "./parseBG3D";
import { parse3DMF } from "./parse3dmf";
import { parseSkeletonRsrc } from "./skeletonRsrc/parseSkeletonRsrc";
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
 * @param pyodideWorker Initialized Pyodide worker for skeleton parsing
 * @returns Promise<Result<BG3DParseResult, Error>> with skeleton data included
 */
export async function parseBG3DWithSkeleton(
  modelBuffer: ArrayBuffer,
  skeletonBuffer: ArrayBuffer,
  pyodideWorker: Worker,
): Promise<Result<BG3DParseResult, Error>> {
  console.log("Parsing skeleton resource...");

  try {
    // Parse skeleton data using the existing skeleton parser
    const skeletonArrayBuffer = await parseSkeletonRsrc({
      pyodideWorker,
      bytes: skeletonBuffer,
    });

    // Convert ArrayBuffer to SkeletonResource
    const skeletonJson = new TextDecoder().decode(skeletonArrayBuffer as AllowSharedBufferSource);
    const skeleton: SkeletonResource = JSON.parse(skeletonJson);

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
    
    if (skeleton && skeleton.bones) {
      // Extract header info
      const numAnims = skeleton.anims?.length ?? 0;
      const numJoints = skeleton.bones.length;
      
      result.skeleton = {
        version: 1, // Default version for 3DMF skeletons
        numAnims,
        numJoints,
        num3DMFLimbs: numJoints, // Typically same as numJoints for 3DMF
        bones: skeleton.bones.map((bone, index) => ({
          name: bone.name || `bone_${index}`,
          parentIndex: typeof bone.parentBone === 'number' ? bone.parentBone : -1,
          position: bone.coord ? [bone.coord.x, bone.coord.y, bone.coord.z] as [number, number, number] : [0, 0, 0],
          pointIndices: bone.pointList || [],
          normalIndices: bone.normalList || [],
        })),
        animations: skeleton.anims ? skeleton.anims.map((anim, animIndex) => ({
          name: anim.name || `anim_${animIndex}`,
          keyframes: [],
        })) : [],
      };
    }
    
    return ok(result);
  } else {
    // Parse BG3D file
    return parseBG3D(modelBuffer, skeleton);
  }
}
