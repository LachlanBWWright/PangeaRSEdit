// bg3dWithSkeleton.ts
// Combined parser for BG3D files with skeleton data

import { parseBG3D, BG3DParseResult } from "./parseBG3D";
import { parseSkeletonRsrc } from "./skeletonRsrc/parseSkeletonRsrc";
import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";

/**
 * Parse a BG3D file along with its associated skeleton file
 * @param bg3dBuffer ArrayBuffer containing the .bg3d file
 * @param skeletonBuffer ArrayBuffer containing the .skeleton.rsrc file
 * @param pyodideWorker Initialized Pyodide worker for skeleton parsing
 * @returns Promise<BG3DParseResult> with skeleton data included
 */
export async function parseBG3DWithSkeleton(
  bg3dBuffer: ArrayBuffer,
  skeletonBuffer: ArrayBuffer,
  pyodideWorker: Worker
): Promise<BG3DParseResult> {
  console.log("Parsing skeleton resource...");
  
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
  
  console.log("Successfully parsed BG3D with skeleton:", {
    materials: result.materials.length,
    groups: result.groups.length,
    skeleton: result.skeleton ? `${result.skeleton.bones.length} bones, ${result.skeleton.animations.length} animations` : "none"
  });
  
  return result;
}

/**
 * Parse a BG3D file with skeleton data from a SkeletonResource object
 * @param bg3dBuffer ArrayBuffer containing the .bg3d file
 * @param skeleton Parsed skeleton resource
 * @returns BG3DParseResult with skeleton data included
 */
export function parseBG3DWithSkeletonResource(
  bg3dBuffer: ArrayBuffer,
  skeleton: SkeletonResource
): BG3DParseResult {
  return parseBG3D(bg3dBuffer, skeleton);
}