// debugOttoKeyframes.test.ts
// Debug Otto keyframe structure to understand animation data organization

import { describe, it } from "vitest";
import { parseSkeletonRsrcTS } from "./skeletonRsrc/parseSkeletonRsrcTS";
import fs from "fs";
import path from "path";

describe("Otto Keyframe Debug", () => {
  it("analyzes Otto skeleton keyframe structure", () => {
    const skeletonPath = path.join(__dirname, "../../public/Otto.skeleton.rsrc");
    const buffer = fs.readFileSync(skeletonPath);
    
    console.log("Parsing Otto skeleton file...");
    const skeleton = parseSkeletonRsrcTS(buffer.buffer);
    
    console.log("\n=== SKELETON STRUCTURE ANALYSIS ===");
    console.log("Bones:", Object.keys(skeleton.Bone || {}).length);
    console.log("Animations (AnHd):", Object.keys(skeleton.AnHd || {}).length);
    console.log("KeyF resources:", Object.keys(skeleton.KeyF || {}).length);
    console.log("NumK resources:", Object.keys(skeleton.NumK || {}).length);
    
    console.log("\n=== ANIMATION HEADERS ===");
    Object.entries(skeleton.AnHd || {}).forEach(([id, anim]) => {
      console.log(`Animation ${id}: ${anim.obj.animName} (${anim.obj.numAnimEvents} events)`);
    });
    
    console.log("\n=== NUM KEYFRAMES (NumK) ===");
    Object.entries(skeleton.NumK || {}).forEach(([id, numK]) => {
      console.log(`NumK ${id}: ${JSON.stringify(numK.obj)}`);
    });
    
    console.log("\n=== KEYFRAME RESOURCES ===");
    Object.entries(skeleton.KeyF || {}).forEach(([id, keyframes]) => {
      console.log(`KeyF ${id}: ${keyframes.obj.length} keyframes`);
      if (keyframes.obj.length > 0) {
        const first = keyframes.obj[0];
        const last = keyframes.obj[keyframes.obj.length - 1];
        console.log(`  First: tick=${first.tick}, coord=[${first.coordX}, ${first.coordY}, ${first.coordZ}]`);
        console.log(`  Last:  tick=${last.tick}, coord=[${last.coordX}, ${last.coordY}, ${last.coordZ}]`);
        
        // Show tick distribution for first few keyframes
        const ticks = keyframes.obj.slice(0, 10).map(kf => kf.tick);
        console.log(`  First 10 ticks: [${ticks.join(', ')}]`);
        
        // Show unique tick values to understand animation structure
        const uniqueTicks = [...new Set(keyframes.obj.map(kf => kf.tick))].sort((a, b) => a - b);
        console.log(`  Unique ticks (${uniqueTicks.length}): [${uniqueTicks.slice(0, 20).join(', ')}${uniqueTicks.length > 20 ? '...' : ''}]`);
      }
    });
    
    console.log("\n=== EXPECTED KEYFRAME RESOURCE PATTERN ===");
    const numAnims = Object.keys(skeleton.AnHd || {}).length;
    const numBones = Object.keys(skeleton.Bone || {}).length;
    console.log(`Expected pattern: 1000 + (animIndex * 100) + boneIndex`);
    console.log(`With ${numAnims} animations and ${numBones} bones:`);
    
    for (let animIndex = 0; animIndex < Math.min(5, numAnims); animIndex++) {
      for (let boneIndex = 0; boneIndex < Math.min(3, numBones); boneIndex++) {
        const expectedId = (1000 + (animIndex * 100) + boneIndex).toString();
        const exists = skeleton.KeyF && skeleton.KeyF[expectedId];
        console.log(`  Anim ${animIndex}, Bone ${boneIndex}: ID ${expectedId} - ${exists ? 'EXISTS' : 'MISSING'}`);
      }
    }
    
    console.log("\n=== ALL KEYF RESOURCE IDS ===");
    const keyFIds = Object.keys(skeleton.KeyF || {}).sort();
    console.log(`Total KeyF resources: ${keyFIds.length}`);
    console.log(`IDs: [${keyFIds.join(', ')}]`);
    
    // Try to find pattern in the IDs
    if (keyFIds.length > 1) {
      const numericIds = keyFIds.map(id => parseInt(id, 10)).sort((a, b) => a - b);
      console.log(`Numeric IDs: [${numericIds.join(', ')}]`);
      
      // Check if it follows base + index pattern
      const gaps = numericIds.slice(1).map((id, idx) => id - numericIds[idx]);
      console.log(`Gaps between IDs: [${gaps.join(', ')}]`);
    }
  });
});