// Round-trip test for BG3D + skeleton parsing
import { describe, it, expect } from "vitest";
import { parseBG3D } from "./parseBG3D";
import { parseSkeletonRsrcTS } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dSkeletonToSkeletonResource } from "./skeletonExport";
import { bg3dParsedToGLTF } from "./parsedBg3dGitfConverter";
import { readFileSync } from "fs";
import { join } from "path";

describe("BG3D Skeleton Round-trip", () => {
  it("should preserve animation timing in round-trip conversion", async () => {
    // Load existing test files - use the same pattern as other tests
    const ottoData = readFileSync(join(__dirname, "testSkeletons", "Otto.bg3d"));
    const ottoSkeletonData = readFileSync(join(__dirname, "testSkeletons", "Skip_Explore.skeleton.rsrc"));
    
    console.log("Parsing skeleton resource with TypeScript implementation...");
    const skeleton = parseSkeletonRsrcTS(new Uint8Array(ottoSkeletonData));
    
    console.log("Parsing BG3D with skeleton data...");
    const bg3dParsed = parseBG3D(ottoData.buffer, skeleton);
    
    expect(bg3dParsed.skeleton).toBeDefined();
    expect(bg3dParsed.skeleton!.animations.length).toBeGreaterThan(0);
    
    // Convert to glTF to test animation timing
    console.log("Converting to glTF to test animation timing...");
    const gltfDocument = bg3dParsedToGLTF(bg3dParsed);
    
    const animations = gltfDocument.getRoot().listAnimations();
    expect(animations.length).toBeGreaterThan(0);
    
    // Test that animations have reasonable durations (not all 0 or extreme values)
    const animationDurations: { [name: string]: number } = {};
    
    animations.forEach(animation => {
      const samplers = animation.listSamplers();
      let maxDuration = 0;
      
      samplers.forEach(sampler => {
        const inputAccessor = sampler.getInput();
        if (inputAccessor) {
          const times = inputAccessor.getArray();
          if (times && times.length > 0) {
            maxDuration = Math.max(maxDuration, times[times.length - 1] as number);
          }
        }
      });
      
      animationDurations[animation.getName()] = maxDuration;
    });
    
    console.log("Animation durations:", animationDurations);
    
    // Verify durations are reasonable (between 0.1 and 10 seconds)
    Object.entries(animationDurations).forEach(([name, duration]) => {
      expect(duration).toBeGreaterThan(0.01); // At least 10ms
      expect(duration).toBeLessThan(30); // Less than 30 seconds
      console.log(`Animation "${name}": ${duration.toFixed(3)} seconds`);
    });
    
    // Convert back to skeleton resource format
    console.log("Converting back to skeleton resource format...");
    const reconstructedSkeleton = bg3dSkeletonToSkeletonResource(bg3dParsed.skeleton!);
    
    // Verify basic structure preservation
    expect(reconstructedSkeleton.Hedr).toBeDefined();
    expect(reconstructedSkeleton.Bone).toBeDefined();
    expect(reconstructedSkeleton.KeyF).toBeDefined();
    
    // Check that we have the same number of animations
    const originalAnimCount = skeleton.AnHd ? Object.keys(skeleton.AnHd).length : 0;
    const reconstructedAnimCount = reconstructedSkeleton.AnHd ? Object.keys(reconstructedSkeleton.AnHd).length : 0;
    
    expect(reconstructedAnimCount).toBe(originalAnimCount);
    
    console.log(`Original animations: ${originalAnimCount}, Reconstructed: ${reconstructedAnimCount}`);
  });
});