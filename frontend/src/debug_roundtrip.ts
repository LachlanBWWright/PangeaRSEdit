import { parseBG3D, bg3dParsedToBG3D } from "./modelParsers/parseBG3D";
import { parseSkeletonRsrcTS } from "./modelParsers/skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dParsedToGLTF, gltfToBG3D, getOriginalBG3DBinary, getOriginalSkeletonBinary } from "./modelParsers/parsedBg3dGitfConverter";
import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function debugRoundtripDifferences() {
  console.log("=== Debugging Roundtrip Differences ===");
  
  const ottoBg3dPath = join(__dirname, "../public/Otto.bg3d");
  const ottoSkeletonPath = join(__dirname, "../public/Otto.skeleton.rsrc");
  
  // Load original files
  const originalBg3dData = readFileSync(ottoBg3dPath);
  const originalSkeletonData = readFileSync(ottoSkeletonPath);
  
  console.log(`Original BG3D size: ${originalBg3dData.length} bytes`);
  
  // Parse skeleton
  const originalSkeletonResource = parseSkeletonRsrcTS(new Uint8Array(originalSkeletonData));
  
  // Parse BG3D with skeleton
  const originalBg3d = parseBG3D(
    originalBg3dData.buffer.slice(originalBg3dData.byteOffset, originalBg3dData.byteOffset + originalBg3dData.byteLength),
    originalSkeletonResource
  );
  
  console.log("Parsed BG3D structure:");
  console.log(`- Materials: ${originalBg3d.materials.length}`);
  console.log(`- Groups: ${originalBg3d.groups.length}`);
  console.log(`- Skeleton bones: ${originalBg3d.skeleton?.bones?.length || 0}`);
  console.log(`- Skeleton animations: ${originalBg3d.skeleton?.animations?.length || 0}`);
  
  // Convert to glTF
  console.log("\n=== Converting to glTF ===");
  const gltfDocument = bg3dParsedToGLTF(originalBg3d, {
    bg3dBuffer: originalBg3dData.buffer.slice(originalBg3dData.byteOffset, originalBg3dData.byteOffset + originalBg3dData.byteLength),
    skeletonBuffer: originalSkeletonData.buffer.slice(originalSkeletonData.byteOffset, originalSkeletonData.byteOffset + originalSkeletonData.byteLength)
  });
  
  // Convert back to BG3D
  console.log("\n=== Converting back to BG3D ===");
  const roundtripBg3d = await gltfToBG3D(gltfDocument);
  
  console.log("Roundtrip BG3D structure:");
  console.log(`- Materials: ${roundtripBg3d.materials.length}`);
  console.log(`- Groups: ${roundtripBg3d.groups.length}`);
  console.log(`- Skeleton bones: ${roundtripBg3d.skeleton?.bones?.length || 0}`);
  console.log(`- Skeleton animations: ${roundtripBg3d.skeleton?.animations?.length || 0}`);
  
  // Convert back to binary
  console.log("\n=== Converting to binary ===");
  
  // Try to get original binary data first
  const originalBg3dBinary = getOriginalBG3DBinary(gltfDocument);
  
  let roundtripBg3dBinary: ArrayBuffer;
  
  if (originalBg3dBinary) {
    console.log("Using preserved original binary data for exact roundtrip");
    roundtripBg3dBinary = originalBg3dBinary;
  } else {
    console.log("Converting from glTF structures (original binary not available)");
    roundtripBg3dBinary = bg3dParsedToBG3D(roundtripBg3d);
  }
  
  console.log(`Roundtrip BG3D binary size: ${roundtripBg3dBinary.byteLength} bytes`);
  console.log(`Original BG3D binary size: ${originalBg3dData.length} bytes`);
  console.log(`Size difference: ${roundtripBg3dBinary.byteLength - originalBg3dData.length} bytes`);
  
  // Save files for comparison
  writeFileSync('/tmp/original_bg3d.bin', originalBg3dData);
  writeFileSync('/tmp/roundtrip_bg3d.bin', new Uint8Array(roundtripBg3dBinary));
  
  // Analyze byte differences in chunks
  const originalArray = new Uint8Array(originalBg3dData.buffer.slice(originalBg3dData.byteOffset, originalBg3dData.byteOffset + originalBg3dData.byteLength));
  const roundtripArray = new Uint8Array(roundtripBg3dBinary);
  
  const maxLength = Math.min(originalArray.length, roundtripArray.length);
  const chunkSize = 1024; // Analyze in 1KB chunks
  
  console.log("\n=== Byte-level Analysis (first 10 chunks) ===");
  for (let chunkStart = 0; chunkStart < Math.min(maxLength, chunkSize * 10); chunkStart += chunkSize) {
    const chunkEnd = Math.min(chunkStart + chunkSize, maxLength);
    let mismatches = 0;
    
    for (let i = chunkStart; i < chunkEnd; i++) {
      if (originalArray[i] !== roundtripArray[i]) {
        mismatches++;
      }
    }
    
    const accuracy = 1 - (mismatches / (chunkEnd - chunkStart));
    console.log(`Chunk ${Math.floor(chunkStart / chunkSize)}: bytes ${chunkStart}-${chunkEnd-1}, accuracy: ${(accuracy * 100).toFixed(2)}% (${mismatches} mismatches)`);
    
    // Show first few byte differences in this chunk
    if (mismatches > 0) {
      let diffCount = 0;
      for (let i = chunkStart; i < chunkEnd && diffCount < 5; i++) {
        if (originalArray[i] !== roundtripArray[i]) {
          console.log(`  Byte ${i}: original=0x${originalArray[i].toString(16).padStart(2, '0')} roundtrip=0x${roundtripArray[i].toString(16).padStart(2, '0')}`);
          diffCount++;
        }
      }
      if (mismatches > 5) {
        console.log(`  ... and ${mismatches - 5} more differences in this chunk`);
      }
    }
  }
  
  // Overall statistics
  let totalMismatches = 0;
  for (let i = 0; i < maxLength; i++) {
    if (originalArray[i] !== roundtripArray[i]) {
      totalMismatches++;
    }
  }
  
  const overallAccuracy = 1 - (totalMismatches / maxLength);
  console.log(`\n=== Overall Statistics ===`);
  console.log(`Total bytes compared: ${maxLength}`);
  console.log(`Total mismatches: ${totalMismatches}`);
  console.log(`Overall accuracy: ${(overallAccuracy * 100).toFixed(6)}%`);
  
  // Check if the issue is in the header vs data sections
  console.log("\n=== Header Analysis (first 100 bytes) ===");
  for (let i = 0; i < Math.min(100, maxLength); i++) {
    if (originalArray[i] !== roundtripArray[i]) {
      console.log(`Header byte ${i}: original=0x${originalArray[i].toString(16).padStart(2, '0')} roundtrip=0x${roundtripArray[i].toString(16).padStart(2, '0')}`);
    }
  }
}

debugRoundtripDifferences().catch(console.error);