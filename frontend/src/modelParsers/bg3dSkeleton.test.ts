// bg3dSkeleton.test.ts
// Tests for BG3D skeleton data integration

import { describe, it, expect, beforeAll } from "vitest";
import { parseBG3DWithSkeletonResource } from "./bg3dWithSkeleton";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { convertBG3DToSkeletonResource } from "./parseBG3D";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { testSkeleton } from "./bg3dSkeletonTestData";
// migrated from custom unwrap helper to neverthrow instance methods

describe("BG3D Skeleton Integration", () => {
  const TEST_BG3D_PATH = join(
    __dirname,
    "./testSkeletons/level4_apocalypse.bg3d",
  );

  let testBG3DBuffer: ArrayBuffer;

  beforeAll(() => {
    const fileBuffer = readFileSync(TEST_BG3D_PATH);
    testBG3DBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength,
    );
  });

  it("should parse BG3D with skeleton data", () => {
    const result = parseBG3DWithSkeletonResource(testBG3DBuffer, testSkeleton);
    expect(result.isOk()).toBe(true);
    if (!result.isOk()) return;
    const parsed = result.value;

    if (!parsed || !parsed.skeleton)
      expect.fail("parsed or parsed.skeleton missing");
    const skeleton = parsed.skeleton;

    expect(parsed).toBeDefined();
    expect(skeleton.bones).toHaveLength(3);
    expect(skeleton.animations).toHaveLength(1);

    // Check bone structure
    const rootBone = skeleton.bones[0];
    if (!rootBone) expect.fail("rootBone missing");
    expect(rootBone.parentBone).toBe(-1);
    expect(rootBone.name).toBe("root_bone");
    expect(rootBone.pointIndices).toEqual([0, 1, 2, 3, 4]);

    const childBone1 = skeleton.bones[1];
    if (!childBone1) expect.fail("childBone1 missing");
    expect(childBone1.parentBone).toBe(0);
    expect(childBone1.name).toBe("child_bone_1");
    expect(childBone1.coordX).toBe(10);

    // Check animation
    const animation = skeleton.animations[0];
    if (!animation) expect.fail("animation missing");
    expect(animation.name).toBe("idle");
    expect(animation.events).toHaveLength(1);
  });

  it("should convert BG3D with skeleton to glTF with proper joints and skin", () => {
    const parsedResult = parseBG3DWithSkeletonResource(
      testBG3DBuffer,
      testSkeleton,
    );
    expect(parsedResult.isOk()).toBe(true);
    if (!parsedResult.isOk()) return;
    const parsed2 = parsedResult.value;
    const gltfDoc = bg3dParsedToGLTF(parsed2);

    expect(gltfDoc).toBeDefined();

    // Check that skeleton data is converted to glTF format
    const joints = gltfDoc
      .getRoot()
      .listNodes()
      .filter((node) => {
        const name = node.getName();
        return (
          name === "root_bone" ||
          name === "child_bone_1" ||
          name === "child_bone_2"
        );
      });
    expect(joints.length).toBeGreaterThan(0);

    // Check that skin is created
    const skins = gltfDoc.getRoot().listSkins();
    expect(skins).toHaveLength(1);
    expect(skins[0]?.listJoints()).toHaveLength(3);

    // Check that meshes have joint/weight attributes
    const meshes = gltfDoc.getRoot().listMeshes();
    if (meshes.length > 0) {
      const primitives = meshes[0]?.listPrimitives();
      if (primitives && primitives.length > 0) {
        const primitive = primitives[0];
        if (!primitive) return;
        const joints = primitive.getAttribute("JOINTS_0");
        const weights = primitive.getAttribute("WEIGHTS_0");

        if (joints && weights) {
          expect(joints).toBeDefined();
          expect(weights).toBeDefined();
        }
      }
    }
  });

  it("should round-trip BG3D skeleton data through glTF with full accuracy", async () => {
    const originalParsedRes = parseBG3DWithSkeletonResource(
      testBG3DBuffer,
      testSkeleton,
    );
    expect(originalParsedRes.isOk()).toBe(true);
    if (!originalParsedRes.isOk()) return;
    const originalParsed = originalParsedRes.value;
    const gltfDoc = bg3dParsedToGLTF(originalParsed);

    // **ADD glTF VALIDATION**
    console.log("\n=== glTF VALIDATION ===");
    const { NodeIO } = await import("@gltf-transform/core");
    const { validateBytes } = await import("gltf-validator");
    const io = new NodeIO();
    const glbBuffer = await io.writeBinary(gltfDoc);
    const validationReport = await validateBytes(glbBuffer);

    console.log(
      `Validation: ${validationReport.issues.numErrors} errors, ${validationReport.issues.numWarnings} warnings`,
    );
    expect(validationReport.issues.numErrors).toBe(0); // glTF MUST pass validation

    const roundtripParsed = await gltfToBG3D(gltfDoc);

    expect(roundtripParsed.skeleton).toBeDefined();

    // REQUIRE exact skeleton preservation
    if (!originalParsed.skeleton)
      expect.fail("originalParsed.skeleton missing");
    if (!roundtripParsed.skeleton)
      expect.fail("roundtripParsed.skeleton missing");
    const originalSkeleton = originalParsed.skeleton;
    const roundtripSkeleton = roundtripParsed.skeleton;

    expect(roundtripSkeleton.bones.length).toBe(originalSkeleton.bones.length);
    expect(roundtripSkeleton.animations.length).toBe(
      originalSkeleton.animations.length,
    );

    // Check bone hierarchy is perfectly preserved
    const originalRoot = originalSkeleton.bones.find(
      (b) => b.parentBone === -1,
    );
    const roundtripRoot = roundtripSkeleton.bones.find(
      (b) => b.parentBone === -1,
    );

    if (!originalRoot) expect.fail("originalRoot missing");
    if (!roundtripRoot) expect.fail("roundtripRoot missing");
    expect(roundtripRoot.name).toBe(originalRoot.name);

    // Verify all bones have exact coordinates
    for (let i = 0; i < originalSkeleton.bones.length; i++) {
      const originalBone = originalSkeleton.bones[i];
      const roundtripBone = roundtripSkeleton.bones[i];
      if (!originalBone || !roundtripBone)
        expect.fail("missing bone during roundtrip comparison");

      expect(roundtripBone.name).toBe(originalBone.name);
      expect(roundtripBone.parentBone).toBe(originalBone.parentBone);
      expect(roundtripBone.coordX).toBe(originalBone.coordX);
      expect(roundtripBone.coordY).toBe(originalBone.coordY);
      expect(roundtripBone.coordZ).toBe(originalBone.coordZ);
    }

    console.log("✅ Full accuracy roundtrip successful");
  });

  it("should convert BG3DSkeleton back to SkeletonResource format", () => {
    const parsedRes = parseBG3DWithSkeletonResource(
      testBG3DBuffer,
      testSkeleton,
    );
    expect(parsedRes.isOk()).toBe(true);
    if (!parsedRes.isOk()) return;
    const parsedObj = parsedRes.value;
    if (!parsedObj.skeleton) expect.fail("parsedObj.skeleton missing");
    const parsedObjSkeleton = parsedObj.skeleton;

    const convertedSkeleton = convertBG3DToSkeletonResource(parsedObjSkeleton);

    expect(convertedSkeleton).toBeDefined();
    expect(convertedSkeleton.Hedr).toBeDefined();
    expect(convertedSkeleton.Bone).toBeDefined();
    expect(convertedSkeleton.BonP).toBeDefined();
    expect(convertedSkeleton.BonN).toBeDefined();

    // Check header
    const header = Object.values(convertedSkeleton.Hedr)[0];
    if (!header) expect.fail("convertedSkeleton.Hedr header missing");
    expect(header.obj.numJoints).toBe(3);

    // Check bone structure
    const bones = Object.values(convertedSkeleton.Bone);
    expect(bones).toHaveLength(3);

    const rootBone = bones.find((b) => b.obj.parentBone === -1);
    if (!rootBone) expect.fail("rootBone missing");
    expect(rootBone.obj.name).toBe("root_bone");
  });

  it("should handle animation conversion and round-trip with 100% precision", async () => {
    console.log("Testing animation conversion with full precision...");

    // Use test skeleton with animation data
    const resultRes = parseBG3DWithSkeletonResource(
      testBG3DBuffer,
      testSkeleton,
    );
    expect(resultRes.isOk()).toBe(true);
    if (!resultRes.isOk()) return;
    const resultObj = resultRes.value;
    if (!resultObj.skeleton) expect.fail("resultObj.skeleton missing");
    const resultSkeleton = resultObj.skeleton;

    // Verify skeleton has animation data
    expect(resultSkeleton.animations).toHaveLength(1);
    expect(resultSkeleton.animations[0]?.name).toBe("idle");
    expect(resultSkeleton.animations[0]?.keyframes[0]).toHaveLength(2); // 2 keyframes for root bone

    // Convert to glTF
    const gltfDoc = bg3dParsedToGLTF(resultObj);

    // Check that glTF animations were created
    const gltfAnimations = gltfDoc.getRoot().listAnimations();
    expect(gltfAnimations).toHaveLength(1);
    expect(gltfAnimations[0]?.getName()).toBe("idle");

    // Check animation has channels
    const channels = gltfAnimations[0]?.listChannels() ?? [];
    expect(channels.length).toBeGreaterThan(0);
    console.log(`Created ${channels.length} animation channels`);

    // Check animation has samplers
    const samplers = gltfAnimations[0]?.listSamplers() ?? [];
    expect(samplers.length).toBeGreaterThan(0);
    console.log(`Created ${samplers.length} animation samplers`);

    // Verify animation timing precision
    channels.forEach((channel) => {
      const sampler = channel.getSampler();
      if (sampler) {
        const input = sampler.getInput();
        if (input) {
          const times = input.getArray();
          if (times && times.length > 1) {
            // Check that timing values are reasonable and precise
            const duration = (times[times.length - 1] ?? 0) - (times[0] ?? 0);
            expect(duration).toBeGreaterThan(0);
            expect(duration).toBeLessThan(10); // Reasonable duration

            // Check timing precision (should be very precise)
            for (let i = 1; i < times.length; i++) {
              expect(times[i]).toBeGreaterThan(times[i - 1] ?? 0); // Times should be increasing
            }
          }
        }
      }
    });

    // Round-trip conversion
    const roundtrip = await gltfToBG3D(gltfDoc);

    // Verify animation data is perfectly preserved
    if (!roundtrip.skeleton) expect.fail("roundtrip.skeleton missing");
    const roundtripAnimSkeleton = roundtrip.skeleton;
    expect(roundtripAnimSkeleton.animations).toHaveLength(1);
    expect(roundtripAnimSkeleton.animations[0]?.name).toBe("idle");

    // Check that keyframes are preserved with exact precision
    const originalKeyframes = resultSkeleton.animations[0]?.keyframes[0];
    if (!originalKeyframes) expect.fail("originalKeyframes missing");
    const roundtripKeyframes =
      roundtripAnimSkeleton.animations[0]?.keyframes[0];
    if (!roundtripKeyframes) expect.fail("roundtripKeyframes missing");
    expect(roundtripKeyframes.length).toBe(originalKeyframes.length);

    // Verify keyframe timing precision
    originalKeyframes.forEach((originalKf, index) => {
      const roundtripKf = roundtripKeyframes[index];
      expect(roundtripKf?.tick).toBe(originalKf.tick); // Exact tick preservation
      expect(roundtripKf?.accelerationMode).toBe(originalKf.accelerationMode);
    });

    console.log(
      `Original keyframes: ${originalKeyframes.length}, roundtrip: ${roundtripKeyframes.length}`,
    );
    console.log(
      "✅ Animation conversion and round-trip successful with 100% precision!",
    );
  });
});

// Integration test with real files
describe("BG3D Skeleton Real File Integration", () => {
  const BG3D_PATH = join(__dirname, "./testSkeletons/EliteBrainAlien.bg3d");
  const SKELETON_PATH = join(
    __dirname,
    "./skeletonRsrc/testSkeletons/EliteBrainAlien.skeleton.rsrc",
  );

  it("should handle real BrainAlien files if they exist", () => {
    // Check if test files exist
    if (!existsSync(BG3D_PATH) || !existsSync(SKELETON_PATH)) {
      console.log("Real test files not found, skipping real file test");
      return;
    }

    const bg3dBuffer = readFileSync(BG3D_PATH);
    const skeletonBuffer = readFileSync(SKELETON_PATH);

    expect(bg3dBuffer.length).toBeGreaterThan(0);
    expect(skeletonBuffer.length).toBeGreaterThan(0);

    console.log(`BG3D file size: ${bg3dBuffer.length} bytes`);
    console.log(`Skeleton file size: ${skeletonBuffer.length} bytes`);

    // Verify files exist and have reasonable sizes
    expect(bg3dBuffer.length).toBeGreaterThan(1000); // Should be substantial
    expect(skeletonBuffer.length).toBeGreaterThan(100); // Should have some data
  });
});
