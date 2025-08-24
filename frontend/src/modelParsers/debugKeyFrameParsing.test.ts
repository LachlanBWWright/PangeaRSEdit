// debugKeyFrameParsing.test.ts
// Debug specific keyframe parsing issues

import { describe, it } from "vitest";
import { parseSkeletonRsrcTS } from "./skeletonRsrc/parseSkeletonRsrcTS";
import fs from "fs";
import path from "path";

describe("KeyFrame Parsing Debug", () => {
  it("debugs specific keyframe parsing for animation 0", () => {
    const skeletonPath = path.join(__dirname, "../../public/Otto.skeleton.rsrc");
    const buffer = fs.readFileSync(skeletonPath);
    
    console.log("Parsing Otto skeleton file...");
    const skeleton = parseSkeletonRsrcTS(buffer.buffer);
    
    console.log("\n=== KEYFRAME PARSING DEBUG ===");
    
    // Focus on first animation (should be 1000-1015)
    const animationIndex = 0;
    const numBones = Object.keys(skeleton.Bone || {}).length;
    console.log(`Debugging animation ${animationIndex} with ${numBones} bones`);
    
    for (let boneIndex = 0; boneIndex < Math.min(3, numBones); boneIndex++) {
      const keyframeResourceId = (1000 + (animationIndex * 100) + boneIndex).toString();
      console.log(`\n--- Bone ${boneIndex} (KeyF ID ${keyframeResourceId}) ---`);
      
      const keyframeEntry = skeleton.KeyF?.[keyframeResourceId];
      if (keyframeEntry) {
        console.log(`KeyF ${keyframeResourceId} exists:`, typeof keyframeEntry);
        console.log(`KeyF ${keyframeResourceId} keys:`, Object.keys(keyframeEntry));
        console.log(`KeyF ${keyframeResourceId} name:`, keyframeEntry.name);
        console.log(`KeyF ${keyframeResourceId} order:`, keyframeEntry.order);
        console.log(`KeyF ${keyframeResourceId} obj type:`, typeof keyframeEntry.obj);
        console.log(`KeyF ${keyframeResourceId} obj is array:`, Array.isArray(keyframeEntry.obj));
        console.log(`KeyF ${keyframeResourceId} obj length:`, keyframeEntry.obj?.length);
        
        if (Array.isArray(keyframeEntry.obj) && keyframeEntry.obj.length > 0) {
          console.log(`KeyF ${keyframeResourceId} first keyframe:`, keyframeEntry.obj[0]);
          console.log(`KeyF ${keyframeResourceId} first keyframe keys:`, Object.keys(keyframeEntry.obj[0]));
        } else {
          console.log(`KeyF ${keyframeResourceId} obj is empty or not array:`, keyframeEntry.obj);
        }
      } else {
        console.log(`KeyF ${keyframeResourceId} NOT FOUND!`);
      }
    }
    
    // Test hex parsing on a specific KeyF resource
    console.log("\n=== RAW RSRCDUMP OUTPUT ===");
    const testKeyFId = "1000"; // First keyframe resource
    console.log(`Testing raw data for KeyF ${testKeyFId}...`);
  });
});