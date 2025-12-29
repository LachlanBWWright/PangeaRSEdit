/**
 * Simple roundtrip check - can be run with ts-node to debug skeleton roundtrip issues
 * Usage: npx ts-node --esm src/modelParsers/simpleRoundtripCheck.ts
 */

import { readFileSync } from "fs";
import { join } from "path";
import { parseSkeletonRsrc } from "./skeletonRsrc/parseSkeletonRsrc";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { parseBG3D, bg3dParsedToBG3D } from "./parseBG3D";
import { bg3dSkeletonToSkeletonResource } from "./skeletonExport";
import { skeletonResourceToBinary } from "./skeletonBinaryExport";
import { isErr } from "../types/result";

async function main() {
  const ottoBg3dPath = join(__dirname, "../public/Otto.bg3d");
  const ottoSkeletonPath = join(__dirname, "../public/Otto.skeleton.rsrc");

  console.log("Loading files...");
  const originalBg3dData = readFileSync(ottoBg3dPath);
  const originalSkeletonData = readFileSync(ottoSkeletonPath);

  console.log(`Original BG3D: ${originalBg3dData.length} bytes`);
  console.log(`Original Skeleton: ${originalSkeletonData.length} bytes`);

  // Parse original
  const originalSkeletonResource = parseSkeletonRsrc(
    originalSkeletonData.buffer.slice(
      originalSkeletonData.byteOffset,
      originalSkeletonData.byteOffset + originalSkeletonData.byteLength,
    ),
  );
  const originalBg3dResult = parseBG3D(
    originalBg3dData.buffer.slice(
      originalBg3dData.byteOffset,
      originalBg3dData.byteOffset + originalBg3dData.byteLength,
    ),
    originalSkeletonResource,
  );

  if (isErr(originalBg3dResult)) {
    console.error("Failed to parse BG3D:", originalBg3dResult.error);
    return;
  }
  const originalBg3d = originalBg3dResult.value;

  console.log("\n=== ORIGINAL SKELETON DATA ===");
  console.log(`Bones: ${originalBg3d.skeleton?.bones.length}`);
  console.log(`Animations: ${originalBg3d.skeleton?.animations.length}`);
  console.log(
    `alisData keys: ${
      Object.keys(originalBg3d.skeleton?.alisData || {}).length
    }`,
  );
  console.log(
    `relPoints keys: ${
      Object.keys(originalBg3d.skeleton?.relPoints || {}).length
    }`,
  );

  // First roundtrip
  console.log("\n=== FIRST ROUNDTRIP ===");
  const gltf1 = await bg3dParsedToGLTF(originalBg3d);
  const roundtrip1Result = await gltfToBG3D(gltf1);

  console.log(`RT1 Bones: ${roundtrip1Result.skeleton?.bones.length}`);
  console.log(
    `RT1 Animations: ${roundtrip1Result.skeleton?.animations.length}`,
  );
  console.log(
    `RT1 alisData keys: ${
      Object.keys(roundtrip1Result.skeleton?.alisData || {}).length
    }`,
  );
  console.log(
    `RT1 relPoints keys: ${
      Object.keys(roundtrip1Result.skeleton?.relPoints || {}).length
    }`,
  );

  // Convert to skeleton resource and binary
  const roundtrip1SkeletonResource = bg3dSkeletonToSkeletonResource(
    roundtrip1Result.skeleton!,
  );
  const roundtrip1Bg3dBinary = bg3dParsedToBG3D(roundtrip1Result);
  const roundtrip1SkeletonBinary = skeletonResourceToBinary(
    roundtrip1SkeletonResource,
  );

  console.log(
    `RT1 Skeleton Binary: ${roundtrip1SkeletonBinary.byteLength} bytes`,
  );

  // Parse back and do second roundtrip
  console.log("\n=== SECOND ROUNDTRIP ===");
  const roundtrip1SkeletonResourceParsed = parseSkeletonRsrc(
    roundtrip1SkeletonBinary,
  );
  const roundtrip1Bg3dParsedResult = parseBG3D(
    roundtrip1Bg3dBinary,
    roundtrip1SkeletonResourceParsed,
  );

  if (isErr(roundtrip1Bg3dParsedResult)) {
    console.error("Failed to parse roundtrip BG3D:", roundtrip1Bg3dParsedResult.error);
    return;
  }
  const roundtrip1Bg3dParsed = roundtrip1Bg3dParsedResult.value;

  console.log(
    `Parsed RT1 Bones: ${roundtrip1Bg3dParsed.skeleton?.bones.length}`,
  );
  console.log(
    `Parsed RT1 alisData keys: ${
      Object.keys(roundtrip1Bg3dParsed.skeleton?.alisData || {}).length
    }`,
  );

  const gltf2 = await bg3dParsedToGLTF(roundtrip1Bg3dParsed);
  const roundtrip2Result = await gltfToBG3D(gltf2);

  console.log(`RT2 Bones: ${roundtrip2Result.skeleton?.bones.length}`);
  console.log(
    `RT2 alisData keys: ${
      Object.keys(roundtrip2Result.skeleton?.alisData || {}).length
    }`,
  );

  // Convert to binary
  const roundtrip2SkeletonResource = bg3dSkeletonToSkeletonResource(
    roundtrip2Result.skeleton!,
  );
  const roundtrip2SkeletonBinary = skeletonResourceToBinary(
    roundtrip2SkeletonResource,
  );

  console.log(
    `RT2 Skeleton Binary: ${roundtrip2SkeletonBinary.byteLength} bytes`,
  );

  // Compare
  console.log("\n=== COMPARISON ===");
  const rt1Array = new Uint8Array(roundtrip1SkeletonBinary);
  const rt2Array = new Uint8Array(roundtrip2SkeletonBinary);

  let mismatches = 0;
  const minLen = Math.min(rt1Array.length, rt2Array.length);
  for (let i = 0; i < minLen; i++) {
    if (rt1Array[i] !== rt2Array[i]) {
      mismatches++;
    }
  }
  mismatches += Math.abs(rt1Array.length - rt2Array.length);

  const accuracy = 1 - mismatches / Math.max(rt1Array.length, rt2Array.length);
  console.log(`Skeleton Accuracy: ${(accuracy * 100).toFixed(4)}%`);
  console.log(
    `Mismatches: ${mismatches} out of ${Math.max(
      rt1Array.length,
      rt2Array.length,
    )} bytes`,
  );

  // Show first few mismatches
  if (mismatches > 0) {
    console.log("\nFirst 10 mismatches:");
    let count = 0;
    for (let i = 0; i < minLen && count < 10; i++) {
      if (rt1Array[i] !== rt2Array[i]) {
        console.log(
          `  Byte ${i}: RT1=0x${rt1Array[i]
            ?.toString(16)
            .padStart(2, "0")} RT2=0x${rt2Array[i]
            ?.toString(16)
            .padStart(2, "0")}`,
        );
        count++;
      }
    }
  }
}

main().catch(console.error);
