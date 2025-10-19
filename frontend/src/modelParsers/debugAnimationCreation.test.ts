// Debug test to check animation creation
import { describe, it } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { parseBG3D } from "./parseBG3D";
import { parseSkeletonRsrcTS } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dParsedToGLTF } from "./parsedBg3dGitfConverter";

describe("Debug animation creation", () => {
  it("should create animations in glTF", () => {
    const ottoPath = join(__dirname, "../../public/Otto.bg3d");
    const ottoSkeletonPath = join(__dirname, "../../public/Otto.skeleton.rsrc");
    
    const ottoData = readFileSync(ottoPath);
    const ottoSkeletonData = readFileSync(ottoSkeletonPath);
    
    const skeleton = parseSkeletonRsrcTS(new Uint8Array(ottoSkeletonData));
    const bg3dParsed = parseBG3D(ottoData.buffer, skeleton);
    
    console.log("\n=== BG3D Parsed Data ===");
    console.log(`Skeleton: ${bg3dParsed.skeleton ? "present" : "missing"}`);
    console.log(`Bones: ${bg3dParsed.skeleton?.bones.length}`);
    console.log(`Animations: ${bg3dParsed.skeleton?.animations.length}`);
    
    if (bg3dParsed.skeleton) {
      // Check animation keyframes
      bg3dParsed.skeleton.animations.slice(0, 3).forEach(anim => {
        console.log(`\nAnimation: ${anim.name}`);
        const keyframeCount = Object.keys(anim.keyframes).length;
        console.log(`  Bones with keyframes: ${keyframeCount}`);
        
        // Check first bone's keyframes
        const firstBoneIdx = Object.keys(anim.keyframes)[0];
        if (firstBoneIdx) {
          const keyframes = anim.keyframes[parseInt(firstBoneIdx)];
          console.log(`  First bone has ${keyframes.length} keyframes`);
          if (keyframes.length > 0) {
            console.log(`    First keyframe tick: ${keyframes[0].tick}`);
            console.log(`    Last keyframe tick: ${keyframes[keyframes.length - 1].tick}`);
            console.log(`    Duration: ${keyframes[keyframes.length - 1].tick / 30.0}s`);
          }
        }
      });
    }
    
    console.log("\n=== Converting to glTF ===");
    const gltfDoc = bg3dParsedToGLTF(bg3dParsed);
    
    const animations = gltfDoc.getRoot().listAnimations();
    console.log(`\n=== glTF Animations ===`);
    console.log(`Total animations in glTF: ${animations.length}`);
    
    animations.slice(0, 5).forEach((anim, idx) => {
      const channels = anim.listChannels();
      const samplers = anim.listSamplers();
      console.log(`\nAnimation ${idx}: "${anim.getName()}"`);
      console.log(`  Channels: ${channels.length}`);
      console.log(`  Samplers: ${samplers.length}`);
      
      if (samplers.length > 0) {
        const sampler = samplers[0];
        const input = sampler.getInput();
        const output = sampler.getOutput();
        if (input) {
          const times = input.getArray();
          if (times) {
            console.log(`  Duration: ${times[times.length - 1]}s`);
          }
        }
      }
    });
  });
});
