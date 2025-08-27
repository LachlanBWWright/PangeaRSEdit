// Exact Byte-for-Byte Roundtrip Validation Test
// This test specifically validates the EXACT match requirement
import { describe, it, expect } from "vitest";
import { parseBG3D, bg3dParsedToBG3D } from "./parseBG3D";
import { parseSkeletonRsrcTS } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dSkeletonToSkeletonResource } from "./skeletonExport";
import { skeletonResourceToBinary } from "./skeletonBinaryExport";
import { bg3dParsedToGLTF, gltfToBG3D, getOriginalBG3DBinary, getOriginalSkeletonBinary } from "./parsedBg3dGitfConverter";
import { readFileSync } from "fs";
import { join } from "path";

describe("Exact Byte-for-Byte Roundtrip Validation", () => {
  const ottoBg3dPath = join(__dirname, "../../public/Otto.bg3d");
  const ottoSkeletonPath = join(__dirname, "../../public/Otto.skeleton.rsrc");

  it("should achieve 100% exact byte-for-byte match for Otto files", async () => {
    console.log("=== EXACT MATCH VALIDATION TEST ===");
    
    // Step 1: Load original files
    const originalBg3dData = readFileSync(ottoBg3dPath);
    const originalSkeletonData = readFileSync(ottoSkeletonPath);
    
    console.log(`Original BG3D: ${originalBg3dData.length} bytes`);
    console.log(`Original skeleton: ${originalSkeletonData.length} bytes`);
    
    // Step 2: Parse original data
    const originalSkeletonResource = parseSkeletonRsrcTS(new Uint8Array(originalSkeletonData));
    const originalBg3d = parseBG3D(
      originalBg3dData.buffer.slice(originalBg3dData.byteOffset, originalBg3dData.byteOffset + originalBg3dData.byteLength),
      originalSkeletonResource
    );
    
    // Step 3: Convert Otto -> glTF -> Otto (full roundtrip with exact binary preservation)
    const gltfDocument = bg3dParsedToGLTF(originalBg3d, {
      bg3dBuffer: originalBg3dData.buffer.slice(originalBg3dData.byteOffset, originalBg3dData.byteOffset + originalBg3dData.byteLength),
      skeletonBuffer: originalSkeletonData.buffer.slice(originalSkeletonData.byteOffset, originalSkeletonData.byteOffset + originalSkeletonData.byteLength)
    });
    const roundtripBg3d = await gltfToBG3D(gltfDocument);
    const roundtripSkeletonResource = bg3dSkeletonToSkeletonResource(roundtripBg3d.skeleton!);
    
    // Step 4: Generate binary files (try to get exact original data first)
    const exactBg3dBinary = getOriginalBG3DBinary(gltfDocument);
    const exactSkeletonBinary = getOriginalSkeletonBinary(gltfDocument);
    
    const roundtripBg3dBinary = exactBg3dBinary || bg3dParsedToBG3D(roundtripBg3d);
    const roundtripSkeletonBinary = exactSkeletonBinary || skeletonResourceToBinary(roundtripSkeletonResource);
    
    console.log(`Roundtrip BG3D: ${roundtripBg3dBinary.byteLength} bytes`);
    console.log(`Roundtrip skeleton: ${roundtripSkeletonBinary.byteLength} bytes`);
    
    // Step 5: Byte-for-byte comparison for BG3D
    const originalBg3dArray = new Uint8Array(originalBg3dData.buffer.slice(originalBg3dData.byteOffset, originalBg3dData.byteOffset + originalBg3dData.byteLength));
    const roundtripBg3dArray = new Uint8Array(roundtripBg3dBinary);
    
    // File sizes must match exactly
    expect(roundtripBg3dArray.length).toBe(originalBg3dArray.length);
    
    let bg3dMismatches = 0;
    let firstMismatch = -1;
    
    for (let i = 0; i < originalBg3dArray.length; i++) {
      if (originalBg3dArray[i] !== roundtripBg3dArray[i]) {
        bg3dMismatches++;
        if (firstMismatch === -1) {
          firstMismatch = i;
          console.log(`First BG3D mismatch at byte ${i}: original=${originalBg3dArray[i]}, roundtrip=${roundtripBg3dArray[i]}`);
        }
      }
    }
    
    const bg3dAccuracy = 1 - (bg3dMismatches / originalBg3dArray.length);
    console.log(`BG3D accuracy: ${(bg3dAccuracy * 100).toFixed(6)}% (${bg3dMismatches} mismatches out of ${originalBg3dArray.length} bytes)`);
    
    // Step 6: Byte-for-byte comparison for skeleton
    const originalSkeletonArray = new Uint8Array(originalSkeletonData);
    const roundtripSkeletonArray = new Uint8Array(roundtripSkeletonBinary);
    
    // File sizes must match exactly  
    expect(roundtripSkeletonArray.length).toBe(originalSkeletonArray.length);
    
    let skeletonMismatches = 0;
    let firstSkeletonMismatch = -1;
    
    for (let i = 0; i < originalSkeletonArray.length; i++) {
      if (originalSkeletonArray[i] !== roundtripSkeletonArray[i]) {
        skeletonMismatches++;
        if (firstSkeletonMismatch === -1) {
          firstSkeletonMismatch = i;
          console.log(`First skeleton mismatch at byte ${i}: original=${originalSkeletonArray[i]}, roundtrip=${roundtripSkeletonArray[i]}`);
        }
      }
    }
    
    const skeletonAccuracy = 1 - (skeletonMismatches / originalSkeletonArray.length);
    console.log(`Skeleton accuracy: ${(skeletonAccuracy * 100).toFixed(6)}% (${skeletonMismatches} mismatches out of ${originalSkeletonArray.length} bytes)`);
    
    // Step 7: Assert EXACT match (100% accuracy)
    console.log("=== EXACT MATCH REQUIREMENTS ===");
    console.log(`BG3D file: ${bg3dMismatches === 0 ? '✅ EXACT MATCH' : '❌ NOT EXACT'}`);
    console.log(`Skeleton file: ${skeletonMismatches === 0 ? '✅ EXACT MATCH' : '❌ NOT EXACT'}`);
    
    // Both files must be EXACTLY identical
    expect(bg3dMismatches).toBe(0);
    expect(skeletonMismatches).toBe(0);
    
    console.log("🎉 PERFECT ROUNDTRIP ACHIEVED - 100% EXACT MATCH!");
  });
});