/**
 * Test model loaders for demo and testing purposes
 *
 * Loads pre-packaged test models (Otto Matic) from the public assets directory
 */

import { fromPromise, err, type Result } from "@/types/result";

/**
 * Loads the Otto test model with skeleton
 *
 * @returns Promise containing Result with both the BG3D file and skeleton file
 */
export async function loadOttoTestModel(): Promise<Result<{
  bg3dFile: File;
  skeletonFile?: File;
}, Error>> {
  // Load both Otto.bg3d and Otto.skeleton.rsrc test files
  const fetchAllResult = await fromPromise(Promise.all([
    fetch("/PangeaRSEdit/games/ottomatic/skeletons/Otto.bg3d"),
    fetch("/PangeaRSEdit/games/ottomatic/skeletons/Otto.skeleton.rsrc"),
  ]));

  if (!fetchAllResult.ok) {
    return err(new Error(`Failed to fetch test models: ${fetchAllResult.error.message}`));
  }

  const [bg3dResponse, skeletonResponse] = fetchAllResult.value;

  if (!bg3dResponse.ok) {
    return err(new Error(`Failed to fetch Otto.bg3d: ${bg3dResponse.status}`));
  }

  const bg3dBufferResult = await fromPromise(bg3dResponse.arrayBuffer());
  if (!bg3dBufferResult.ok) {
    return err(new Error(`Failed to read Otto.bg3d: ${bg3dBufferResult.error.message}`));
  }
  const bg3dArrayBuffer = bg3dBufferResult.value;
  const bg3dFile = new File([bg3dArrayBuffer], "Otto.bg3d", {
    type: "application/octet-stream",
  });

  let skeletonFile: File | undefined;
  if (skeletonResponse.ok) {
    const skeletonBufferResult = await fromPromise(skeletonResponse.arrayBuffer());
    if (!skeletonBufferResult.ok) {
      return err(new Error(`Failed to read Otto.skeleton.rsrc: ${skeletonBufferResult.error.message}`));
    }
    const skeletonArrayBuffer = skeletonBufferResult.value;
    skeletonFile = new File([skeletonArrayBuffer], "Otto.skeleton.rsrc", {
      type: "application/octet-stream",
    });
    console.log("Loaded Otto skeleton file");
  } else {
    console.warn(
      "Otto skeleton file not found, loading without animations",
    );
  }

  return { ok: true, value: { bg3dFile, skeletonFile } };
}

/**
 * Loads the Otto test model without skeleton
 *
 * Useful for comparison testing or when animations are not needed.
 *
 * @returns Promise containing Result with just the BG3D file
 */
export async function loadOttoTestModelWithoutSkeleton(): Promise<Result<File, Error>> {
  const fetchResult = await fromPromise(
    fetch("/PangeaRSEdit/games/ottomatic/skeletons/Otto.bg3d")
  );

  if (!fetchResult.ok) {
    return err(new Error(`Failed to fetch Otto.bg3d: ${fetchResult.error.message}`));
  }

  const bg3dResponse = fetchResult.value;
  if (!bg3dResponse.ok) {
    return err(new Error(`Failed to fetch Otto.bg3d: ${bg3dResponse.status}`));
  }

  const bufferResult = await fromPromise(bg3dResponse.arrayBuffer());
  if (!bufferResult.ok) {
    return err(new Error(`Failed to read Otto.bg3d: ${bufferResult.error.message}`));
  }

  const bg3dArrayBuffer = bufferResult.value;
  const bg3dFile = new File([bg3dArrayBuffer], "Otto.bg3d", {
    type: "application/octet-stream",
  });

  console.log("Loading Otto model without skeleton data for comparison");
  return { ok: true, value: bg3dFile };
}
