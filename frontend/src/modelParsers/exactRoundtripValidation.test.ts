// Roundtrip validation test for BG3D + skeleton parsing.
// This verifies semantic reconstruction without relying on preserved original binaries.
import { describe, it, expect } from "vitest";
import { parseBG3D, bg3dParsedToBG3D } from "./parseBG3D";
import { parseSkeletonRsrc } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dSkeletonToSkeletonResource } from "./skeletonExport";
import { skeletonResourceToBinary } from "./skeletonBinaryExport";
import {
  bg3dParsedToGLTF,
  gltfToBG3D,
} from "./parsedBg3dGitfConverter";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

describe("Exact Byte-for-Byte Roundtrip Validation", () => {
  const ottoBg3dPath = join(
    __dirname,
    "../../../games/ottomatic/Data/Skeletons/Otto.bg3d",
  );
  const ottoSkeletonPath = join(
    __dirname,
    "../../../games/ottomatic/Data/Skeletons/Otto.skeleton.rsrc",
  );

  it("should reconstruct Otto BG3D and skeleton semantics from GLB-only data", async () => {
    // Skip test if files don't exist
    if (!existsSync(ottoBg3dPath) || !existsSync(ottoSkeletonPath)) {
      console.log("Skipping test - Otto skeleton files not found");
      return;
    }

    console.log("=== EXACT MATCH VALIDATION TEST ===");

    // Step 1: Load original files
    const originalBg3dData = readFileSync(ottoBg3dPath);
    const originalSkeletonData = readFileSync(ottoSkeletonPath);

    console.log(`Original BG3D: ${originalBg3dData.length} bytes`);
    console.log(`Original skeleton: ${originalSkeletonData.length} bytes`);

    // Step 2: Parse original data
    const originalSkeletonArrayBuffer = originalSkeletonData.buffer.slice(
      originalSkeletonData.byteOffset,
      originalSkeletonData.byteOffset + originalSkeletonData.byteLength,
    );
    const originalSkeletonResource = await parseSkeletonRsrc(
      originalSkeletonArrayBuffer,
    );
    const originalBg3dResult = parseBG3D(
      originalBg3dData.buffer.slice(
        originalBg3dData.byteOffset,
        originalBg3dData.byteOffset + originalBg3dData.byteLength,
      ),
      originalSkeletonResource,
    );

    // Handle Result type
    if (!originalBg3dResult.ok) {
      console.log("Failed to parse BG3D:", originalBg3dResult.error);
      return;
    }
    const originalBg3d = originalBg3dResult.value;

    // Step 3: Convert Otto -> glTF without original binary preservation.
    const gltfDocument = await bg3dParsedToGLTF(originalBg3d);
    const roundtripBg3d = await gltfToBG3D(gltfDocument);

    if (!roundtripBg3d.skeleton) {
      console.log("Missing skeleton in roundtrip result");
      return;
    }

    const roundtripSkeletonResource = bg3dSkeletonToSkeletonResource(
      roundtripBg3d.skeleton,
    );

    // Step 4: Generate BG3D and skeleton binaries from reconstructed data.
    const roundtripBg3dBinary = bg3dParsedToBG3D(roundtripBg3d);
    const roundtripSkeletonBinaryResult = skeletonResourceToBinary(
      roundtripSkeletonResource,
    );

    if (!roundtripSkeletonBinaryResult.ok) {
      console.error("Failed to convert skeleton to binary:", roundtripSkeletonBinaryResult.error);
      return;
    }
    const roundtripSkeletonBinary = roundtripSkeletonBinaryResult.value;

    console.log(`Roundtrip BG3D: ${roundtripBg3dBinary.byteLength} bytes`);
    console.log(
      `Roundtrip skeleton: ${roundtripSkeletonBinary.byteLength} bytes`,
    );

    // Step 5: Structural comparison for BG3D
    const originalBg3dArray = new Uint8Array(
      originalBg3dData.buffer.slice(
        originalBg3dData.byteOffset,
        originalBg3dData.byteOffset + originalBg3dData.byteLength,
      ),
    );
    const roundtripBg3dArray = new Uint8Array(roundtripBg3dBinary);

    let bg3dMismatches = 0;
    let firstMismatch = -1;

    for (let i = 0; i < originalBg3dArray.length; i++) {
      const origByte = originalBg3dArray[i];
      const roundByte = roundtripBg3dArray[i];
      if (origByte !== undefined && roundByte !== undefined && origByte !== roundByte) {
        bg3dMismatches++;
        if (firstMismatch === -1) {
          firstMismatch = i;
          console.log(
            `First BG3D mismatch at byte ${i}: original=${origByte}, roundtrip=${roundByte}`,
          );
        }
      }
    }

    const bg3dAccuracy = 1 - bg3dMismatches / Math.max(originalBg3dArray.length, 1);
    console.log(
      `BG3D accuracy: ${(bg3dAccuracy * 100).toFixed(
        6,
      )}% (${bg3dMismatches} mismatches out of ${
        originalBg3dArray.length
      } bytes)`,
    );

    // Step 6: Structural comparison for skeleton
    const originalSkeletonArray = new Uint8Array(originalSkeletonData);
    const roundtripSkeletonArray = new Uint8Array(roundtripSkeletonBinary);

    let skeletonMismatches = 0;
    let firstSkeletonMismatch = -1;

    for (let i = 0; i < originalSkeletonArray.length; i++) {
      const origByte = originalSkeletonArray[i];
      const roundByte = roundtripSkeletonArray[i];
      if (origByte !== undefined && roundByte !== undefined && origByte !== roundByte) {
        skeletonMismatches++;
        if (firstSkeletonMismatch === -1) {
          firstSkeletonMismatch = i;
          console.log(
            `First skeleton mismatch at byte ${i}: original=${origByte}, roundtrip=${roundByte}`,
          );
        }
      }
    }

    const skeletonAccuracy =
      1 - skeletonMismatches / Math.max(originalSkeletonArray.length, 1);
    console.log(
      `Skeleton accuracy: ${(skeletonAccuracy * 100).toFixed(
        6,
      )}% (${skeletonMismatches} mismatches out of ${
        originalSkeletonArray.length
      } bytes)`,
    );

    // Step 7: Assert semantic reconstruction.
    expect(roundtripBg3d.skeleton?.bones.length).toBe(
      originalBg3d.skeleton?.bones.length,
    );
    expect(roundtripBg3d.skeleton?.animations.length).toBe(
      originalBg3d.skeleton?.animations.length,
    );
    expect(roundtripBg3d.skeleton?.bones.map((bone) => bone.name)).toEqual(
      originalBg3d.skeleton?.bones.map((bone) => bone.name),
    );
    expect(
      roundtripBg3d.skeleton?.animations.map((anim) => anim.name),
    ).toEqual(originalBg3d.skeleton?.animations.map((anim) => anim.name));
    expect(
      roundtripBg3d.skeleton?.animations.map((anim) => anim.numAnimEvents),
    ).toEqual(
      originalBg3d.skeleton?.animations.map((anim) => anim.numAnimEvents),
    );

    console.log("🎉 Semantic roundtrip validation achieved without preserved binaries.");
  });
});
