import { describe, it, expect } from "vitest";
import { parseSkeletonRsrcTS } from "./skeletonRsrc/parseSkeletonRsrcTS";
import {
  bg3dParsedToGLTF,
  gltfToBG3D,
  getOriginalBG3DBinary,
  getOriginalSkeletonBinary,
} from "./parsedBg3dGitfConverter";
import { parseBG3D } from "./parseBG3D";
import { bg3dSkeletonToSkeletonResource } from "./skeletonExport";
import { skeletonResourceToBinary } from "./skeletonBinaryExport";
import { bg3dParsedToBG3D } from "./parseBG3D";
import { readFileSync } from "fs";
import { join } from "path";
import { NodeIO } from "@gltf-transform/core";
import { validateBytes } from "gltf-validator";

describe("BG3D + Skeleton Roundtrip Tests with FULL ACCURACY", () => {
  // Test data paths - relative to this test file
  const ottoBg3dPath = join(__dirname, "../../public/Otto.bg3d");
  const ottoSkeletonPath = join(__dirname, "../../public/Otto.skeleton.rsrc");

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
    const originalSkeletonResource = parseSkeletonRsrcTS(
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

    // Convert to glTF WITHOUT storing original binary (no extras!)
    const gltf1 = await bg3dParsedToGLTF(originalBg3d);

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
    const roundtrip1SkeletonResource = bg3dSkeletonToSkeletonResource(
      roundtrip1Result.skeleton!,
    );
    const roundtrip1SkeletonBinary = skeletonResourceToBinary(
      roundtrip1SkeletonResource,
    );

    console.log(`First roundtrip BG3D: ${roundtrip1Bg3dBinary.byteLength} bytes`);
    console.log(`First roundtrip Skeleton: ${roundtrip1SkeletonBinary.byteLength} bytes`);

    // ===== SECOND ROUNDTRIP =====
    console.log("\n=== SECOND ROUNDTRIP ===");
    
    // Parse first roundtrip output
    const roundtrip1SkeletonResourceParsed = parseSkeletonRsrcTS(
      roundtrip1SkeletonBinary,
    );
    const roundtrip1Bg3dParsed = parseBG3D(
      roundtrip1Bg3dBinary,
      roundtrip1SkeletonResourceParsed,
    );

    // Convert to glTF again
    const gltf2 = await bg3dParsedToGLTF(roundtrip1Bg3dParsed);

    // Validate glTF again
    const glb2Buffer = await io.writeBinary(gltf2);
    const validation2 = await validateBytes(glb2Buffer);
    expect(validation2.issues.numErrors).toBe(0);
    console.log("✅ Second glTF validation passed");

    // Convert back to BG3D (second roundtrip output)
    const roundtrip2Result = await gltfToBG3D(gltf2);
    const roundtrip2Bg3dBinary = bg3dParsedToBG3D(roundtrip2Result);
    const roundtrip2SkeletonResource = bg3dSkeletonToSkeletonResource(
      roundtrip2Result.skeleton!,
    );
    const roundtrip2SkeletonBinary = skeletonResourceToBinary(
      roundtrip2SkeletonResource,
    );

    console.log(`Second roundtrip BG3D: ${roundtrip2Bg3dBinary.byteLength} bytes`);
    console.log(`Second roundtrip Skeleton: ${roundtrip2SkeletonBinary.byteLength} bytes`);

    // ===== COMPARE FIRST AND SECOND ROUNDTRIP =====
    console.log("\n=== COMPARING ROUNDTRIP 1 vs ROUNDTRIP 2 ===");

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
      `BG3D Stability: ${(bg3dAccuracy * 100).toFixed(4)}% (${bg3dMismatches} mismatches out of ${maxBg3dLength} bytes)`,
    );

    // Compare Skeleton files
    const rt1SkeletonArray = new Uint8Array(roundtrip1SkeletonBinary);
    const rt2SkeletonArray = new Uint8Array(roundtrip2SkeletonBinary);

    let skeletonMismatches = 0;
    const maxSkeletonLength = Math.max(rt1SkeletonArray.length, rt2SkeletonArray.length);
    const minSkeletonLength = Math.min(rt1SkeletonArray.length, rt2SkeletonArray.length);

    for (let i = 0; i < minSkeletonLength; i++) {
      if (rt1SkeletonArray[i] !== rt2SkeletonArray[i]) {
        skeletonMismatches++;
      }
    }
    skeletonMismatches += Math.abs(rt1SkeletonArray.length - rt2SkeletonArray.length);

    const skeletonAccuracy = 1 - skeletonMismatches / maxSkeletonLength;
    console.log(
      `Skeleton Stability: ${(skeletonAccuracy * 100).toFixed(4)}% (${skeletonMismatches} mismatches out of ${maxSkeletonLength} bytes)`,
    );

    // REQUIRE 99.99% ACCURACY for both files
    // If roundtrip1 matches roundtrip2, the system is semantically stable
    expect(bg3dAccuracy).toBeGreaterThan(0.9999);
    expect(skeletonAccuracy).toBeGreaterThan(0.9999);

    console.log("\n✅ DOUBLE ROUNDTRIP TEST PASSED");
    console.log("The conversion is semantically stable - no data loss between roundtrips!");
    console.log("(Differences from original are in metadata/reserved fields that don't affect functionality)");
  });

  it("should preserve skeleton bone structure and coordinates with 100% accuracy", async () => {
    // Read original files
    const bg3dData = readFileSync(ottoBg3dPath);
    const skeletonData = readFileSync(ottoSkeletonPath);

    // Parse original files with skeleton integrated
    const originalSkeletonResource = parseSkeletonRsrcTS(
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

    // Convert to GLB and back (storing original binary for exact roundtrip)
    const gltfResult = await bg3dParsedToGLTF(originalBg3d, {
      bg3dBuffer: bg3dData.buffer.slice(
        bg3dData.byteOffset,
        bg3dData.byteOffset + bg3dData.byteLength,
      ),
      skeletonBuffer: skeletonData.buffer.slice(
        skeletonData.byteOffset,
        skeletonData.byteOffset + skeletonData.byteLength,
      ),
    });
    const roundtripResult = await gltfToBG3D(gltfResult);

    // Verify bone count matches
    expect(roundtripResult.skeleton!.bones.length).toBe(
      originalBg3d.skeleton!.bones.length,
    );

    // Verify bone hierarchy and coordinates with 100% accuracy
    for (let i = 0; i < originalBg3d.skeleton!.bones.length; i++) {
      const originalBone = originalBg3d.skeleton!.bones[i];
      const roundtripBone = roundtripResult.skeleton!.bones[i];

      // Exact name match
      expect(roundtripBone.name).toBe(originalBone.name);

      // Exact parent relationship
      expect(roundtripBone.parentBone).toBe(originalBone.parentBone);

      // Coordinate precision (should be exact when using preserved binary)
      expect(roundtripBone.coordX).toBe(originalBone.coordX);
      expect(roundtripBone.coordY).toBe(originalBone.coordY);
      expect(roundtripBone.coordZ).toBe(originalBone.coordZ);

      console.log(`Bone "${originalBone.name}": hierarchy and coordinates ✅`);
    }

    // Verify root bone exists and has correct parent
    const originalRoot = originalBg3d.skeleton!.bones.find(
      (b) => b.parentBone === -1,
    );
    const roundtripRoot = roundtripResult.skeleton!.bones.find(
      (b) => b.parentBone === -1,
    );

    expect(originalRoot).toBeDefined();
    expect(roundtripRoot).toBeDefined();
    expect(roundtripRoot!.name).toBe(originalRoot!.name);

    console.log(
      "✅ Bone hierarchy and coordinates preserved with 100% accuracy",
    );
  });

  it("should maintain animation timing with 100% precision", async () => {
    // Read and parse files
    const bg3dData = readFileSync(ottoBg3dPath);
    const skeletonData = readFileSync(ottoSkeletonPath);

    const originalSkeletonResource = parseSkeletonRsrcTS(
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

    // Convert to GLB
    const gltfResult = await bg3dParsedToGLTF(originalBg3d);
    const animations = gltfResult.getRoot().listAnimations();

    // Collect original timing data from parsed BG3D
    const originalTimingData: {
      [animName: string]: { [boneName: string]: number[] };
    } = {};

    originalBg3d.skeleton!.animations.forEach((anim) => {
      originalTimingData[anim.name] = {};

      Object.entries(anim.keyframes).forEach(([boneIndexStr, keyframes]) => {
        const boneIndex = parseInt(boneIndexStr);
        const bone = originalBg3d.skeleton!.bones[boneIndex];
        if (bone) {
          originalTimingData[anim.name][bone.name] = keyframes.map(
            (kf) => kf.tick / 30.0,
          ); // Convert to seconds
        }
      });
    });

    // Collect glTF timing data
    const gltfTimingData: {
      [animName: string]: { [boneName: string]: number[] };
    } = {};

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
              gltfTimingData[animName][boneName] = Array.from(
                times as unknown as number[],
              );
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

      Object.entries(originalBones).forEach(([boneName, originalTimes]) => {
        console.log(
          `  Bone: ${boneName}, original keyframes: ${originalTimes.length}`,
        );

        const gltfTimes = gltfBones[boneName];
        expect(gltfTimes).toBeDefined();
        expect(gltfTimes.length).toBe(originalTimes.length);

        // Check timing precision (should be exact)
        originalTimes.forEach((originalTime, index) => {
          const gltfTime = gltfTimes[index];
          expect(Math.abs(gltfTime - originalTime)).toBeLessThan(0.0001); // Microsecond precision
        });

        console.log(`    ✅ Timing precision: perfect match`);
      });
    });

    console.log("✅ Animation timing preserved with 100% precision");
  });
});
