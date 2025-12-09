// bg3dWithSkeleton.ts
// Combined parser for BG3D files with skeleton data

import { parseBG3D, BG3DParseResult } from "./parseBG3D";
import { parseSkeletonRsrc } from "./skeletonRsrc/parseSkeletonRsrc";
import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";
import { Result, err, isErr } from "../types/result";

/**
 * Parse a BG3D file along with its associated skeleton file
 * @param bg3dBuffer ArrayBuffer containing the .bg3d file
 * @param skeletonBuffer ArrayBuffer containing the .skeleton.rsrc file
 * @param pyodideWorker Initialized Pyodide worker for skeleton parsing
 * @returns Promise<Result<BG3DParseResult, Error>> with skeleton data included
 */
export async function parseBG3DWithSkeleton(
  bg3dBuffer: ArrayBuffer,
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
    const skeletonJson = new TextDecoder().decode(skeletonArrayBuffer);
    const skeleton: SkeletonResource = JSON.parse(skeletonJson);

    console.log("Parsing BG3D with skeleton data...");

    // Parse BG3D with skeleton data
    const result = parseBG3D(bg3dBuffer, skeleton);

    if (isErr(result)) {
      return result;
    }

    console.log("Successfully parsed BG3D with skeleton:", {
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
 * Parse a BG3D file with skeleton data from a SkeletonResource object
 * @param bg3dBuffer ArrayBuffer containing the .bg3d file
 * @param skeleton Parsed skeleton resource
 * @returns Result<BG3DParseResult, Error> with skeleton data included
 */
export function parseBG3DWithSkeletonResource(
  bg3dBuffer: ArrayBuffer,
  skeleton: SkeletonResource,
): Result<BG3DParseResult, Error> {
  return parseBG3D(bg3dBuffer, skeleton);
}
