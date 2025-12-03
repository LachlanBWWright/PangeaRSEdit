import { describe, it, expect } from "vitest";
import { parseSkeletonRsrcTS } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { parseBG3D } from "./parseBG3D";
import { readFileSync } from "fs";
import { join } from "path";

describe("Debug Conversion", () => {
  const ottoBg3dPath = join(
    __dirname,
    "../../../games/ottomatic/Data/Skeletons/Otto.bg3d",
  );
  const ottoSkeletonPath = join(
    __dirname,
    "../../../games/ottomatic/Data/Skeletons/Otto.skeleton.rsrc",
  );

  it("should show what happens in the conversion", async () => {
    // Load original files
    const originalBg3dData = readFileSync(ottoBg3dPath);
    const originalSkeletonData = readFileSync(ottoSkeletonPath);

    // Parse original files
    const originalSkeletonResource = parseSkeletonRsrcTS(
      originalSkeletonData.buffer.slice(
        originalSkeletonData.byteOffset,
        originalSkeletonData.byteOffset + originalSkeletonData.byteLength,
      ),
    );
    const originalBg3d = parseBG3D(
      originalBg3dData.buffer.slice(
        originalBg3dData.byteOffset,
        originalBg3dData.byteOffset + originalBg3dData.byteLength,
      ),
      originalSkeletonResource,
    );

    // Log original skeleton data
    console.log("=== ORIGINAL SKELETON ===");
    console.log("Bones:", originalBg3d.skeleton?.bones.length);
    console.log("Animations:", originalBg3d.skeleton?.animations.length);

    if (originalBg3d.skeleton?.animations[0]) {
      const anim = originalBg3d.skeleton.animations[0];
      console.log(
        `Animation 0 "${anim.name}": ${
          Object.keys(anim.keyframes).length
        } bones with keyframes`,
      );

      // Show first bone's first keyframe
      const boneKey = Object.keys(anim.keyframes)[0];
      const kf = anim.keyframes[parseInt(boneKey)][0];
      console.log(`  Bone ${boneKey} first keyframe:`, {
        tick: kf.tick,
        accelerationMode: kf.accelerationMode,
        coord: [kf.coordX, kf.coordY, kf.coordZ],
        rotation: [kf.rotationX, kf.rotationY, kf.rotationZ],
        scale: [kf.scaleX, kf.scaleY, kf.scaleZ],
      });
    }

    // Convert to glTF
    const gltf1 = await bg3dParsedToGLTF(originalBg3d);

    // Check what's in glTF
    console.log("\n=== GLTF DOCUMENT ===");
    const animations = gltf1.getRoot().listAnimations();
    console.log("Animations:", animations.length);

    if (animations.length > 0) {
      const anim = animations[0];
      console.log(
        `Animation 0 "${anim.getName()}": ${
          anim.listChannels().length
        } channels`,
      );

      // Show first channel details
      const channels = anim.listChannels();
      for (let i = 0; i < Math.min(3, channels.length); i++) {
        const channel = channels[i];
        const sampler = channel.getSampler();
        const target = channel.getTargetNode();
        const path = channel.getTargetPath();
        const inputAcc = sampler?.getInput();
        const outputAcc = sampler?.getOutput();

        console.log(`  Channel ${i}: ${target?.getName()} ${path}`);
        console.log(`    Input times: ${inputAcc?.getCount()} values`);
        console.log(`    Output values: ${outputAcc?.getCount()} values`);

        if (path === "rotation" && outputAcc) {
          const values = Array.from(outputAcc.getArray() as Float32Array).slice(
            0,
            4,
          );
          console.log(
            `    First quaternion: [${values
              .map((v) => v.toFixed(6))
              .join(", ")}]`,
          );
        }
      }
    }

    // Convert back to BG3D
    const roundtrip1Result = await gltfToBG3D(gltf1);

    console.log("\n=== ROUNDTRIP 1 SKELETON ===");
    console.log("Bones:", roundtrip1Result.skeleton?.bones.length);
    console.log("Animations:", roundtrip1Result.skeleton?.animations.length);

    if (roundtrip1Result.skeleton?.animations[0]) {
      const anim = roundtrip1Result.skeleton.animations[0];
      console.log(
        `Animation 0 "${anim.name}": ${
          Object.keys(anim.keyframes).length
        } bones with keyframes`,
      );

      // Show first bone's first keyframe
      const boneKey = Object.keys(anim.keyframes)[0];
      const kf = anim.keyframes[parseInt(boneKey)][0];
      console.log(`  Bone ${boneKey} first keyframe:`, {
        tick: kf.tick,
        accelerationMode: kf.accelerationMode,
        coord: [kf.coordX, kf.coordY, kf.coordZ],
        rotation: [kf.rotationX, kf.rotationY, kf.rotationZ],
        scale: [kf.scaleX, kf.scaleY, kf.scaleZ],
      });
    }

    // Compare original vs roundtrip1
    console.log("\n=== COMPARISON ===");
    if (originalBg3d.skeleton && roundtrip1Result.skeleton) {
      const origAnim = originalBg3d.skeleton.animations[0];
      const rt1Anim = roundtrip1Result.skeleton.animations[0];

      console.log(
        "Original keyframes by bone:",
        Object.keys(origAnim.keyframes)
          .map((k) => `${k}:${origAnim.keyframes[parseInt(k)].length}`)
          .join(", "),
      );
      console.log(
        "RT1 keyframes by bone:",
        Object.keys(rt1Anim.keyframes)
          .map((k) => `${k}:${rt1Anim.keyframes[parseInt(k)].length}`)
          .join(", "),
      );

      // Compare first bone's keyframes
      const origBoneKey = Object.keys(origAnim.keyframes)[0];
      const origKf = origAnim.keyframes[parseInt(origBoneKey)][0];
      const rt1Kf = rt1Anim.keyframes[parseInt(origBoneKey)]?.[0];

      if (origKf && rt1Kf) {
        console.log("\nFirst keyframe comparison (bone", origBoneKey, "):");
        console.log("  tick:", origKf.tick, "vs", rt1Kf.tick);
        console.log(
          "  accel:",
          origKf.accelerationMode,
          "vs",
          rt1Kf.accelerationMode,
        );
        console.log(
          "  coordX:",
          origKf.coordX.toFixed(6),
          "vs",
          rt1Kf.coordX.toFixed(6),
          "diff:",
          Math.abs(origKf.coordX - rt1Kf.coordX).toFixed(6),
        );
        console.log(
          "  coordY:",
          origKf.coordY.toFixed(6),
          "vs",
          rt1Kf.coordY.toFixed(6),
          "diff:",
          Math.abs(origKf.coordY - rt1Kf.coordY).toFixed(6),
        );
        console.log(
          "  coordZ:",
          origKf.coordZ.toFixed(6),
          "vs",
          rt1Kf.coordZ.toFixed(6),
          "diff:",
          Math.abs(origKf.coordZ - rt1Kf.coordZ).toFixed(6),
        );
        console.log(
          "  rotX:",
          origKf.rotationX.toFixed(6),
          "vs",
          rt1Kf.rotationX.toFixed(6),
          "diff:",
          Math.abs(origKf.rotationX - rt1Kf.rotationX).toFixed(6),
        );
        console.log(
          "  rotY:",
          origKf.rotationY.toFixed(6),
          "vs",
          rt1Kf.rotationY.toFixed(6),
          "diff:",
          Math.abs(origKf.rotationY - rt1Kf.rotationY).toFixed(6),
        );
        console.log(
          "  rotZ:",
          origKf.rotationZ.toFixed(6),
          "vs",
          rt1Kf.rotationZ.toFixed(6),
          "diff:",
          Math.abs(origKf.rotationZ - rt1Kf.rotationZ).toFixed(6),
        );
      }
    }

    expect(true).toBe(true);
  });
});
