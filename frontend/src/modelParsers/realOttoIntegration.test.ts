// Test real Otto skeleton integration
import { describe, it } from "vitest";
import { parseSkeletonRsrcTS } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { parseBG3D } from "./parseBG3D";
import fs from "fs";
import path from "path";

describe("Real Otto Integration", () => {
  it("should test real Otto BG3D + skeleton parsing", async () => {
    const bg3dPath = path.join(__dirname, "../../public/Otto.bg3d");
    const skeletonPath = path.join(__dirname, "../../public/Otto.skeleton.rsrc");
    
    if (!fs.existsSync(bg3dPath) || !fs.existsSync(skeletonPath)) {
      console.log("Otto files not found, skipping real integration test");
      return;
    }
    
    console.log("=== REAL OTTO INTEGRATION TEST ===");
    
    // Parse skeleton
    const skeletonBuffer = fs.readFileSync(skeletonPath);
    console.log("1. Parsing skeleton file...");
    const skeleton = parseSkeletonRsrcTS(skeletonBuffer.buffer);
    
    console.log(`2. Skeleton parsed: ${Object.keys(skeleton.Bone || {}).length} bones, ${Object.keys(skeleton.AnHd || {}).length} animations`);
    console.log(`3. KeyF resources available: ${Object.keys(skeleton.KeyF || {}).length}`);
    
    // Parse BG3D with skeleton
    const bg3dBuffer = fs.readFileSync(bg3dPath);
    console.log("4. Parsing BG3D with skeleton...");
    
    try {
      const result = parseBG3D(bg3dBuffer.buffer, skeleton);
      
      console.log("5. BG3D parsing completed successfully!");
      console.log(`   Materials: ${result.materials.length}`);
      console.log(`   Groups: ${result.groups.length}`);
      console.log(`   Skeleton: ${result.skeleton ? 'Present' : 'Missing'}`);
      
      if (result.skeleton) {
        console.log(`   Bones: ${result.skeleton.bones.length}`);
        console.log(`   Animations: ${result.skeleton.animations.length}`);
        
        // Check animation durations
        result.skeleton.animations.forEach((anim, index) => {
          const totalKeyframes = Object.values(anim.keyframes).reduce((sum, boneKeyframes) => sum + boneKeyframes.length, 0);
          
          if (totalKeyframes > 0) {
            // Calculate duration from keyframes
            let maxTick = 0;
            Object.values(anim.keyframes).forEach(boneKeyframes => {
              boneKeyframes.forEach(kf => {
                if (kf.tick > maxTick) maxTick = kf.tick;
              });
            });
            const duration = maxTick / 30.0; // Otto's timing formula
            console.log(`     Animation ${index}: ${anim.name} - ${totalKeyframes} keyframes, duration: ${duration.toFixed(2)}s`);
          } else {
            console.log(`     Animation ${index}: ${anim.name} - NO KEYFRAMES`);
          }
        });
      }
    } catch (error) {
      console.error("6. BG3D parsing failed:", error);
      throw error;
    }
  });
});