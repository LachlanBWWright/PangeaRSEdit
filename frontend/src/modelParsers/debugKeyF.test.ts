// Debug KeyF structure
import { describe, it } from "vitest";
import { parseSkeletonRsrcTS } from "./skeletonRsrc/parseSkeletonRsrcTS";
import fs from "fs";
import path from "path";

describe("Debug KeyF Structure", () => {
  it("should check KeyF data structure", () => {
    const skeletonPath = path.join(__dirname, "../../public/Otto.skeleton.rsrc");
    
    if (!fs.existsSync(skeletonPath)) {
      console.log("Otto skeleton file not found, skipping test");
      return;
    }
    
    const skeletonBuffer = fs.readFileSync(skeletonPath);
    const skeleton = parseSkeletonRsrcTS(skeletonBuffer.buffer);
    
    console.log("=== KEYF STRUCTURE DEBUG ===");
    
    // Check first few KeyF resources
    const keyFIds = Object.keys(skeleton.KeyF || {}).slice(0, 10);
    console.log(`Total KeyF resources: ${Object.keys(skeleton.KeyF || {}).length}`);
    console.log(`First 10 KeyF IDs: [${keyFIds.join(', ')}]`);
    
    keyFIds.forEach(id => {
      const keyF = skeleton.KeyF![id];
      console.log(`\nKeyF ${id}:`);
      console.log(`  name: ${keyF.name}`);
      console.log(`  order: ${keyF.order}`);
      console.log(`  obj type: ${typeof keyF.obj}`);
      console.log(`  obj is array: ${Array.isArray(keyF.obj)}`);
      if (Array.isArray(keyF.obj)) {
        console.log(`  obj length: ${keyF.obj.length}`);
        if (keyF.obj.length > 0) {
          const first = keyF.obj[0];
          console.log(`  first keyframe tick: ${first.tick}`);
          console.log(`  first keyframe coord: [${first.coordX}, ${first.coordY}, ${first.coordZ}]`);
        }
      } else {
        console.log(`  obj value: ${JSON.stringify(keyF.obj).substring(0, 100)}...`);
      }
    });
  });
});