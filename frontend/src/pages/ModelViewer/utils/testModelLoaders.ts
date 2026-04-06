/**
 * Test model loaders for demo and testing purposes
 *
 * Loads pre-packaged test models (Otto Matic) from the public assets directory
 */

import { err, ok, type Result, ResultAsync } from "neverthrow";

const mapErr = (e: unknown) => (e instanceof Error ? e : new Error(String(e)));

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
  const responsesResult = await ResultAsync.fromPromise(
    Promise.all([
      fetch("/PangeaRSEdit/games/ottomatic/skeletons/Otto.bg3d"),
      fetch("/PangeaRSEdit/games/ottomatic/skeletons/Otto.skeleton.rsrc"),
    ]),
    (e) => (e instanceof Error ? e : new Error(String(e))),
  );
  if (responsesResult.isErr()) {
    return Promise.reject(responsesResult.error);
  }
  const [bg3dResponse, skeletonResponse] = responsesResult.value;

  if (!bg3dResponse.ok) {
    return err(new Error(`Failed to fetch Otto.bg3d: ${bg3dResponse.status}`));
  }

  const bg3dArrayBufferResult = await ResultAsync.fromPromise(
    bg3dResponse.arrayBuffer(),
    (e) => (e instanceof Error ? e : new Error(String(e))),
  );
  if (bg3dArrayBufferResult.isErr()) return Promise.reject(bg3dArrayBufferResult.error);
  const bg3dArrayBuffer = bg3dArrayBufferResult.value;
  const bg3dFile = new File([bg3dArrayBuffer], "Otto.bg3d", {
    type: "application/octet-stream",
  });

  let skeletonFile: File | undefined;
  if (skeletonResponse.ok) {
    const skeletonArrayBufferResult = await ResultAsync.fromPromise(
      skeletonResponse.arrayBuffer(),
      (e) => (e instanceof Error ? e : new Error(String(e))),
    );
    if (skeletonArrayBufferResult.isErr()) return Promise.reject(skeletonArrayBufferResult.error);
    const skeletonArrayBuffer = skeletonArrayBufferResult.value;
    skeletonFile = new File([skeletonArrayBuffer], "Otto.skeleton.rsrc", {
      type: "application/octet-stream",
    });
    console.log("Loaded Otto skeleton file");
  } else {
    console.warn(
      "Otto skeleton file not found, loading without animations",
    );
  }

  return ok({ bg3dFile, skeletonFile });
}

/**
 * Loads the Otto test model without skeleton
 *
 * Useful for comparison testing or when animations are not needed.
 *
 * @returns Promise containing Result with just the BG3D file
 */
export async function loadOttoTestModelWithoutSkeleton(): Promise<Result<File, Error>> {
  const fetchResult = await ResultAsync.fromPromise(
    fetch("/PangeaRSEdit/games/ottomatic/skeletons/Otto.bg3d"),
    mapErr,
  );

  if (fetchResult.isErr()) {
    return err(new Error(`Failed to fetch Otto.bg3d: ${fetchResult.error.message}`));
  }

  const bg3dResponse = fetchResult.value;
  if (!bg3dResponse.ok) {
    return err(new Error(`Failed to fetch Otto.bg3d: ${bg3dResponse.status}`));
  }

  const bufferResult = await ResultAsync.fromPromise(bg3dResponse.arrayBuffer(), mapErr);
  if (bufferResult.isErr()) {
    return err(new Error(`Failed to read Otto.bg3d: ${bufferResult.error.message}`));
  }

  const bg3dArrayBuffer = bufferResult.value;
  const bg3dFile = new File([bg3dArrayBuffer], "Otto.bg3d", {
    type: "application/octet-stream",
  });

  console.log("Loading Otto model without skeleton data for comparison");
  return ok(bg3dFile);
}
