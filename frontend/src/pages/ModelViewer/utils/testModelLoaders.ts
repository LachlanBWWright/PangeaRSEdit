/**
 * Test model loaders for demo and testing purposes
 *
 * Loads pre-packaged test models (Otto Matic) from the public assets directory
 */

/**
 * Loads the Otto test model with skeleton
 *
 * @returns Promise containing both the BG3D file and skeleton file
 * @throws Error if files cannot be loaded
 */
export async function loadOttoTestModel(): Promise<{
  bg3dFile: File;
  skeletonFile?: File;
}> {
  // Load both Otto.bg3d and Otto.skeleton.rsrc test files
  const [bg3dResponse, skeletonResponse] = await Promise.all([
    fetch("/PangeaRSEdit/games/ottomatic/skeletons/Otto.bg3d"),
    fetch("/PangeaRSEdit/games/ottomatic/skeletons/Otto.skeleton.rsrc"),
  ]);

  if (!bg3dResponse.ok) {
    throw new Error(
      "Failed to fetch Otto.bg3d: " + String(bg3dResponse.status),
    );
  }

  const bg3dArrayBuffer = await bg3dResponse.arrayBuffer();
  const bg3dFile = new File([bg3dArrayBuffer], "Otto.bg3d", {
    type: "application/octet-stream",
  });

  let skeletonFile: File | undefined;
  if (skeletonResponse.ok) {
    const skeletonArrayBuffer = await skeletonResponse.arrayBuffer();
    skeletonFile = new File([skeletonArrayBuffer], "Otto.skeleton.rsrc", {
      type: "application/octet-stream",
    });
    console.log("Loaded Otto skeleton file");
  } else {
    console.warn("Otto skeleton file not found, loading without animations");
  }

  return { bg3dFile, skeletonFile };
}

/**
 * Loads the Otto test model without skeleton
 *
 * Useful for comparison testing or when animations are not needed.
 *
 * @returns Promise containing just the BG3D file
 * @throws Error if file cannot be loaded
 */
export async function loadOttoTestModelWithoutSkeleton(): Promise<File> {
  const bg3dResponse = await fetch(
    "/PangeaRSEdit/games/ottomatic/skeletons/Otto.bg3d",
  );

  if (!bg3dResponse.ok) {
    throw new Error(
      "Failed to fetch Otto.bg3d: " + String(bg3dResponse.status),
    );
  }

  const bg3dArrayBuffer = await bg3dResponse.arrayBuffer();
  const bg3dFile = new File([bg3dArrayBuffer], "Otto.bg3d", {
    type: "application/octet-stream",
  });

  console.log("Loading Otto model without skeleton data for comparison");
  return bg3dFile;
}
