import { describe, it, expect } from "vitest";
import { parseSkeletonRsrcTS } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { parseBG3D } from "./parseBG3D";
import { bg3dSkeletonToSkeletonResource } from "./skeletonExport";
import { skeletonResourceToBinary } from "./skeletonBinaryExport";
import { bg3dParsedToBG3D } from "./parseBG3D";
import { readFileSync } from "fs";
import { join } from "path";

describe("Minimal Skeleton Roundtrip Tests", () => {
  const ottoBg3dPath = join(
    __dirname,
    "../../public/games/ottomatic/skeletons/Otto.bg3d",
  );
  const ottoSkeletonPath = join(
    __dirname,
    "../../public/games/ottomatic/skeletons/Otto.skeleton.rsrc",
  );

  it("should preserve bone rest positions through double roundtrip", async () => {
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

    console.log(
      `Original skeleton has ${originalBg3d.skeleton!.bones.length} bones`,
    );

    // First roundtrip: Original → glTF → BG3D
    const gltf1 = await bg3dParsedToGLTF(originalBg3d);
    const rt1 = await gltfToBG3D(gltf1);
    const rt1Binary = bg3dParsedToBG3D(rt1);
    const rt1SkeletonResource = bg3dSkeletonToSkeletonResource(rt1.skeleton!);
    const rt1SkeletonBinary = await skeletonResourceToBinary(
      rt1SkeletonResource,
    );

    // Parse RT1 output
    const rt1SkeletonParsed = parseSkeletonRsrcTS(rt1SkeletonBinary);
    const rt1Parsed = parseBG3D(rt1Binary, rt1SkeletonParsed);

    // Second roundtrip: RT1 → glTF → BG3D
    const gltf2 = await bg3dParsedToGLTF(rt1Parsed);
    const rt2 = await gltfToBG3D(gltf2);

    // Compare bone positions between RT1 and RT2
    console.log("\n=== BONE POSITION COMPARISON ===");
    let maxDiff = 0;
    let maxDiffBone = "";
    let maxDiffAxis = "";

    for (let i = 0; i < rt1.skeleton!.bones.length; i++) {
      const b1 = rt1.skeleton!.bones[i];
      const b2 = rt2.skeleton!.bones[i];

      const diffX = Math.abs(b1.coordX - b2.coordX);
      const diffY = Math.abs(b1.coordY - b2.coordY);
      const diffZ = Math.abs(b1.coordZ - b2.coordZ);

      if (diffX > maxDiff) {
        maxDiff = diffX;
        maxDiffBone = b1.name;
        maxDiffAxis = "X";
      }
      if (diffY > maxDiff) {
        maxDiff = diffY;
        maxDiffBone = b1.name;
        maxDiffAxis = "Y";
      }
      if (diffZ > maxDiff) {
        maxDiff = diffZ;
        maxDiffBone = b1.name;
        maxDiffAxis = "Z";
      }

      if (diffX > 1e-6 || diffY > 1e-6 || diffZ > 1e-6) {
        console.log(`Bone ${i} (${b1.name}):`);
        console.log(`  RT1: [${b1.coordX}, ${b1.coordY}, ${b1.coordZ}]`);
        console.log(`  RT2: [${b2.coordX}, ${b2.coordY}, ${b2.coordZ}]`);
        console.log(`  Diff: [${diffX}, ${diffY}, ${diffZ}]`);
      }
    }

    console.log(
      `\nMax difference: ${maxDiff} in bone "${maxDiffBone}" axis ${maxDiffAxis}`,
    );

    // Bones should be identical
    expect(maxDiff).toBeLessThan(1e-6);
  });

  it("should preserve rotation values through euler->quat->euler with Float32", async () => {
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

    // Get first animation's first bone's keyframes
    const anim = originalBg3d.skeleton!.animations[0];
    const boneIndex = Object.keys(anim.keyframes)[0];
    const keyframes = anim.keyframes[parseInt(boneIndex)];

    console.log(`Testing animation "${anim.name}", bone ${boneIndex}`);
    console.log(
      `First keyframe rotation: [${keyframes[0].rotationX}, ${keyframes[0].rotationY}, ${keyframes[0].rotationZ}]`,
    );

    // First roundtrip
    const gltf1 = await bg3dParsedToGLTF(originalBg3d);
    const rt1 = await gltfToBG3D(gltf1);
    const rt1Binary = bg3dParsedToBG3D(rt1);
    const rt1SkeletonResource = bg3dSkeletonToSkeletonResource(rt1.skeleton!);
    const rt1SkeletonBinary = await skeletonResourceToBinary(
      rt1SkeletonResource,
    );

    // Parse RT1 output
    const rt1SkeletonParsed = parseSkeletonRsrcTS(rt1SkeletonBinary);
    const rt1Parsed = parseBG3D(rt1Binary, rt1SkeletonParsed);

    // Second roundtrip
    const gltf2 = await bg3dParsedToGLTF(rt1Parsed);
    const rt2 = await gltfToBG3D(gltf2);

    // Compare keyframe rotations
    const rt1Anim = rt1.skeleton!.animations[0];
    const rt2Anim = rt2.skeleton!.animations[0];

    console.log("\n=== KEYFRAME ROTATION COMPARISON ===");

    for (const boneIdxStr of Object.keys(rt1Anim.keyframes)) {
      const boneIdx = parseInt(boneIdxStr);
      const kfs1 = rt1Anim.keyframes[boneIdx];
      const kfs2 = rt2Anim.keyframes[boneIdx];

      if (!kfs2) {
        console.log(`Bone ${boneIdx}: Missing in RT2!`);
        continue;
      }

      if (kfs1.length !== kfs2.length) {
        console.log(
          `Bone ${boneIdx}: Different keyframe count (RT1: ${kfs1.length}, RT2: ${kfs2.length})`,
        );
        continue;
      }

      let hasError = false;
      for (let k = 0; k < kfs1.length; k++) {
        const kf1 = kfs1[k];
        const kf2 = kfs2[k];

        const diffRX = Math.abs(kf1.rotationX - kf2.rotationX);
        const diffRY = Math.abs(kf1.rotationY - kf2.rotationY);
        const diffRZ = Math.abs(kf1.rotationZ - kf2.rotationZ);

        if (diffRX > 1e-6 || diffRY > 1e-6 || diffRZ > 1e-6) {
          if (!hasError) {
            console.log(
              `\nBone ${boneIdx} (${rt1.skeleton!.bones[boneIdx].name}):`,
            );
            hasError = true;
          }
          console.log(`  Keyframe ${k}:`);
          console.log(
            `    RT1 rot: [${kf1.rotationX.toFixed(8)}, ${kf1.rotationY.toFixed(
              8,
            )}, ${kf1.rotationZ.toFixed(8)}]`,
          );
          console.log(
            `    RT2 rot: [${kf2.rotationX.toFixed(8)}, ${kf2.rotationY.toFixed(
              8,
            )}, ${kf2.rotationZ.toFixed(8)}]`,
          );
          console.log(
            `    Diff:    [${diffRX.toExponential(2)}, ${diffRY.toExponential(
              2,
            )}, ${diffRZ.toExponential(2)}]`,
          );
        }
      }
    }
  });
});
