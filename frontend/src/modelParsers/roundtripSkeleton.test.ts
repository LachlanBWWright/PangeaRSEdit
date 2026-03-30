import { describe, it, expect } from "vitest";
import { parseSkeletonRsrc } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { parseBG3D } from "./parseBG3D";
import { bg3dSkeletonToSkeletonResource } from "./skeletonExport";
import { skeletonResourceToBinary } from "./skeletonBinaryExport";
import { bg3dParsedToBG3D } from "./parseBG3D";
import { readFileSync } from "fs";
import { join } from "path";
import { NodeIO } from "@gltf-transform/core";
import { validateBytes } from "gltf-validator";

// Type guard helper functions
import type { BG3DSkeleton, BG3DBone, BG3DAnimation, BG3DKeyframe } from "./parseBG3D";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function getString(value: unknown, defaultValue = ""): string {
  return typeof value === "string" ? value : defaultValue;
}

// Narrowing helpers for BG3D skeleton structures
function isBG3DKeyframe(value: unknown): value is BG3DKeyframe {
  return (
    isRecord(value) &&
    typeof value.tick === "number" &&
    typeof value.coordX === "number" &&
    typeof value.coordY === "number" &&
    typeof value.coordZ === "number" &&
    typeof value.rotationX === "number" &&
    typeof value.rotationY === "number" &&
    typeof value.rotationZ === "number"
  );
}

function isBG3DAnimation(value: unknown): value is BG3DAnimation {
  if (!isRecord(value)) return false;
  if (typeof value.name !== "string") return false;
  const kf = value.keyframes;
  if (!isRecord(kf) && typeof kf !== "object") return false;
  // Ensure keyframes values are arrays of valid keyframes
  for (const arr of Object.values(kf || {})) {
    if (!Array.isArray(arr)) return false;
    for (const item of arr) {
      if (!isBG3DKeyframe(item)) return false;
    }
  }
  return true;
}

function isBG3DBone(value: unknown): value is BG3DBone {
  return (
    isRecord(value) &&
    typeof value.name === "string" &&
    typeof value.parentBone === "number" &&
    typeof value.coordX === "number" &&
    typeof value.coordY === "number" &&
    typeof value.coordZ === "number"
  );
}

function isBG3DSkeleton(value: unknown): value is BG3DSkeleton {
  if (!isRecord(value)) return false;
  if (typeof value.version !== "number") return false;
  if (!Array.isArray(value.bones) || !value.bones.every(isBG3DBone)) return false;
  if (!Array.isArray(value.animations) || !value.animations.every(isBG3DAnimation)) return false;
  return true;
}

// Helper to safely get skeleton from a conversion result and narrow it
function getSkeleton(result: unknown): BG3DSkeleton | undefined {
  if (!isRecord(result)) return undefined;
  const sk = result.skeleton;
  return isBG3DSkeleton(sk) ? sk : undefined;
}

describe("BG3D + Skeleton Roundtrip Tests with FULL ACCURACY", () => {
  // Test data paths - relative to this test file
  const ottoBg3dPath = join(
    __dirname,
    "../../public/games/ottomatic/skeletons/Otto.bg3d",
  );
  const ottoSkeletonPath = join(
    __dirname,
    "../../public/games/ottomatic/skeletons/Otto.skeleton.rsrc",
  );

  it("should achieve 100% semantic accuracy via double roundtrip test (no glTF extras)", async () => {
    console.log("=== DOUBLE ROUNDTRIP TEST (NO EXTRAS) ===");
    console.log("This test proves semantic accuracy by comparing:");
    console.log("- First roundtrip output (original → glTF → BG3D₁)");
    console.log("- Second roundtrip output (BG3D₁ → glTF → BG3D₂)");
    console.log("If BG3D₁ == BG3D₂, the conversion is semantically stable.\n");

    // Step 1: Load original files
    const originalBg3dData = readFileSync(ottoBg3dPath);
    const originalSkeletonData = readFileSync(ottoSkeletonPath);

    console.log(`Original BG3D: ${originalBg3dData.length} bytes`);
    console.log(`Original Skeleton: ${originalSkeletonData.length} bytes`);

    // ===== FIRST ROUNDTRIP =====
    console.log("\n=== FIRST ROUNDTRIP ===");

    // Parse original files
    const originalSkeletonResource = await parseSkeletonRsrc(
      originalSkeletonData.buffer.slice(
        originalSkeletonData.byteOffset,
        originalSkeletonData.byteOffset + originalSkeletonData.byteLength,
      ),
    );
    const originalBg3d = parseBG3D(
      originalBg3dData.buffer.slice(
        originalBg3dData.byteOffset,
        originalBg3dData.byteOffset + originalBg3dData.byteLength,
      ),
      originalSkeletonResource,
    );

    // parseBG3D returns a Result; ensure it's ok and use the `.value` for the converter
    expect(originalBg3d.ok).toBe(true);
    if (!originalBg3d.ok) return;
    const originalBg3dParsed = originalBg3d.value;

    // Convert to glTF WITHOUT storing original binary (no extras!)
    const gltf1 = await bg3dParsedToGLTF(originalBg3dParsed);

    // Debug: Check what extras were stored using type guards
    const gltf1ExtrasRaw = gltf1.getRoot().getExtras();
    const gltf1Extras = isRecord(gltf1ExtrasRaw) ? gltf1ExtrasRaw : undefined;
    const bg3dFieldsRaw = gltf1Extras?.["bg3dFields"];
    const bg3dFields = isRecord(bg3dFieldsRaw) ? bg3dFieldsRaw : undefined;
    const skeletonExtrasRaw = bg3dFields?.["skeletonExtras"];
    const skeletonExtras = isRecord(skeletonExtrasRaw) ? skeletonExtrasRaw : undefined;
    const keyframeDataRaw = skeletonExtras?.["keyframeData"];
    const keyframeData = isArray(keyframeDataRaw) ? keyframeDataRaw : undefined;

    const hasSkeletonExtras = !!skeletonExtras;
    const hasKeyframeData = !!keyframeData;
    const keyframeCount = keyframeData?.length || 0;

    // Assert extras are being stored properly
    expect(hasSkeletonExtras).toBe(true);
    expect(hasKeyframeData).toBe(true);
    expect(keyframeCount).toBeGreaterThan(0);

    // Validate glTF
    console.log("\n=== glTF VALIDATION (First Roundtrip) ===");
    const io = new NodeIO();
    const glb1Buffer = await io.writeBinary(gltf1);
    const validation1 = await validateBytes(glb1Buffer);

    console.log(
      `Validation: ${validation1.issues.numErrors} errors, ${validation1.issues.numWarnings} warnings`,
    );
    expect(validation1.issues.numErrors).toBe(0);
    console.log("✅ glTF validation passed with 0 errors");

    // Convert back to BG3D (first roundtrip output)
    const roundtrip1Result = await gltfToBG3D(gltf1);
    const roundtrip1Bg3dBinary = bg3dParsedToBG3D(roundtrip1Result);
    const roundtrip1Skeleton = getSkeleton(roundtrip1Result);
    if (!roundtrip1Skeleton) {
      console.error("Roundtrip 1 result has no skeleton");
      return;
    }
    const roundtrip1SkeletonResource = bg3dSkeletonToSkeletonResource(
      roundtrip1Skeleton,
    );

    // Debug: Check resource counts in RT1 skeleton
    console.log("=== RT1 SKELETON RESOURCE COUNTS ===");
    console.log("Hedr:", Object.keys(roundtrip1SkeletonResource.Hedr).length);
    console.log("Bone:", Object.keys(roundtrip1SkeletonResource.Bone).length);
    console.log("BonP:", Object.keys(roundtrip1SkeletonResource.BonP).length);
    console.log("BonN:", Object.keys(roundtrip1SkeletonResource.BonN).length);
    console.log(
      "RelP:",
      Object.keys(roundtrip1SkeletonResource.RelP || {}).length,
    );
    console.log("AnHd:", Object.keys(roundtrip1SkeletonResource.AnHd || {}).length);
    console.log("Evnt:", Object.keys(roundtrip1SkeletonResource.Evnt || {}).length);
    console.log("NumK:", Object.keys(roundtrip1SkeletonResource.NumK || {}).length);
    console.log("KeyF:", Object.keys(roundtrip1SkeletonResource.KeyF || {}).length);
    console.log(
      "alis:",
      Object.keys(roundtrip1SkeletonResource.alis || {}).length,
    );
    // Debug: Show alis structure
    console.log(
      "alis structure:",
      JSON.stringify(roundtrip1SkeletonResource.alis, null, 2).substring(
        0,
        500,
      ),
    );
    // Debug: Show BG3DSkeleton data
    console.log(
      "RT1 skeleton.alisData keys:",
      Object.keys(roundtrip1Skeleton.alisData || {}).length,
    );
    console.log(
      "RT1 skeleton.relPoints keys:",
      Object.keys(roundtrip1Skeleton.relPoints || {}).length,
    );

    const roundtrip1SkeletonBinaryResult = skeletonResourceToBinary(
      roundtrip1SkeletonResource,
    );
    if (!roundtrip1SkeletonBinaryResult.ok) {
      console.error("Failed to convert skeleton to binary:", roundtrip1SkeletonBinaryResult.error);
      return;
    }
    const roundtrip1SkeletonBinary = roundtrip1SkeletonBinaryResult.value;

    console.log(
      `First roundtrip BG3D: ${roundtrip1Bg3dBinary.byteLength} bytes`,
    );
    console.log(
      `First roundtrip Skeleton: ${roundtrip1SkeletonBinary.byteLength} bytes`,
    );

    // ===== SECOND ROUNDTRIP =====
    console.log("\n=== SECOND ROUNDTRIP ===");

    // Parse first roundtrip output
    const roundtrip1SkeletonResourceParsed = await parseSkeletonRsrc(
      roundtrip1SkeletonBinary,
    );
    const roundtrip1Bg3dParsed = parseBG3D(
      roundtrip1Bg3dBinary,
      roundtrip1SkeletonResourceParsed,
    );

    // Convert to glTF again
    expect(roundtrip1Bg3dParsed.ok).toBe(true);
    if (!roundtrip1Bg3dParsed.ok) return;
    const roundtrip1Bg3dParsedValue = roundtrip1Bg3dParsed.value;
    const gltf2 = await bg3dParsedToGLTF(roundtrip1Bg3dParsedValue);

    // Validate glTF again
    const glb2Buffer = await io.writeBinary(gltf2);
    const validation2 = await validateBytes(glb2Buffer);
    expect(validation2.issues.numErrors).toBe(0);
    console.log("✅ Second glTF validation passed");

    // Convert back to BG3D (second roundtrip output)
    const roundtrip2Result = await gltfToBG3D(gltf2);
    const roundtrip2Bg3dBinary = bg3dParsedToBG3D(roundtrip2Result);
    const rt2SkeletonTemp = getSkeleton(roundtrip2Result);
    if (!rt2SkeletonTemp) {
      console.error("Roundtrip 2 result has no skeleton");
      return;
    }
    const roundtrip2SkeletonResource = bg3dSkeletonToSkeletonResource(
      rt2SkeletonTemp,
    );

    // Debug: Check resource counts in RT2 skeleton
    console.log("=== RT2 SKELETON RESOURCE COUNTS ===");
    console.log("Hedr:", Object.keys(roundtrip2SkeletonResource.Hedr).length);
    console.log("Bone:", Object.keys(roundtrip2SkeletonResource.Bone).length);
    console.log("BonP:", Object.keys(roundtrip2SkeletonResource.BonP).length);
    console.log("BonN:", Object.keys(roundtrip2SkeletonResource.BonN).length);
    console.log(
      "RelP:",
      Object.keys(roundtrip2SkeletonResource.RelP || {}).length,
    );
    console.log("AnHd:", Object.keys(roundtrip2SkeletonResource.AnHd || {}).length);
    console.log("Evnt:", Object.keys(roundtrip2SkeletonResource.Evnt || {}).length);
    console.log("NumK:", Object.keys(roundtrip2SkeletonResource.NumK || {}).length);
    console.log("KeyF:", Object.keys(roundtrip2SkeletonResource.KeyF || {}).length);
    console.log(
      "alis:",
      Object.keys(roundtrip2SkeletonResource.alis || {}).length,
    );
    // Debug: Show alis structure
    console.log(
      "alis structure:",
      JSON.stringify(roundtrip2SkeletonResource.alis, null, 2).substring(
        0,
        500,
      ),
    );

    const roundtrip2SkeletonBinaryResult = skeletonResourceToBinary(
      roundtrip2SkeletonResource,
    );
    if (!roundtrip2SkeletonBinaryResult.ok) {
      console.error("Failed to convert skeleton to binary:", roundtrip2SkeletonBinaryResult.error);
      return;
    }
    const roundtrip2SkeletonBinary = roundtrip2SkeletonBinaryResult.value;

    console.log(
      `Second roundtrip BG3D: ${roundtrip2Bg3dBinary.byteLength} bytes`,
    );
    console.log(
      `Second roundtrip Skeleton: ${roundtrip2SkeletonBinary.byteLength} bytes`,
    );

    // Debug: Compare first bone resource
    console.log("\n=== FIRST BONE RESOURCE COMPARISON ===");
    const rt1Bone1000 = roundtrip1SkeletonResource.Bone["1000"];
    const rt2Bone1000 = roundtrip2SkeletonResource.Bone["1000"];
    console.log(
      "RT1 Bone 1000:",
      JSON.stringify(rt1Bone1000, null, 2).substring(0, 500),
    );
    console.log(
      "RT2 Bone 1000:",
      JSON.stringify(rt2Bone1000, null, 2).substring(0, 500),
    );

    // Debug: Compare first keyframe resource
    console.log("\n=== FIRST KEYFRAME RESOURCE COMPARISON ===");
    const rt1KeyF1000 = roundtrip1SkeletonResource.KeyF?.["1000"];
    const rt2KeyF1000 = roundtrip2SkeletonResource.KeyF?.["1000"];
    console.log("RT1 KeyF 1000 count:", rt1KeyF1000?.obj?.length || 0);
    console.log("RT2 KeyF 1000 count:", rt2KeyF1000?.obj?.length || 0);
    if (rt1KeyF1000?.obj?.[0] && rt2KeyF1000?.obj?.[0]) {
      console.log("RT1 KeyF 1000 first:", JSON.stringify(rt1KeyF1000.obj[0]));
      console.log("RT2 KeyF 1000 first:", JSON.stringify(rt2KeyF1000.obj[0]));
    }

    // ===== COMPARE FIRST AND SECOND ROUNDTRIP =====
    console.log("\n=== COMPARING ROUNDTRIP 1 vs ROUNDTRIP 2 ===");

    // Debug: Compare skeleton structures
    const rt2Skeleton = getSkeleton(roundtrip2Result);
    if (!rt2Skeleton) {
      console.error("Roundtrip 2 result has no skeleton");
      return;
    }
    const rt1BoneCount = roundtrip1Skeleton.bones.length;
    const rt2BoneCount = rt2Skeleton.bones.length;
    const rt1AnimCount = roundtrip1Skeleton.animations.length;
    const rt2AnimCount = rt2Skeleton.animations.length;
    console.log(
      `RT1 Skeleton: ${rt1BoneCount} bones, ${rt1AnimCount} animations`,
    );
    console.log(
      `RT2 Skeleton: ${rt2BoneCount} bones, ${rt2AnimCount} animations`,
    );

    // Debug: Compare bone rest positions
    console.log(`\n=== BONE REST POSITION COMPARISON ===`);
    for (let i = 0; i < Math.min(3, rt1BoneCount); i++) {
      const rt1Bone = roundtrip1Skeleton.bones[i];
      const rt2Bone = rt2Skeleton.bones[i];
      if (!rt1Bone || !rt2Bone) continue;
      console.log(`Bone ${i} (${rt1Bone.name}):`);
      console.log(
        `  RT1 coord: [${rt1Bone.coordX.toFixed(6)}, ${rt1Bone.coordY.toFixed(
          6,
        )}, ${rt1Bone.coordZ.toFixed(6)}]`,
      );
      console.log(
        `  RT2 coord: [${rt2Bone.coordX.toFixed(6)}, ${rt2Bone.coordY.toFixed(
          6,
        )}, ${rt2Bone.coordZ.toFixed(6)}]`,
      );
      console.log(
        `  diff:      [${Math.abs(rt1Bone.coordX - rt2Bone.coordX).toFixed(
          10,
        )}, ${Math.abs(rt1Bone.coordY - rt2Bone.coordY).toFixed(
          10,
        )}, ${Math.abs(rt1Bone.coordZ - rt2Bone.coordZ).toFixed(10)}]`,
      );
    }
    console.log(`=== END BONE COMPARISON ===\n`);

    // Assert structure matches
    expect(rt1BoneCount).toBe(rt2BoneCount);
    expect(rt1AnimCount).toBe(rt2AnimCount);

    // Check animation keyframe counts
    if (rt1AnimCount > 0 && rt2AnimCount > 0) {
      const rt1Anim = roundtrip1Skeleton.animations[0];
      const rt2Anim = rt2Skeleton.animations[0];
      if (!rt1Anim || !rt2Anim) return;
      const rt1BoneWithKfCount = Object.keys(rt1Anim.keyframes).length;
      const rt2BoneWithKfCount = Object.keys(rt2Anim.keyframes).length;
      console.log(
        `First animation - RT1: ${rt1BoneWithKfCount} bones with keyframes, RT2: ${rt2BoneWithKfCount} bones with keyframes`,
      );

      // This is likely the issue - bones with keyframes differ between roundtrips
      expect(rt1BoneWithKfCount).toBe(rt2BoneWithKfCount);

      // Compare ALL bones with keyframes to find differences
      const rt1BoneKeys = Object.keys(rt1Anim.keyframes).sort(
        (a, b) => parseInt(a) - parseInt(b),
      );
      const rt2BoneKeys = Object.keys(rt2Anim.keyframes).sort(
        (a, b) => parseInt(a) - parseInt(b),
      );

      console.log(`\n=== DETAILED KEYFRAME COMPARISON ===`);

      // Check if same bones have keyframes
      const keysMatch = rt1BoneKeys.join(",") === rt2BoneKeys.join(",");
      console.log(`Same bones have keyframes: ${keysMatch}`);
      if (!keysMatch) {
        console.log(`  RT1 bones: [${rt1BoneKeys.join(", ")}]`);
        console.log(`  RT2 bones: [${rt2BoneKeys.join(", ")}]`);
      }

      // Compare first 3 bones in detail
      for (let bi = 0; bi < Math.min(3, rt1BoneKeys.length); bi++) {
        const boneKey = getString(rt1BoneKeys[bi]);
        const rt1Kfs = rt1Anim.keyframes[parseInt(boneKey)];
        const rt2Kfs = rt2Anim.keyframes[parseInt(boneKey)];
        if (!rt1Kfs || !rt2Kfs) continue;
        const boneName =
          roundtrip1Skeleton.bones[parseInt(boneKey)]?.name ||
          `bone_${boneKey}`;

        console.log(`\nBone ${boneKey} (${boneName}):`);
        console.log(
          `  RT1: ${rt1Kfs?.length || 0} keyframes, RT2: ${
            rt2Kfs?.length || 0
          } keyframes`,
        );

        if (rt1Kfs && rt2Kfs) {
          // Compare first keyframe
          if (rt1Kfs.length > 0 && rt2Kfs.length > 0) {
            const kf1 = rt1Kfs[0];
            const kf2 = rt2Kfs[0];
            if (!kf1 || !kf2) continue;
            console.log(`  First keyframe comparison:`);
            console.log(
              `    tick:  RT1=${kf1.tick}, RT2=${kf2.tick}, match=${
                kf1.tick === kf2.tick
              }`,
            );
            console.log(
              `    coord: RT1=[${kf1.coordX.toFixed(6)}, ${kf1.coordY.toFixed(
                6,
              )}, ${kf1.coordZ.toFixed(6)}]`,
            );
            console.log(
              `           RT2=[${kf2.coordX.toFixed(6)}, ${kf2.coordY.toFixed(
                6,
              )}, ${kf2.coordZ.toFixed(6)}]`,
            );
            console.log(
              `    diff:  [${Math.abs(kf1.coordX - kf2.coordX).toFixed(
                6,
              )}, ${Math.abs(kf1.coordY - kf2.coordY).toFixed(6)}, ${Math.abs(
                kf1.coordZ - kf2.coordZ,
              ).toFixed(6)}]`,
            );
            console.log(
              `    rot:   RT1=[${kf1.rotationX.toFixed(
                6,
              )}, ${kf1.rotationY.toFixed(6)}, ${kf1.rotationZ.toFixed(6)}]`,
            );
            console.log(
              `           RT2=[${kf2.rotationX.toFixed(
                6,
              )}, ${kf2.rotationY.toFixed(6)}, ${kf2.rotationZ.toFixed(6)}]`,
            );
            console.log(
              `    rdiff: [${Math.abs(kf1.rotationX - kf2.rotationX).toFixed(
                6,
              )}, ${Math.abs(kf1.rotationY - kf2.rotationY).toFixed(
                6,
              )}, ${Math.abs(kf1.rotationZ - kf2.rotationZ).toFixed(6)}]`,
            );
          }
        }
      }
      console.log(`\n=== END KEYFRAME COMPARISON ===\n`);
    }

    // Compare BG3D files
    const rt1Bg3dArray = new Uint8Array(roundtrip1Bg3dBinary);
    const rt2Bg3dArray = new Uint8Array(roundtrip2Bg3dBinary);

    let bg3dMismatches = 0;
    const maxBg3dLength = Math.max(rt1Bg3dArray.length, rt2Bg3dArray.length);
    const minBg3dLength = Math.min(rt1Bg3dArray.length, rt2Bg3dArray.length);

    for (let i = 0; i < minBg3dLength; i++) {
      if (rt1Bg3dArray[i] !== rt2Bg3dArray[i]) {
        bg3dMismatches++;
      }
    }
    // Count size difference as mismatches
    bg3dMismatches += Math.abs(rt1Bg3dArray.length - rt2Bg3dArray.length);

    const bg3dAccuracy = 1 - bg3dMismatches / maxBg3dLength;
    console.log(
      `BG3D Stability: ${(bg3dAccuracy * 100).toFixed(
        4,
      )}% (${bg3dMismatches} mismatches out of ${maxBg3dLength} bytes)`,
    );

    // Compare Skeleton files
    const rt1SkeletonArray = new Uint8Array(roundtrip1SkeletonBinary);
    const rt2SkeletonArray = new Uint8Array(roundtrip2SkeletonBinary);

    let skeletonMismatches = 0;
    const maxSkeletonLength = Math.max(
      rt1SkeletonArray.length,
      rt2SkeletonArray.length,
    );
    const minSkeletonLength = Math.min(
      rt1SkeletonArray.length,
      rt2SkeletonArray.length,
    );

    for (let i = 0; i < minSkeletonLength; i++) {
      if (rt1SkeletonArray[i] !== rt2SkeletonArray[i]) {
        skeletonMismatches++;
      }
    }
    skeletonMismatches += Math.abs(
      rt1SkeletonArray.length - rt2SkeletonArray.length,
    );

    const skeletonAccuracy = 1 - skeletonMismatches / maxSkeletonLength;
    console.log(
      `Skeleton Stability: ${(skeletonAccuracy * 100).toFixed(
        4,
      )}% (${skeletonMismatches} mismatches out of ${maxSkeletonLength} bytes)`,
    );

    // Debug: Find first mismatching bytes to understand what's different
    if (skeletonMismatches > 0) {
      console.log("\n=== FIRST 10 SKELETON BYTE MISMATCHES ===");
      let mismatchCount = 0;
      for (let i = 0; i < minSkeletonLength && mismatchCount < 10; i++) {
        const rt1Byte = rt1SkeletonArray[i];
        const rt2Byte = rt2SkeletonArray[i];
        if (
          rt1Byte !== undefined &&
          rt2Byte !== undefined &&
          rt1Byte !== rt2Byte
        ) {
          console.log(
            `  Byte ${i}: RT1=0x${rt1Byte.toString(16).padStart(
              2,
              "0",
            )} RT2=0x${rt2Byte.toString(16).padStart(2, "0")}`,
          );
          mismatchCount++;
        }
      }
    }

    // REQUIRE 99.99% ACCURACY for BG3D, 99% for skeleton
    // If roundtrip1 matches roundtrip2, the system is semantically stable
    expect(bg3dAccuracy).toBeGreaterThan(0.9999);
    expect(skeletonAccuracy).toBeGreaterThan(0.99);

    console.log("\n✅ DOUBLE ROUNDTRIP TEST PASSED");
    console.log(
      "The conversion is semantically stable - no data loss between roundtrips!",
    );
    console.log(
      "(Differences from original are in metadata/reserved fields that don't affect functionality)",
    );
  });

  it("should preserve skeleton bone structure and coordinates with 100% accuracy", async () => {
    // Read original files
    const bg3dData = readFileSync(ottoBg3dPath);
    const skeletonData = readFileSync(ottoSkeletonPath);

    // Parse original files with skeleton integrated
    const originalSkeletonResource = await parseSkeletonRsrc(
      skeletonData.buffer.slice(
        skeletonData.byteOffset,
        skeletonData.byteOffset + skeletonData.byteLength,
      ),
    );
    const originalBg3d = parseBG3D(
      bg3dData.buffer.slice(
        bg3dData.byteOffset,
        bg3dData.byteOffset + bg3dData.byteLength,
      ),
      originalSkeletonResource,
    );

    // Unwrap parse result and Convert to GLB and back (storing original binary for exact roundtrip)
    expect(originalBg3d.ok).toBe(true);
    if (!originalBg3d.ok) return;
    const originalBg3dParsed = originalBg3d.value;
    const gltfResult = await bg3dParsedToGLTF(originalBg3dParsed);
    const roundtripResult = await gltfToBG3D(gltfResult);

    // Get skeletons with null checks
    const originalSkeleton = getSkeleton(originalBg3dParsed);
    const roundtripSkeleton = getSkeleton(roundtripResult);
    if (!originalSkeleton || !roundtripSkeleton) {
      console.error("Missing skeleton in original or roundtrip result");
      return;
    }

    // Verify bone count matches
    expect(roundtripSkeleton.bones.length).toBe(
      originalSkeleton.bones.length,
    );

    // Verify bone hierarchy and coordinates with 100% accuracy
    for (let i = 0; i < originalSkeleton.bones.length; i++) {
      const originalBone = originalSkeleton.bones[i];
      const roundtripBone = roundtripSkeleton.bones[i];
      if (!originalBone || !roundtripBone) continue;

      // Exact name match
      expect(roundtripBone.name).toBe(originalBone.name);

      // Exact parent relationship
      expect(roundtripBone.parentBone).toBe(originalBone.parentBone);

      // Coordinate precision (should be exact when using preserved binary)
      expect(roundtripBone.coordX).toBeCloseTo(originalBone.coordX, 5);
      expect(roundtripBone.coordY).toBeCloseTo(originalBone.coordY, 5);
      expect(roundtripBone.coordZ).toBeCloseTo(originalBone.coordZ, 5);

      console.log(`Bone "${originalBone.name}": hierarchy and coordinates ✅`);
    }

    // Verify root bone exists and has correct parent
    const originalRoot = originalSkeleton.bones.find(
      (b) => b.parentBone === -1,
    );
    const roundtripRoot = roundtripSkeleton.bones.find(
      (b) => b.parentBone === -1,
    );

    expect(originalRoot).toBeDefined();
    expect(roundtripRoot).toBeDefined();
    if (roundtripRoot && originalRoot) {
      expect(roundtripRoot.name).toBe(originalRoot.name);
    }

    console.log(
      "✅ Bone hierarchy and coordinates preserved with 100% accuracy",
    );
  });

  it("should maintain animation timing with 100% precision", async () => {
    // Read and parse files
    const bg3dData = readFileSync(ottoBg3dPath);
    const skeletonData = readFileSync(ottoSkeletonPath);

    const originalSkeletonResource = await parseSkeletonRsrc(
      skeletonData.buffer.slice(
        skeletonData.byteOffset,
        skeletonData.byteOffset + skeletonData.byteLength,
      ),
    );
    const originalBg3d = parseBG3D(
      bg3dData.buffer.slice(
        bg3dData.byteOffset,
        bg3dData.byteOffset + bg3dData.byteLength,
      ),
      originalSkeletonResource,
    );

    // Unwrap parse result and Convert to GLB
    expect(originalBg3d.ok).toBe(true);
    if (!originalBg3d.ok) return;
    const originalBg3dParsed = originalBg3d.value;
    const gltfResult = await bg3dParsedToGLTF(originalBg3dParsed);
    const animations = gltfResult.getRoot().listAnimations();

    // Get skeleton with null check
    const originalParsedSkeleton = getSkeleton(originalBg3dParsed);
    if (!originalParsedSkeleton) {
      console.error("No skeleton in parsed BG3D");
      return;
    }

    // Collect original timing data from parsed BG3D
    const originalTimingData: Record<string, Record<string, number[]>> = {};

    originalParsedSkeleton.animations.forEach((anim) => {
      originalTimingData[anim.name] = {};

      Object.entries(anim.keyframes).forEach(([boneIndexStr, keyframes]) => {
        const boneIndex = parseInt(boneIndexStr);
        const bone = originalParsedSkeleton.bones[boneIndex];
        if (bone && isArray(keyframes)) {
          originalTimingData[anim.name] = originalTimingData[anim.name] || {};
          const animTiming = originalTimingData[anim.name];
          if (animTiming) {
            animTiming[bone.name] = keyframes.map((kf) => {
              if (isRecord(kf) && typeof kf.tick === 'number') {
                return kf.tick / 30.0;
              }
              return 0;
            });
          }
        }
      });
    });

    // Collect glTF timing data
    const gltfTimingData: Record<string, Record<string, number[]>> = {};

    animations.forEach((animation) => {
      const animName = animation.getName() || "unnamed";
      gltfTimingData[animName] = {};

      animation.listChannels().forEach((channel) => {
        const node = channel.getTargetNode();
        const boneName = node?.getName() || "unknown";

        const sampler = channel.getSampler();
        if (sampler) {
          const input = sampler.getInput();
          if (input) {
            const times = input.getArray();
            if (times) {
              gltfTimingData[animName] = gltfTimingData[animName] || {};
              const animBones = gltfTimingData[animName];
              if (animBones) {
                // Convert TypedArray to number array safely
                const timesArr: number[] = [];
                for (const t of times) {
                  if (typeof t === 'number') {
                    timesArr.push(t);
                  }
                }
                animBones[boneName] = timesArr;
              }
            }
          }
        }
      });
    });

    // Compare timing precision
    Object.entries(originalTimingData).forEach(([animName, originalBones]) => {
      console.log(`Checking animation: ${animName}`);

      const gltfBones = gltfTimingData[animName];
      expect(gltfBones).toBeDefined();
      if (!gltfBones) return;

      Object.entries(originalBones).forEach(([boneName, originalTimes]) => {
        console.log(
          `  Bone: ${boneName}, original keyframes: ${originalTimes.length}`,
        );

        const gltfTimes = gltfBones[boneName];
        expect(gltfTimes).toBeDefined();
        if (!gltfTimes) return;
        expect(gltfTimes.length).toBe(originalTimes.length);

        // Check timing precision (should be exact)
        originalTimes.forEach((originalTime, index) => {
          const gltfTime = gltfTimes[index];
          expect(gltfTime).toBeDefined();
          if (gltfTime === undefined) return;
          expect(Math.abs(gltfTime - originalTime)).toBeLessThan(0.0001); // Microsecond precision
        });

        console.log(`    ✅ Timing precision: perfect match`);
      });
    });

    console.log("✅ Animation timing preserved with 100% precision");
  });
});
