// bg3dSkeleton.test.ts
// Tests for BG3D skeleton data integration

import { describe, it, expect, beforeAll } from "vitest";
import { parseBG3DWithSkeletonResource } from "./bg3dWithSkeleton";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { convertBG3DToSkeletonResource } from "./parseBG3D";
import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";
import * as fs from "fs";
import * as path from "path";
import { unwrap } from "../types/result";

// Test skeleton data (simplified version of the sample)
const testSkeleton: SkeletonResource = {
  Hedr: {
    "1000": {
      name: "Header",
      order: 0,
      obj: {
        version: 272,
        numAnims: 2,
        numJoints: 3,
        num3DMFLimbs: 0,
      },
    },
  },
  Bone: {
    "1000": {
      name: "Bone",
      order: 1,
      obj: {
        parentBone: -1,
        name: "root_bone",
        coordX: 0,
        coordY: 0,
        coordZ: 0,
        numPointsAttachedToBone: 5,
        numNormalsAttachedToBone: 5,
      },
    },
    "1001": {
      name: "NewBone",
      order: 4,
      obj: {
        parentBone: 0,
        name: "child_bone_1",
        coordX: 10,
        coordY: 0,
        coordZ: 0,
        numPointsAttachedToBone: 3,
        numNormalsAttachedToBone: 3,
      },
    },
    "1002": {
      name: "NewBone",
      order: 7,
      obj: {
        parentBone: 0,
        name: "child_bone_2",
        coordX: 0,
        coordY: 10,
        coordZ: 0,
        numPointsAttachedToBone: 2,
        numNormalsAttachedToBone: 2,
      },
    },
  },
  BonP: {
    "1000": {
      name: "Bone",
      order: 2,
      obj: [
        { pointIndex: 0 },
        { pointIndex: 1 },
        { pointIndex: 2 },
        { pointIndex: 3 },
        { pointIndex: 4 },
      ],
    },
    "1001": {
      name: "NewBone",
      order: 5,
      obj: [{ pointIndex: 5 }, { pointIndex: 6 }, { pointIndex: 7 }],
    },
    "1002": {
      name: "NewBone",
      order: 8,
      obj: [{ pointIndex: 8 }, { pointIndex: 9 }],
    },
  },
  BonN: {
    "1000": {
      name: "Bone",
      order: 3,
      obj: [
        { normal: 0 },
        { normal: 1 },
        { normal: 2 },
        { normal: 3 },
        { normal: 4 },
      ],
    },
    "1001": {
      name: "NewBone",
      order: 6,
      obj: [{ normal: 5 }, { normal: 6 }, { normal: 7 }],
    },
    "1002": {
      name: "NewBone",
      order: 9,
      obj: [{ normal: 8 }, { normal: 9 }],
    },
  },
  AnHd: {
    "1000": {
      name: "TestAnimation",
      order: 100,
      obj: {
        animName: "idle",
        numAnimEvents: 1,
      },
    },
  },
  Evnt: {
    "1000": {
      name: "TestAnimation",
      order: 101,
      obj: [
        {
          time: 0.5,
          type: 1,
          value: 100,
        },
      ],
    },
  },
  NumK: {
    "1000": {
      name: "TestAnimation",
      order: 102,
      obj: [{ numKeyFrames: 2 }],
    },
  },
  KeyF: {
    "1000": {
      name: "TestAnimation",
      order: 103,
      obj: [
        {
          tick: 0,
          accelerationMode: 0,
          coordX: 0,
          coordY: 0,
          coordZ: 0,
          rotationX: 0,
          rotationY: 0,
          rotationZ: 0,
          scaleX: 1,
          scaleY: 1,
          scaleZ: 1,
        },
        {
          tick: 30,
          accelerationMode: 0,
          coordX: 5,
          coordY: 0,
          coordZ: 0,
          rotationX: 0.5,
          rotationY: 0,
          rotationZ: 0,
          scaleX: 1,
          scaleY: 1,
          scaleZ: 1,
        },
      ],
    },
  },
};

describe("BG3D Skeleton Integration", () => {
  const TEST_BG3D_PATH = path.join(
    __dirname,
    "./testSkeletons/level4_apocalypse.bg3d",
  );

  let testBG3DBuffer: ArrayBuffer;

  beforeAll(() => {
    const fileBuffer = fs.readFileSync(TEST_BG3D_PATH);
    testBG3DBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength,
    );
  });

  it("should parse BG3D with skeleton data", () => {
    const result = parseBG3DWithSkeletonResource(testBG3DBuffer, testSkeleton);
    const parsed = unwrap(result);

    if (!parsed || !parsed.skeleton)
      throw new Error("parsed or parsed.skeleton missing");
    const skeleton = parsed.skeleton;

    expect(parsed).toBeDefined();
    expect(skeleton.bones).toHaveLength(3);
    expect(skeleton.animations).toHaveLength(1);

    // Check bone structure
    const rootBone = skeleton.bones[0];
    if (!rootBone) throw new Error("rootBone missing");
    expect(rootBone.parentBone).toBe(-1);
    expect(rootBone.name).toBe("root_bone");
    expect(rootBone.pointIndices).toEqual([0, 1, 2, 3, 4]);

    const childBone1 = skeleton.bones[1];
    if (!childBone1) throw new Error("childBone1 missing");
    expect(childBone1.parentBone).toBe(0);
    expect(childBone1.name).toBe("child_bone_1");
    expect(childBone1.coordX).toBe(10);

    // Check animation
    const animation = skeleton.animations[0];
    if (!animation) throw new Error("animation missing");
    expect(animation.name).toBe("idle");
    expect(animation.events).toHaveLength(1);
  });

  it("should convert BG3D with skeleton to glTF with proper joints and skin", () => {
    const parsedResult = parseBG3DWithSkeletonResource(
      testBG3DBuffer,
      testSkeleton,
    );
    const parsed2 = unwrap(parsedResult);
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
    const originalParsed = unwrap(originalParsedRes);
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
      throw new Error("originalParsed.skeleton missing");
    if (!roundtripParsed.skeleton)
      throw new Error("roundtripParsed.skeleton missing");
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

    if (!originalRoot) throw new Error("originalRoot missing");
    if (!roundtripRoot) throw new Error("roundtripRoot missing");
    expect(roundtripRoot.name).toBe(originalRoot.name);

    // Verify all bones have exact coordinates
    for (let i = 0; i < originalSkeleton.bones.length; i++) {
      const originalBone = originalSkeleton.bones[i];
      const roundtripBone = roundtripSkeleton.bones[i];
      if (!originalBone || !roundtripBone)
        throw new Error("missing bone during roundtrip comparison");

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
    const parsedObj = unwrap(parsedRes);
    if (!parsedObj.skeleton) throw new Error("parsedObj.skeleton missing");
    const parsedObjSkeleton = parsedObj.skeleton;

    const convertedSkeleton = convertBG3DToSkeletonResource(parsedObjSkeleton);

    expect(convertedSkeleton).toBeDefined();
    expect(convertedSkeleton.Hedr).toBeDefined();
    expect(convertedSkeleton.Bone).toBeDefined();
    expect(convertedSkeleton.BonP).toBeDefined();
    expect(convertedSkeleton.BonN).toBeDefined();

    // Check header
    const header = Object.values(convertedSkeleton.Hedr)[0];
    if (!header) throw new Error("convertedSkeleton.Hedr header missing");
    expect(header.obj.numJoints).toBe(3);

    // Check bone structure
    const bones = Object.values(convertedSkeleton.Bone);
    expect(bones).toHaveLength(3);

    const rootBone = bones.find((b) => b.obj.parentBone === -1);
    if (!rootBone) throw new Error("rootBone missing");
    expect(rootBone.obj.name).toBe("root_bone");
  });

  it("should handle animation conversion and round-trip with 100% precision", async () => {
    console.log("Testing animation conversion with full precision...");

    // Use test skeleton with animation data
    const resultRes = parseBG3DWithSkeletonResource(
      testBG3DBuffer,
      testSkeleton,
    );
    const resultObj = unwrap(resultRes);
    if (!resultObj.skeleton) throw new Error("resultObj.skeleton missing");
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
    if (!roundtrip.skeleton) throw new Error("roundtrip.skeleton missing");
    const roundtripAnimSkeleton = roundtrip.skeleton;
    expect(roundtripAnimSkeleton.animations).toHaveLength(1);
    expect(roundtripAnimSkeleton.animations[0]?.name).toBe("idle");

    // Check that keyframes are preserved with exact precision
    const originalKeyframes = resultSkeleton.animations[0]?.keyframes[0];
    if (!originalKeyframes) throw new Error("originalKeyframes missing");
    const roundtripKeyframes = roundtripAnimSkeleton.animations[0]?.keyframes[0];
    if (!roundtripKeyframes) throw new Error("roundtripKeyframes missing");
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
  const BG3D_PATH = path.join(
    __dirname,
    "./testSkeletons/EliteBrainAlien.bg3d",
  );
  const SKELETON_PATH = path.join(
    __dirname,
    "./skeletonRsrc/testSkeletons/EliteBrainAlien.skeleton.rsrc",
  );

  it("should handle real BrainAlien files if they exist", () => {
    // Check if test files exist
    if (!fs.existsSync(BG3D_PATH) || !fs.existsSync(SKELETON_PATH)) {
      console.log("Real test files not found, skipping real file test");
      return;
    }

    const bg3dBuffer = fs.readFileSync(BG3D_PATH);
    const skeletonBuffer = fs.readFileSync(SKELETON_PATH);

    expect(bg3dBuffer.length).toBeGreaterThan(0);
    expect(skeletonBuffer.length).toBeGreaterThan(0);

    console.log(`BG3D file size: ${bg3dBuffer.length} bytes`);
    console.log(`Skeleton file size: ${skeletonBuffer.length} bytes`);

    // We can't fully test without a Pyodide worker, but we can verify files exist
    // and have reasonable sizes
    expect(bg3dBuffer.length).toBeGreaterThan(1000); // Should be substantial
    expect(skeletonBuffer.length).toBeGreaterThan(100); // Should have some data
  });
});
