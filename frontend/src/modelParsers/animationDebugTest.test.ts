// Debug test to understand animation processing
import { describe, it, expect } from "vitest";
import { parseBG3D } from "./parseBG3D";
import { parseSkeletonRsrcTS } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dParsedToGLTF } from "./parsedBg3dGitfConverter";
import { readFileSync } from "fs";
import { join } from "path";

describe("Animation Debug Test", () => {
  it("should debug animation processing for one animation", async () => {
    console.log("=== Animation Debug Test ===");
    
    const ottoBg3dPath = join(__dirname, "../../public/Otto.bg3d");
    const ottoSkeletonPath = join(__dirname, "../../public/Otto.skeleton.rsrc");
    
    // Load files
    const bg3dData = readFileSync(ottoBg3dPath);
    const skeletonData = readFileSync(ottoSkeletonPath);
    
    // Parse skeleton
    const skeletonResource = parseSkeletonRsrcTS(new Uint8Array(skeletonData));
    
    // Parse BG3D with skeleton
    const bg3dParsed = parseBG3D(
      bg3dData.buffer.slice(bg3dData.byteOffset, bg3dData.byteOffset + bg3dData.byteLength),
      skeletonResource
    );
    
    // Look at the first animation
    const firstAnimation = bg3dParsed.skeleton!.animations[0];
    console.log(`First animation: "${firstAnimation.name}"`);
    console.log(`Animation keyframes keys:`, Object.keys(firstAnimation.keyframes));
    
    // Look at keyframes for first bone that has data
    for (const [boneIndexStr, keyframes] of Object.entries(firstAnimation.keyframes)) {
      if (keyframes.length > 0) {
        console.log(`Bone ${boneIndexStr} has ${keyframes.length} keyframes:`);
        console.log(`  First keyframe:`, keyframes[0]);
        console.log(`  Last keyframe:`, keyframes[keyframes.length - 1]);
        
        // Check for variation manually
        const coords = keyframes.map(kf => [kf.coordX, kf.coordY, kf.coordZ]).flat();
        const rotations = keyframes.map(kf => [kf.rotationX, kf.rotationY, kf.rotationZ]).flat();
        
        console.log(`  Translation range: [${Math.min(...coords)}, ${Math.max(...coords)}]`);
        console.log(`  Rotation range: [${Math.min(...rotations)}, ${Math.max(...rotations)}]`);
        
        break; // Just check first bone with data
      }
    }
    
    // Convert to glTF and see what happens
    console.log("Converting to glTF...");
    const gltfDocument = bg3dParsedToGLTF(bg3dParsed);
    
    const gltfAnimations = gltfDocument.getRoot().listAnimations();
    console.log(`Created ${gltfAnimations.length} glTF animations`);
    
    if (gltfAnimations.length > 0) {
      const firstGltfAnim = gltfAnimations[0];
      console.log(`First glTF animation: "${firstGltfAnim.getName()}"`);
      
      const samplers = firstGltfAnim.listSamplers();
      console.log(`Has ${samplers.length} samplers`);
      
      if (samplers.length > 0) {
        const firstSampler = samplers[0];
        const input = firstSampler.getInput();
        if (input) {
          const times = input.getArray();
          console.log(`First sampler times:`, Array.from(times as Float32Array).slice(0, 10));
        }
      }
    }
  });
});