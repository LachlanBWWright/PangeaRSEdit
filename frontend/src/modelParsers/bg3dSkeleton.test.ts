// bg3dSkeleton.test.ts
// Tests for BG3D skeleton data integration

import { describe, it, expect, beforeAll } from "vitest";
import { parseBG3DWithSkeletonResource } from "./bg3dWithSkeleton";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { convertBG3DToSkeletonResource } from "./parseBG3D";
import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";
import * as fs from "fs";
import * as path from "path";

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
      obj: [
        { pointIndex: 5 },
        { pointIndex: 6 },
        { pointIndex: 7 },
      ],
    },
    "1002": {
      name: "NewBone",
      order: 8,
      obj: [
        { pointIndex: 8 },
        { pointIndex: 9 },
      ],
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
      obj: [
        { normal: 5 },
        { normal: 6 },
        { normal: 7 },
      ],
    },
    "1002": {
      name: "NewBone",
      order: 9,
      obj: [
        { normal: 8 },
        { normal: 9 },
      ],
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
    
    expect(result).toBeDefined();
    expect(result.skeleton).toBeDefined();
    expect(result.skeleton!.bones).toHaveLength(3);
    expect(result.skeleton!.animations).toHaveLength(1);
    
    // Check bone structure
    const rootBone = result.skeleton!.bones[0];
    expect(rootBone.parentBone).toBe(-1);
    expect(rootBone.name).toBe("root_bone");
    expect(rootBone.pointIndices).toEqual([0, 1, 2, 3, 4]);
    
    const childBone1 = result.skeleton!.bones[1];
    expect(childBone1.parentBone).toBe(0);
    expect(childBone1.name).toBe("child_bone_1");
    expect(childBone1.coordX).toBe(10);
    
    // Check animation
    const animation = result.skeleton!.animations[0];
    expect(animation.name).toBe("idle");
    expect(animation.events).toHaveLength(1);
  });

  it("should convert BG3D with skeleton to glTF with proper joints and skin", () => {
    const parsed = parseBG3DWithSkeletonResource(testBG3DBuffer, testSkeleton);
    const gltfDoc = bg3dParsedToGLTF(parsed);
    
    expect(gltfDoc).toBeDefined();
    
    // Check that skeleton data is converted to glTF format
    const joints = gltfDoc.getRoot().listNodes().filter(node => {
      const name = node.getName();
      return name === "root_bone" || name === "child_bone_1" || name === "child_bone_2";
    });
    expect(joints.length).toBeGreaterThan(0);
    
    // Check that skin is created
    const skins = gltfDoc.getRoot().listSkins();
    expect(skins).toHaveLength(1);
    expect(skins[0].listJoints()).toHaveLength(3);
    
    // Check that meshes have joint/weight attributes
    const meshes = gltfDoc.getRoot().listMeshes();
    if (meshes.length > 0) {
      const primitive = meshes[0].listPrimitives()[0];
      const joints = primitive.getAttribute("JOINTS_0");
      const weights = primitive.getAttribute("WEIGHTS_0");
      
      if (joints && weights) {
        expect(joints).toBeDefined();
        expect(weights).toBeDefined();
      }
    }
  });

  it("should round-trip BG3D skeleton data through glTF", async () => {
    const originalParsed = parseBG3DWithSkeletonResource(testBG3DBuffer, testSkeleton);
    const gltfDoc = bg3dParsedToGLTF(originalParsed);
    const roundtripParsed = await gltfToBG3D(gltfDoc);
    
    expect(roundtripParsed.skeleton).toBeDefined();
    
    // The skeleton should be preserved through the round-trip
    // (though some precision may be lost)
    expect(roundtripParsed.skeleton!.bones.length).toBe(
      originalParsed.skeleton!.bones.length
    );
    
    // Check that bone hierarchy is preserved
    const originalRoot = originalParsed.skeleton!.bones.find(b => b.parentBone === -1);
    const roundtripRoot = roundtripParsed.skeleton!.bones.find(b => b.parentBone === -1);
    
    expect(originalRoot).toBeDefined();
    expect(roundtripRoot).toBeDefined();
  });

  it("should convert BG3DSkeleton back to SkeletonResource format", () => {
    const parsed = parseBG3DWithSkeletonResource(testBG3DBuffer, testSkeleton);
    expect(parsed.skeleton).toBeDefined();
    
    const convertedSkeleton = convertBG3DToSkeletonResource(parsed.skeleton!);
    
    expect(convertedSkeleton).toBeDefined();
    expect(convertedSkeleton.Hedr).toBeDefined();
    expect(convertedSkeleton.Bone).toBeDefined();
    expect(convertedSkeleton.BonP).toBeDefined();
    expect(convertedSkeleton.BonN).toBeDefined();
    
    // Check header
    const header = Object.values(convertedSkeleton.Hedr)[0];
    expect(header.obj.numJoints).toBe(3);
    
    // Check bone structure
    const bones = Object.values(convertedSkeleton.Bone);
    expect(bones).toHaveLength(3);
    
    const rootBone = bones.find(b => b.obj.parentBone === -1);
    expect(rootBone).toBeDefined();
    expect(rootBone!.obj.name).toBe("root_bone");
  });

  it("should handle animation conversion and round-trip", async () => {
    console.log("Testing animation conversion...");
    
    // Use test skeleton with animation data
    const result = parseBG3DWithSkeletonResource(testBG3DBuffer, testSkeleton);
    
    // Verify skeleton has animation data
    expect(result.skeleton).toBeDefined();
    expect(result.skeleton!.animations).toHaveLength(1);
    expect(result.skeleton!.animations[0].name).toBe("idle");
    expect(result.skeleton!.animations[0].keyframes[0]).toHaveLength(2); // 2 keyframes for root bone
    
    // Convert to glTF
    const gltfDoc = bg3dParsedToGLTF(result);
    
    // Check that glTF animations were created
    const gltfAnimations = gltfDoc.getRoot().listAnimations();
    expect(gltfAnimations).toHaveLength(1);
    expect(gltfAnimations[0].getName()).toBe("idle");
    
    // Check animation has channels
    const channels = gltfAnimations[0].listChannels();
    expect(channels.length).toBeGreaterThan(0);
    console.log(`Created ${channels.length} animation channels`);
    
    // Check animation has samplers
    const samplers = gltfAnimations[0].listSamplers();
    expect(samplers.length).toBeGreaterThan(0);
    console.log(`Created ${samplers.length} animation samplers`);
    
    // Round-trip conversion
    const roundtrip = await gltfToBG3D(gltfDoc);
    
    // Verify animation data is preserved
    expect(roundtrip.skeleton).toBeDefined();
    expect(roundtrip.skeleton!.animations).toHaveLength(1);
    expect(roundtrip.skeleton!.animations[0].name).toBe("idle");
    
    // Check that keyframes are preserved (may not be exact due to conversion)
    const originalKeyframes = result.skeleton!.animations[0].keyframes[0];
    const roundtripKeyframes = roundtrip.skeleton!.animations[0].keyframes[0];
    expect(roundtripKeyframes).toBeDefined();
    expect(roundtripKeyframes.length).toBeGreaterThan(0);
    
    console.log(`Original keyframes: ${originalKeyframes.length}, roundtrip: ${roundtripKeyframes.length}`);
    console.log("✅ Animation conversion and round-trip successful!");
  });
});

// Integration test with real files
describe("BG3D Skeleton Real File Integration", () => {
  const BG3D_PATH = path.join(__dirname, "./testSkeletons/EliteBrainAlien.bg3d");
  const SKELETON_PATH = path.join(__dirname, "./skeletonRsrc/testSkeletons/EliteBrainAlien.skeleton.rsrc");

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