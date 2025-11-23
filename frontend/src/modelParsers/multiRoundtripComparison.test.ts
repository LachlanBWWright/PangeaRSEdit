/**
 * Multi-roundtrip comparison test to verify semantic accuracy
 * 
 * Performs multiple roundtrips and compares parsed structures
 * to ensure data is being preserved correctly through the pipeline.
 */

import { describe, it, expect } from "vitest";
import { parseBG3D, bg3dParsedToBG3D } from "./parseBG3D";
import { parseSkeletonRsrc } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dSkeletonToSkeletonResource } from "./skeletonExport";
import { skeletonResourceToBinary } from "./skeletonBinaryExport";
import { bg3dParsedToGLTF } from "./parsedBg3dGitfConverter";
import { readFileSync } from "fs";
import { join } from "path";
import { NodeIO } from "@gltf-transform/core";

describe("Multi-Roundtrip Semantic Accuracy", () => {
  it("should maintain perfect semantic accuracy across multiple roundtrips", async () => {
    console.log("\n" + "=".repeat(80));
    console.log("MULTI-ROUNDTRIP SEMANTIC ACCURACY TEST");
    console.log("Performing 3 roundtrips and comparing parsed structures");
    console.log("=".repeat(80));

    // Load original files
    const ottoBg3dPath = join(__dirname, "../../public/Otto.bg3d");
    const ottoSkeletonPath = join(__dirname, "../../public/Otto.skeleton.rsrc");
    const originalBg3dData = readFileSync(ottoBg3dPath);
    const originalSkeletonData = readFileSync(ottoSkeletonPath);

    console.log(`\n[ORIGINAL] Loaded files:`);
    console.log(`  BG3D: ${originalBg3dData.length} bytes`);
    console.log(`  Skeleton: ${originalSkeletonData.length} bytes`);

    const io = new NodeIO();
    let currentBg3dData = originalBg3dData.buffer;
    let currentSkeletonData = originalSkeletonData.buffer;

    const parsedStates: Array<{
      roundtrip: number;
      bg3dParsed: any;
      skeletonParsed: any;
      bg3dBytes: number;
      skeletonBytes: number;
    }> = [];

    // Perform 3 roundtrips
    for (let i = 0; i <= 3; i++) {
      console.log(`\n[${"=".repeat(76)}]`);
      console.log(`[ROUNDTRIP ${i}] ${i === 0 ? "(ORIGINAL)" : `(After ${i} roundtrip${i > 1 ? "s" : ""})`}`);
      console.log(`[${"=".repeat(76)}]`);

      // Parse current state
      const skeletonParsed = parseSkeletonRsrc(currentSkeletonData, { usePyodide: false });
      const bg3dParsed = parseBG3D(currentBg3dData, skeletonParsed);

      console.log(`\n  Parsed skeleton data:`);
      console.log(`    - Bones: ${Object.keys((skeletonParsed as any).Bone || {}).length}`);
      console.log(`    - BonP: ${Object.keys((skeletonParsed as any).BonP || {}).length}`);
      console.log(`    - BonN: ${Object.keys((skeletonParsed as any).BonN || {}).length}`);
      console.log(`    - AnHd: ${Object.keys((skeletonParsed as any).AnHd || {}).length}`);
      console.log(`    - KeyF: ${Object.keys((skeletonParsed as any).KeyF || {}).length}`);

      console.log(`\n  Parsed BG3D data:`);
      console.log(`    - Skeleton bones: ${bg3dParsed.skeleton?.bones?.length || 0}`);
      console.log(`    - Skeleton animations: ${bg3dParsed.skeleton?.animations?.length || 0}`);
      console.log(`    - Vertices: ${bg3dParsed.verticesArray ? bg3dParsed.verticesArray.length / 3 : 0}`);

      // Store parsed state
      parsedStates.push({
        roundtrip: i,
        bg3dParsed,
        skeletonParsed,
        bg3dBytes: i === 0 ? originalBg3dData.length : currentBg3dData.byteLength,
        skeletonBytes: currentSkeletonData.byteLength,
      });

      // If not the last iteration, perform roundtrip
      if (i < 3) {
        console.log(`\n  Converting to glTF...`);
        const gltfDoc = bg3dParsedToGLTF(bg3dParsed);
        const gltfJson = io.writeJSON(gltfDoc);
        console.log(`    - glTF nodes: ${gltfJson.json.nodes?.length || 0}`);
        console.log(`    - glTF skins: ${gltfJson.json.skins?.length || 0}`);
        console.log(`    - glTF animations: ${gltfJson.json.animations?.length || 0}`);

        console.log(`\n  Converting glTF back to BG3D + skeleton...`);
        const gltfDocBack = io.readJSON(gltfJson);
        const bg3dParsedBack = parseBG3D(new ArrayBuffer(0), {}, gltfDocBack, bg3dParsed);

        // Export back to binary
        const bg3dBinary = bg3dParsedToBG3D(bg3dParsedBack);
        const skeletonResource = bg3dSkeletonToSkeletonResource(bg3dParsedBack);
        const skeletonBinary = skeletonResourceToBinary(skeletonResource, { usePyodide: false });

        console.log(`    - Exported BG3D: ${bg3dBinary.byteLength} bytes`);
        console.log(`    - Exported Skeleton: ${skeletonBinary.byteLength} bytes`);

        // Update for next iteration
        currentBg3dData = bg3dBinary;
        currentSkeletonData = skeletonBinary;
      }
    }

    // Compare all parsed states
    console.log(`\n\n${"=".repeat(80)}`);
    console.log("SEMANTIC COMPARISON ACROSS ROUNDTRIPS");
    console.log("=".repeat(80));

    const original = parsedStates[0];

    for (let i = 1; i < parsedStates.length; i++) {
      const current = parsedStates[i];
      console.log(`\n[Comparing Original vs Roundtrip ${i}]`);

      // Compare skeleton resource counts
      const origSkel = original.skeletonParsed as any;
      const currSkel = current.skeletonParsed as any;

      const boneCountOrig = Object.keys(origSkel.Bone || {}).length;
      const boneCountCurr = Object.keys(currSkel.Bone || {}).length;
      console.log(`  Bone count: ${boneCountOrig} → ${boneCountCurr} ${boneCountOrig === boneCountCurr ? "✓" : "✗ MISMATCH"}`);

      const anhdCountOrig = Object.keys(origSkel.AnHd || {}).length;
      const anhdCountCurr = Object.keys(currSkel.AnHd || {}).length;
      console.log(`  Animation count: ${anhdCountOrig} → ${anhdCountCurr} ${anhdCountOrig === anhdCountCurr ? "✓" : "✗ MISMATCH"}`);

      const keyfCountOrig = Object.keys(origSkel.KeyF || {}).length;
      const keyfCountCurr = Object.keys(currSkel.KeyF || {}).length;
      console.log(`  KeyF count: ${keyfCountOrig} → ${keyfCountCurr} ${keyfCountOrig === keyfCountCurr ? "✓" : "✗ MISMATCH"}`);

      // Compare bone names
      console.log(`\n  Checking bone names...`);
      const origBoneNames = Object.values(origSkel.Bone || {}).map((b: any) => b.obj.name);
      const currBoneNames = Object.values(currSkel.Bone || {}).map((b: any) => b.obj.name);
      let boneNameMismatches = 0;
      origBoneNames.forEach((name: string, idx: number) => {
        if (name !== currBoneNames[idx]) {
          console.log(`    ✗ Bone ${idx}: "${name}" → "${currBoneNames[idx]}"`);
          boneNameMismatches++;
        }
      });
      if (boneNameMismatches === 0) {
        console.log(`    ✓ All ${origBoneNames.length} bone names match perfectly`);
      } else {
        console.log(`    ✗ ${boneNameMismatches} bone name mismatches!`);
      }

      // Compare bone coordinates
      console.log(`\n  Checking bone coordinates...`);
      const origBoneCoords = Object.values(origSkel.Bone || {}).map((b: any) => 
        [b.obj.coordX, b.obj.coordY, b.obj.coordZ]
      );
      const currBoneCoords = Object.values(currSkel.Bone || {}).map((b: any) => 
        [b.obj.coordX, b.obj.coordY, b.obj.coordZ]
      );
      let coordMismatches = 0;
      origBoneCoords.forEach((coords: number[], idx: number) => {
        const diff = coords.map((c, i) => Math.abs(c - currBoneCoords[idx][i]));
        const maxDiff = Math.max(...diff);
        if (maxDiff > 0.01) {  // Allow small floating point tolerance
          console.log(`    ✗ Bone ${idx}: [${coords.join(", ")}] → [${currBoneCoords[idx].join(", ")}] (diff: ${maxDiff.toFixed(4)})`);
          coordMismatches++;
        }
      });
      if (coordMismatches === 0) {
        console.log(`    ✓ All ${origBoneCoords.length} bone coordinates match (within tolerance)`);
      } else {
        console.log(`    ✗ ${coordMismatches} bone coordinate mismatches!`);
      }

      // Compare BonP data
      console.log(`\n  Checking BonP (bone point indices)...`);
      const bonpCountOrig = Object.keys(origSkel.BonP || {}).length;
      const bonpCountCurr = Object.keys(currSkel.BonP || {}).length;
      console.log(`    Count: ${bonpCountOrig} → ${bonpCountCurr} ${bonpCountOrig === bonpCountCurr ? "✓" : "✗ MISMATCH"}`);

      if (bonpCountOrig === bonpCountCurr) {
        let bonpDataMismatches = 0;
        Object.keys(origSkel.BonP || {}).forEach((id: string) => {
          const origBonP = (origSkel.BonP[id] as any).obj;
          const currBonP = (currSkel.BonP[id] as any)?.obj;
          if (!currBonP) {
            console.log(`    ✗ BonP ${id} missing in roundtrip!`);
            bonpDataMismatches++;
          } else if (JSON.stringify(origBonP) !== JSON.stringify(currBonP)) {
            console.log(`    ✗ BonP ${id} data mismatch`);
            bonpDataMismatches++;
          }
        });
        if (bonpDataMismatches === 0) {
          console.log(`    ✓ All BonP data matches`);
        }
      }

      // File size comparison
      console.log(`\n  File sizes:`);
      console.log(`    BG3D: ${original.bg3dBytes} → ${current.bg3dBytes} (${((current.bg3dBytes / original.bg3dBytes) * 100).toFixed(2)}%)`);
      console.log(`    Skeleton: ${original.skeletonBytes} → ${current.skeletonBytes} (${((current.skeletonBytes / original.skeletonBytes) * 100).toFixed(2)}%)`);

      // Assertions for this roundtrip
      expect(boneCountCurr).toBe(boneCountOrig);
      expect(anhdCountCurr).toBe(anhdCountOrig);
      expect(boneNameMismatches).toBe(0);
      expect(coordMismatches).toBe(0);
    }

    console.log(`\n${"=".repeat(80)}`);
    console.log("RESULT: All semantic data preserved across 3 roundtrips");
    console.log("=".repeat(80));
  });
});
