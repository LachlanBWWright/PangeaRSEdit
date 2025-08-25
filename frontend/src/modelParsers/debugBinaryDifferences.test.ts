// Debug Binary Differences Test
// This test helps identify exactly where the binary differences are occurring
import { describe, it, expect } from "vitest";
import { parseBG3D, bg3dParsedToBG3D } from "./parseBG3D";
import { parseSkeletonRsrcTS } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dSkeletonToSkeletonResource } from "./skeletonExport";
import { skeletonResourceToBinary } from "./skeletonBinaryExport";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { readFileSync } from "fs";
import { join } from "path";

describe("Debug Binary Differences", () => {
  const ottoBg3dPath = join(__dirname, "../../public/Otto.bg3d");
  const ottoSkeletonPath = join(__dirname, "../../public/Otto.skeleton.rsrc");

  it("should debug exact differences in BG3D file", async () => {
    console.log("=== BG3D BINARY DIFFERENCE ANALYSIS ===");
    
    // Step 1: Load original files
    const originalBg3dData = readFileSync(ottoBg3dPath);
    const originalSkeletonData = readFileSync(ottoSkeletonPath);
    
    // Step 2: Parse original data
    const originalSkeletonResource = parseSkeletonRsrcTS(new Uint8Array(originalSkeletonData));
    const originalBg3d = parseBG3D(
      originalBg3dData.buffer.slice(originalBg3dData.byteOffset, originalBg3dData.byteOffset + originalBg3dData.byteLength),
      originalSkeletonResource
    );
    
    // Step 3: Convert Otto -> glTF -> Otto (full roundtrip)
    const gltfDocument = bg3dParsedToGLTF(originalBg3d);
    const roundtripBg3d = await gltfToBG3D(gltfDocument);
    
    // Step 4: Generate binary files
    const roundtripBg3dBinary = bg3dParsedToBG3D(roundtripBg3d);
    
    console.log(`Original BG3D: ${originalBg3dData.length} bytes`);
    console.log(`Roundtrip BG3D: ${roundtripBg3dBinary.byteLength} bytes`);
    
    // Step 5: Analyze differences byte by byte
    const originalArray = new Uint8Array(originalBg3dData.buffer.slice(originalBg3dData.byteOffset, originalBg3dData.byteOffset + originalBg3dData.byteLength));
    const roundtripArray = new Uint8Array(roundtripBg3dBinary);
    
    const maxLength = Math.min(originalArray.length, roundtripArray.length);
    let differences = 0;
    const maxDiffReport = 20; // Only report first 20 differences
    
    console.log("=== BYTE-BY-BYTE ANALYSIS ===");
    
    for (let i = 0; i < maxLength; i++) {
      if (originalArray[i] !== roundtripArray[i]) {
        differences++;
        if (differences <= maxDiffReport) {
          const context = Math.max(0, i - 4);
          const contextEnd = Math.min(maxLength, i + 5);
          
          const origContext = Array.from(originalArray.slice(context, contextEnd))
            .map(b => b.toString(16).padStart(2, '0')).join(' ');
          const rtContext = Array.from(roundtripArray.slice(context, contextEnd))
            .map(b => b.toString(16).padStart(2, '0')).join(' ');
          
          console.log(`Difference ${differences} at byte ${i}:`);
          console.log(`  Original:  [${origContext}] (${originalArray[i]})`);
          console.log(`  Roundtrip: [${rtContext}] (${roundtripArray[i]})`);
          console.log(`  Context: bytes ${context}-${contextEnd-1}`);
        }
      }
    }
    
    if (originalArray.length !== roundtripArray.length) {
      console.log(`Size difference: original=${originalArray.length}, roundtrip=${roundtripArray.length}`);
    }
    
    console.log(`Total differences: ${differences} out of ${maxLength} bytes`);
    console.log(`Accuracy: ${((maxLength - differences) / maxLength * 100).toFixed(6)}%`);
    
    // If we have very few differences, let's see if we can ignore header bytes
    if (differences < 50) {
      console.log("=== CHECKING IF DIFFERENCES ARE JUST HEADERS ===");
      let nonHeaderDifferences = 0;
      const headerSize = 100; // Skip first 100 bytes as potential header
      
      for (let i = headerSize; i < maxLength; i++) {
        if (originalArray[i] !== roundtripArray[i]) {
          nonHeaderDifferences++;
        }
      }
      
      console.log(`Non-header differences: ${nonHeaderDifferences} (after byte ${headerSize})`);
      console.log(`Data accuracy: ${((maxLength - headerSize - nonHeaderDifferences) / (maxLength - headerSize) * 100).toFixed(6)}%`);
    }
  });

  it("should debug skeleton binary differences", async () => {
    console.log("=== SKELETON BINARY DIFFERENCE ANALYSIS ===");
    
    // Step 1: Load original files  
    const originalBg3dData = readFileSync(ottoBg3dPath);
    const originalSkeletonData = readFileSync(ottoSkeletonPath);
    
    // Step 2: Parse and roundtrip skeleton only
    const originalSkeletonResource = parseSkeletonRsrcTS(new Uint8Array(originalSkeletonData));
    console.log("Original skeleton structure:", {
      types: Object.keys(originalSkeletonResource).length,
      totalResources: Object.values(originalSkeletonResource).reduce((sum, type) => 
        sum + (typeof type === 'object' && type ? Object.keys(type).length : 0), 0)
    });
    
    // Convert through our pipeline
    const originalBg3d = parseBG3D(
      originalBg3dData.buffer.slice(originalBg3dData.byteOffset, originalBg3dData.byteOffset + originalBg3dData.byteLength),
      originalSkeletonResource
    );
    
    const gltfDocument = bg3dParsedToGLTF(originalBg3d);
    const roundtripBg3d = await gltfToBG3D(gltfDocument);
    const roundtripSkeletonResource = bg3dSkeletonToSkeletonResource(roundtripBg3d.skeleton!);
    
    console.log("Roundtrip skeleton structure:", {
      types: Object.keys(roundtripSkeletonResource).length,
      totalResources: Object.values(roundtripSkeletonResource).reduce((sum, type) => 
        sum + (typeof type === 'object' && type ? Object.keys(type).length : 0), 0)
    });
    
    // Generate binary
    const roundtripSkeletonBinary = skeletonResourceToBinary(roundtripSkeletonResource);
    
    console.log(`Original skeleton: ${originalSkeletonData.length} bytes`);
    console.log(`Roundtrip skeleton: ${roundtripSkeletonBinary.byteLength} bytes`);
    
    // Size difference analysis
    const sizeDiff = roundtripSkeletonBinary.byteLength - originalSkeletonData.length;
    console.log(`Size difference: ${sizeDiff} bytes (${sizeDiff > 0 ? 'larger' : 'smaller'})`);
    console.log(`Size ratio: ${(roundtripSkeletonBinary.byteLength / originalSkeletonData.length).toFixed(3)}x`);
    
    // If the sizes are very different, this suggests a format issue
    if (Math.abs(sizeDiff) > 1000) {
      console.log("⚠️  Large size difference suggests binary format encoding issues");
      console.log("The skeletonResourceToBinary function may be generating a different format");
    }
  });
});