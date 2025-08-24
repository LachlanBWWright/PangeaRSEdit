// testAnimationMapping.test.ts
// Test to validate animation parsing and mapping logic

import { describe, it, expect } from "vitest";
import { parseSkeletonRsrcTS } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { parseBG3DWithSkeletonResource } from "./bg3dWithSkeleton";
import fs from "fs";
import path from "path";

describe("Animation Mapping Test", () => {
  it("should correctly parse animations with proper timing", () => {
    const bg3dPath = path.join(__dirname, "../../public/Otto.bg3d");
    const skeletonPath = path.join(__dirname, "../../public/Otto.skeleton.rsrc");
    
    if (!fs.existsSync(bg3dPath) || !fs.existsSync(skeletonPath)) {
      console.log("Otto files not found, skipping test");
      return;
    }
    
    const bg3dBuffer = fs.readFileSync(bg3dPath);
    const skeletonBuffer = fs.readFileSync(skeletonPath);
    
    // Parse skeleton data
    const skeleton = parseSkeletonRsrcTS(skeletonBuffer.buffer);
    
    // Parse BG3D with skeleton
    const result = parseBG3DWithSkeletonResource(bg3dBuffer.buffer, skeleton);
    
    console.log("=== ANIMATION PARSING TEST ===");
    console.log(`Found ${result.skeleton?.animations.length} animations`);
    
    result.skeleton?.animations.forEach((anim, index) => {
      const totalKeyframes = Object.values(anim.keyframes).reduce((sum, kf) => sum + kf.length, 0);
      console.log(`Animation ${index}: ${anim.name} - ${totalKeyframes} total keyframes`);
      
      // Check each bone's keyframes
      Object.entries(anim.keyframes).forEach(([boneIndex, keyframes]) => {
        if (keyframes.length > 0 && index < 3) { // Only show details for first 3 animations
          const ticks = keyframes.map(kf => kf.tick);
          const minTick = Math.min(...ticks);
          const maxTick = Math.max(...ticks);
          const duration = maxTick / 30.0; // Otto timing: ticks / 30.0
          console.log(`  Bone ${boneIndex}: ${keyframes.length} keyframes, ticks ${minTick}-${maxTick}, duration: ${duration.toFixed(3)}s`);
        }
      });
    });
    
    // Verify we have some animations with non-zero duration
    const animationsWithKeyframes = result.skeleton?.animations.filter(anim => 
      Object.values(anim.keyframes).some(kf => kf.length > 0)
    ) || [];
    
    console.log(`Animations with keyframes: ${animationsWithKeyframes.length}`);
    expect(animationsWithKeyframes.length).toBeGreaterThan(0);
    
    // Check that at least some animations have meaningful duration
    const animationsWithDuration = animationsWithKeyframes.filter(anim => {
      const maxTick = Math.max(...Object.values(anim.keyframes).flat().map(kf => kf.tick));
      return maxTick > 0;
    });
    
    console.log(`Animations with duration > 0: ${animationsWithDuration.length}`);
    expect(animationsWithDuration.length).toBeGreaterThan(0);
  });
});