import { describe, it, expect } from "vitest";
import { parseSkeletonRsrc } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { parseBG3D } from "./parseBG3D";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

describe("Debug Skeleton Roundtrip", () => {
  const ottoBg3dPath = join(
    __dirname,
    "../../../games/ottomatic/Data/Skeletons/Otto.bg3d",
  );
  const ottoSkeletonPath = join(
    __dirname,
    "../../../games/ottomatic/Data/Skeletons/Otto.skeleton.rsrc",
  );

  it("should have stable keyframe counts between RT1 and RT2", async () => {
    // Skip test if files don't exist
    if (!existsSync(ottoBg3dPath) || !existsSync(ottoSkeletonPath)) {
      console.log("Skipping test - Otto skeleton files not found");
      return;
    }

    // Load and parse
    const bg3dData = readFileSync(ottoBg3dPath);
    const skeletonData = readFileSync(ottoSkeletonPath);

    const skeletonResource = await parseSkeletonRsrc(
      skeletonData.buffer.slice(
        skeletonData.byteOffset,
        skeletonData.byteOffset + skeletonData.byteLength,
      ),
    );
    const bg3dResult = parseBG3D(
      bg3dData.buffer.slice(
        bg3dData.byteOffset,
        bg3dData.byteOffset + bg3dData.byteLength,
      ),
      skeletonResource,
    );

    // Handle Result type
    if (!bg3dResult.isOk()) {
      console.log("Failed to parse BG3D:", bg3dResult.error);
      return;
    }
    const bg3d = bg3dResult.value;

    // First roundtrip
    const gltf1 = await bg3dParsedToGLTF(bg3d);
    const rt1 = await gltfToBG3D(gltf1);

    // Second roundtrip
    const gltf2 = await bg3dParsedToGLTF(rt1);
    const rt2 = await gltfToBG3D(gltf2);

    // Compare keyframe structure for all animations
    if (!rt1.skeleton || !rt2.skeleton) {
      console.log("Missing skeleton data for comparison");
      return;
    }

    expect(rt1.skeleton.animations.length).toBe(
      rt2.skeleton.animations.length,
    );

    for (
      let animIdx = 0;
      animIdx < rt1.skeleton.animations.length;
      animIdx++
    ) {
      const rt1Anim = rt1.skeleton.animations[animIdx];
      const rt2Anim = rt2.skeleton.animations[animIdx];

      if (!rt1Anim || !rt2Anim) continue;

      const rt1Bones = Object.keys(rt1Anim.keyframes).sort(
        (a, b) => parseInt(a) - parseInt(b),
      );
      const rt2Bones = Object.keys(rt2Anim.keyframes).sort(
        (a, b) => parseInt(a) - parseInt(b),
      );

      // Check that same bones have keyframes
      expect(rt1Bones).toEqual(rt2Bones);

      // Check that same number of keyframes per bone
      for (const boneIdx of rt1Bones) {
        const rt1Kfs = rt1Anim.keyframes[parseInt(boneIdx)];
        const rt2Kfs = rt2Anim.keyframes[parseInt(boneIdx)];
        if (!rt1Kfs || !rt2Kfs) continue;
        expect(rt1Kfs.length).toBe(rt2Kfs.length);

        // Check that ticks match
        for (let kfIdx = 0; kfIdx < rt1Kfs.length; kfIdx++) {
          const rt1Kf = rt1Kfs[kfIdx];
          const rt2Kf = rt2Kfs[kfIdx];
          if (rt1Kf && rt2Kf) {
            expect(rt1Kf.tick).toBe(rt2Kf.tick);
          }
        }
      }
    }
  });

  it("should have similar rotation values between RT1 and RT2", async () => {
    // Skip test if files don't exist
    if (!existsSync(ottoBg3dPath) || !existsSync(ottoSkeletonPath)) {
      console.log("Skipping test - Otto skeleton files not found");
      return;
    }

    // Load and parse
    const bg3dData = readFileSync(ottoBg3dPath);
    const skeletonData = readFileSync(ottoSkeletonPath);

    const skeletonResource = await parseSkeletonRsrc(
      skeletonData.buffer.slice(
        skeletonData.byteOffset,
        skeletonData.byteOffset + skeletonData.byteLength,
      ),
    );
    const bg3dResult = parseBG3D(
      bg3dData.buffer.slice(
        bg3dData.byteOffset,
        bg3dData.byteOffset + bg3dData.byteLength,
      ),
      skeletonResource,
    );

    // Handle Result type
    if (!bg3dResult.isOk()) {
      console.log("Failed to parse BG3D:", bg3dResult.error);
      return;
    }
    const bg3d = bg3dResult.value;

    // First roundtrip
    const gltf1 = await bg3dParsedToGLTF(bg3d);
    const rt1 = await gltfToBG3D(gltf1);

    // Second roundtrip
    const gltf2 = await bg3dParsedToGLTF(rt1);
    const rt2 = await gltfToBG3D(gltf2);

    // Compare rotation values for first animation, first bone with keyframes
    if (!rt1.skeleton || !rt2.skeleton) {
      console.log("Missing skeleton data for comparison");
      return;
    }

    const rt1Anim = rt1.skeleton.animations[0];
    const rt2Anim = rt2.skeleton.animations[0];

    if (!rt1Anim || !rt2Anim) {
      console.log("Missing animation data for comparison");
      return;
    }

    const boneIdx = Object.keys(rt1Anim.keyframes)[0];
    if (!boneIdx) {
      console.log("No bone keyframes to compare");
      return;
    }

    const rt1Kfs = rt1Anim.keyframes[parseInt(boneIdx)];
    const rt2Kfs = rt2Anim.keyframes[parseInt(boneIdx)];

    if (!rt1Kfs || !rt2Kfs) {
      console.log("No keyframes for bone", boneIdx);
      return;
    }

    if (rt1Kfs.length > 0 && rt2Kfs.length > 0) {
      const rt1Kf = rt1Kfs[0];
      const rt2Kf = rt2Kfs[0];

      if (rt1Kf && rt2Kf) {
        // Rotation values should be very close (allowing for float precision)
        expect(rt1Kf.rotationX).toBeCloseTo(rt2Kf.rotationX, 4);
        expect(rt1Kf.rotationY).toBeCloseTo(rt2Kf.rotationY, 4);
        expect(rt1Kf.rotationZ).toBeCloseTo(rt2Kf.rotationZ, 4);

        // Coords should also be very close
        expect(rt1Kf.coordX).toBeCloseTo(rt2Kf.coordX, 4);
        expect(rt1Kf.coordY).toBeCloseTo(rt2Kf.coordY, 4);
        expect(rt1Kf.coordZ).toBeCloseTo(rt2Kf.coordZ, 4);
      }
    }
  });
});
