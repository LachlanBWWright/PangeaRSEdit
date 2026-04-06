/**
 * Bone structure and animation round-trip tests.
 *
 * Validates that the bg3dGltf skeleton module (bones.ts, skinning.ts, skeleton.ts)
 * correctly converts BG3D bone hierarchies and animations to/from glTF format.
 *
 * Tests:
 *   1. Bone hierarchy: parent-child relationships survive round-trip
 *   2. Bone coordinates: absolute world positions survive round-trip
 *   3. Euler ↔ quaternion conversion accuracy
 *   4. Full skeleton round-trip via the modular bg3dGltf module
 *   5. Animation extraction via gltfSkeletonToBg3d
 */
import { describe, it, expect } from "vitest";
import { Document } from "@gltf-transform/core";
import {
  bg3dBonesToGltf,
  gltfJointsToBg3dBones,
} from "@/modelParsers/bg3dGltf/skeleton/bones";
import { bg3dSkinningToGltf } from "@/modelParsers/bg3dGltf/skeleton/skinning";
import { gltfSkeletonToBg3d } from "@/modelParsers/bg3dGltf/skeleton";
import {
  createSkeletonSystem,
  extractAnimationsFromGLTF,
} from "@/modelParsers/skeletonSystemNew";
import type {
  BG3DSkeleton,
  BG3DBone,
  BG3DAnimation,
} from "@/modelParsers/parseBG3D";

/** Build a minimal skeleton with a known bone hierarchy for testing. */
function makeTestSkeleton(): BG3DSkeleton {
  const bones: BG3DBone[] = [
    {
      parentBone: -1,
      name: "Root",
      coordX: 0,
      coordY: 0,
      coordZ: 0,
      numPointsAttachedToBone: 0,
      numNormalsAttachedToBone: 0,
      pointIndices: [],
      normalIndices: [],
    },
    {
      parentBone: 0,
      name: "Spine",
      coordX: 0,
      coordY: 10,
      coordZ: 0,
      numPointsAttachedToBone: 0,
      numNormalsAttachedToBone: 0,
      pointIndices: [],
      normalIndices: [],
    },
    {
      parentBone: 1,
      name: "Head",
      coordX: 0,
      coordY: 20,
      coordZ: 5,
      numPointsAttachedToBone: 0,
      numNormalsAttachedToBone: 0,
      pointIndices: [],
      normalIndices: [],
    },
    {
      parentBone: 1,
      name: "LeftArm",
      coordX: -5,
      coordY: 18,
      coordZ: 0,
      numPointsAttachedToBone: 0,
      numNormalsAttachedToBone: 0,
      pointIndices: [],
      normalIndices: [],
    },
    {
      parentBone: 1,
      name: "RightArm",
      coordX: 5,
      coordY: 18,
      coordZ: 0,
      numPointsAttachedToBone: 0,
      numNormalsAttachedToBone: 0,
      pointIndices: [],
      normalIndices: [],
    },
  ];

  const animations: BG3DAnimation[] = [
    {
      name: "Walk",
      numAnimEvents: 1,
      events: [{ time: 0, type: 1, value: 0 }],
      keyframes: {
        "0": [
          {
            tick: 0,
            accelerationMode: 1,
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
            tick: 15,
            accelerationMode: 1,
            coordX: 0,
            coordY: 2,
            coordZ: 0,
            rotationX: 0.1,
            rotationY: 0,
            rotationZ: 0,
            scaleX: 1,
            scaleY: 1,
            scaleZ: 1,
          },
          {
            tick: 30,
            accelerationMode: 1,
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
        ],
        "1": [
          {
            tick: 0,
            accelerationMode: 1,
            coordX: 0,
            coordY: 10,
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
            accelerationMode: 1,
            coordX: 0,
            coordY: 10,
            coordZ: 0,
            rotationX: 0.3,
            rotationY: 0.2,
            rotationZ: 0.1,
            scaleX: 1,
            scaleY: 1,
            scaleZ: 1,
          },
        ],
      },
    },
  ];

  return {
    version: 272,
    numAnims: animations.length,
    numJoints: bones.length,
    num3DMFLimbs: 0,
    bones,
    animations,
  };
}

describe("Bone structure round-trip (bg3dGltf module)", () => {
  it("bg3dBonesToGltf sets local (parent-relative) translations", () => {
    const skeleton = makeTestSkeleton();
    const doc = new Document();

    const { joints } = bg3dBonesToGltf(skeleton, doc);

    // Root bone: local = absolute
    const rootT = joints[0]?.getTranslation();
    expect(rootT).toBeDefined();
    if (rootT) {
      expect(rootT[0]).toBeCloseTo(0, 5);
      expect(rootT[1]).toBeCloseTo(0, 5);
      expect(rootT[2]).toBeCloseTo(0, 5);
    }

    // Spine bone: local = (0,10,0) - (0,0,0) = (0,10,0)
    const spineT = joints[1]?.getTranslation();
    expect(spineT).toBeDefined();
    if (spineT) {
      expect(spineT[0]).toBeCloseTo(0, 5);
      expect(spineT[1]).toBeCloseTo(10, 5);
      expect(spineT[2]).toBeCloseTo(0, 5);
    }

    // Head bone: local = (0,20,5) - (0,10,0) = (0,10,5)
    const headT = joints[2]?.getTranslation();
    expect(headT).toBeDefined();
    if (headT) {
      expect(headT[0]).toBeCloseTo(0, 5);
      expect(headT[1]).toBeCloseTo(10, 5);
      expect(headT[2]).toBeCloseTo(5, 5);
    }

    // LeftArm bone: local = (-5,18,0) - (0,10,0) = (-5,8,0)
    const leftArmT = joints[3]?.getTranslation();
    expect(leftArmT).toBeDefined();
    if (leftArmT) {
      expect(leftArmT[0]).toBeCloseTo(-5, 5);
      expect(leftArmT[1]).toBeCloseTo(8, 5);
      expect(leftArmT[2]).toBeCloseTo(0, 5);
    }
  });

  it("bone hierarchy: parent-child relationships survive round-trip", () => {
    const skeleton = makeTestSkeleton();
    const doc = new Document();
    doc.createScene("Scene");

    const { joints, skeletonRoot } = bg3dBonesToGltf(skeleton, doc);

    // Create a skin so gltfJointsToBg3dBones can read the skeleton root
    const skin = doc.createSkin();
    skin.setSkeleton(skeletonRoot);
    joints.forEach((j) => skin.addJoint(j));

    const recoveredBones = gltfJointsToBg3dBones(joints, skin);

    expect(recoveredBones.length).toBe(skeleton.bones.length);

    for (let i = 0; i < skeleton.bones.length; i++) {
      const original = skeleton.bones[i];
      const recovered = recoveredBones[i];
      if (!original || !recovered) continue;

      expect(recovered.parentBone).toBe(original.parentBone);
      expect(recovered.name).toBe(original.name);
    }
  });

  it("bone coordinates: absolute world positions survive round-trip", () => {
    const skeleton = makeTestSkeleton();
    const doc = new Document();
    doc.createScene("Scene");

    const { joints, skeletonRoot } = bg3dBonesToGltf(skeleton, doc);

    const skin = doc.createSkin();
    skin.setSkeleton(skeletonRoot);
    joints.forEach((j) => skin.addJoint(j));

    const recoveredBones = gltfJointsToBg3dBones(joints, skin);

    expect(recoveredBones.length).toBe(skeleton.bones.length);

    for (let i = 0; i < skeleton.bones.length; i++) {
      const original = skeleton.bones[i];
      const recovered = recoveredBones[i];
      if (!original || !recovered) continue;

      expect(recovered.coordX).toBeCloseTo(original.coordX, 3);
      expect(recovered.coordY).toBeCloseTo(original.coordY, 3);
      expect(recovered.coordZ).toBeCloseTo(original.coordZ, 3);
    }
  });

  it("inverse bind matrices correctly represent bone world positions", () => {
    const skeleton = makeTestSkeleton();
    const doc = new Document();
    const baseBuffer = doc.createBuffer("base");

    const { joints } = bg3dBonesToGltf(skeleton, doc);

    const skin = bg3dSkinningToGltf(skeleton, joints, doc, baseBuffer);
    expect(skin).not.toBeNull();
    if (!skin) return;

    const ibmAccessor = skin.getInverseBindMatrices();
    expect(ibmAccessor).not.toBeNull();
    if (!ibmAccessor) return;

    const ibmArray = ibmAccessor.getArray();
    expect(ibmArray).toBeInstanceOf(Float32Array);
    if (!(ibmArray instanceof Float32Array)) return;

    // For each bone, the IBM translation should be the negated absolute position
    for (let i = 0; i < skeleton.bones.length; i++) {
      const bone = skeleton.bones[i];
      if (!bone) continue;

      const offset = i * 16;
      // IBM[12] = -bone.coordX, IBM[13] = -bone.coordY, IBM[14] = -bone.coordZ
      expect(ibmArray[offset + 12]).toBeCloseTo(-bone.coordX, 3);
      expect(ibmArray[offset + 13]).toBeCloseTo(-bone.coordY, 3);
      expect(ibmArray[offset + 14]).toBeCloseTo(-bone.coordZ, 3);

      // Diagonal should be 1 (pure translation matrix)
      expect(ibmArray[offset + 0]).toBeCloseTo(1, 5);
      expect(ibmArray[offset + 5]).toBeCloseTo(1, 5);
      expect(ibmArray[offset + 10]).toBeCloseTo(1, 5);
      expect(ibmArray[offset + 15]).toBeCloseTo(1, 5);
    }
  });
});

describe("Euler ↔ quaternion round-trip accuracy", () => {
  it("euler→quaternion→euler round-trip preserves angles within tolerance", () => {
    const skeleton = makeTestSkeleton();
    const doc = new Document();
    const baseBuffer = doc.createBuffer("base");

    // Create skeleton system with animations
    const result = createSkeletonSystem(doc, skeleton, baseBuffer);
    expect(result.isErr()).toBe(false);
    if (result.isErr()) return;

    // Extract animations back from the glTF document
    const recoveredAnimations = extractAnimationsFromGLTF(
      doc,
      skeleton.bones,
    );

    expect(recoveredAnimations.length).toBe(skeleton.animations.length);

    const origAnim = skeleton.animations[0];
    const recoveredAnim = recoveredAnimations[0];
    if (!origAnim || !recoveredAnim) return;

    // Check each bone's keyframes
    for (const boneIndexStr of Object.keys(origAnim.keyframes)) {
      const boneIdx = parseInt(boneIndexStr);
      const origKeyframes = origAnim.keyframes[boneIdx];
      const recoveredKeyframes = recoveredAnim.keyframes[boneIdx];

      if (!origKeyframes || !recoveredKeyframes) continue;

      expect(recoveredKeyframes.length).toBe(origKeyframes.length);

      for (let k = 0; k < origKeyframes.length; k++) {
        const origKf = origKeyframes[k];
        const recKf = recoveredKeyframes[k];
        if (!origKf || !recKf) continue;

        // Tick should match exactly (integer conversion)
        expect(recKf.tick).toBe(origKf.tick);

        // Translation should be very close
        expect(recKf.coordX).toBeCloseTo(origKf.coordX, 3);
        expect(recKf.coordY).toBeCloseTo(origKf.coordY, 3);
        expect(recKf.coordZ).toBeCloseTo(origKf.coordZ, 3);

        // Rotation (Euler→quaternion→Euler) should be close
        expect(recKf.rotationX).toBeCloseTo(origKf.rotationX, 3);
        expect(recKf.rotationY).toBeCloseTo(origKf.rotationY, 3);
        expect(recKf.rotationZ).toBeCloseTo(origKf.rotationZ, 3);

        // Scale should match
        expect(recKf.scaleX).toBeCloseTo(origKf.scaleX, 3);
        expect(recKf.scaleY).toBeCloseTo(origKf.scaleY, 3);
        expect(recKf.scaleZ).toBeCloseTo(origKf.scaleZ, 3);
      }
    }
  });

  it("euler→quaternion→euler for larger angles", () => {
    // Test various rotation scenarios: multi-axis, negative angles,
    // identity, and axis-aligned 90° rotations (near gimbal lock)
    const testAngles = [
      { x: Math.PI / 4, y: Math.PI / 3, z: Math.PI / 6 },
      { x: -0.5, y: 1.2, z: -0.8 },
      { x: 0, y: 0, z: 0 },
      { x: Math.PI / 2, y: 0, z: 0 },
      { x: 0, y: Math.PI / 2, z: 0 },
      { x: 0, y: 0, z: Math.PI / 2 },
    ];

    for (const angles of testAngles) {
      // Create a skeleton with a single bone and one keyframe using these angles
      const skeleton: BG3DSkeleton = {
        version: 272,
        numAnims: 1,
        numJoints: 1,
        num3DMFLimbs: 0,
        bones: [
          {
            parentBone: -1,
            name: "TestBone",
            coordX: 0,
            coordY: 0,
            coordZ: 0,
            numPointsAttachedToBone: 0,
            numNormalsAttachedToBone: 0,
            pointIndices: [],
            normalIndices: [],
          },
        ],
        animations: [
          {
            name: "Test",
            numAnimEvents: 0,
            events: [],
            keyframes: {
              "0": [
                {
                  tick: 0,
                  accelerationMode: 1,
                  coordX: 0,
                  coordY: 0,
                  coordZ: 0,
                  rotationX: angles.x,
                  rotationY: angles.y,
                  rotationZ: angles.z,
                  scaleX: 1,
                  scaleY: 1,
                  scaleZ: 1,
                },
              ],
            },
          },
        ],
      };

      const doc = new Document();
      const buffer = doc.createBuffer("base");
      const result = createSkeletonSystem(doc, skeleton, buffer);
      if (result.isErr()) continue;

      const recovered = extractAnimationsFromGLTF(doc, skeleton.bones);
      const recKf = recovered[0]?.keyframes["0"]?.[0];

      if (!recKf) continue;

      expect(recKf.rotationX).toBeCloseTo(angles.x, 3);
      expect(recKf.rotationY).toBeCloseTo(angles.y, 3);
      expect(recKf.rotationZ).toBeCloseTo(angles.z, 3);
    }
  });
});

describe("gltfSkeletonToBg3d full round-trip", () => {
  it("recovers bone structure and animations from glTF document", () => {
    const skeleton = makeTestSkeleton();
    const doc = new Document();
    const buffer = doc.createBuffer("base");

    // Forward: BG3D → glTF
    const result = createSkeletonSystem(doc, skeleton, buffer);
    expect(result.isErr()).toBe(false);
    if (result.isErr()) return;

    // Reverse: glTF → BG3D via modular module
    const recovered = gltfSkeletonToBg3d(doc);
    expect(recovered).toBeDefined();
    if (!recovered) return;

    // Bone count should match
    expect(recovered.bones.length).toBe(skeleton.bones.length);

    // Bone names should match
    expect(recovered.bones.map((b) => b.name)).toEqual(
      skeleton.bones.map((b) => b.name),
    );

    // Parent-child relationships should match
    expect(recovered.bones.map((b) => b.parentBone)).toEqual(
      skeleton.bones.map((b) => b.parentBone),
    );

    // Absolute bone coordinates should be close
    for (let i = 0; i < skeleton.bones.length; i++) {
      const orig = skeleton.bones[i];
      const rec = recovered.bones[i];
      if (!orig || !rec) continue;

      expect(rec.coordX).toBeCloseTo(orig.coordX, 2);
      expect(rec.coordY).toBeCloseTo(orig.coordY, 2);
      expect(rec.coordZ).toBeCloseTo(orig.coordZ, 2);
    }

    // Animation count should match
    expect(recovered.animations.length).toBe(skeleton.animations.length);

    // Animation names should match
    expect(recovered.animations.map((a) => a.name)).toEqual(
      skeleton.animations.map((a) => a.name),
    );

    // Animation events should match
    const origAnim = skeleton.animations[0];
    const recAnim = recovered.animations[0];
    if (origAnim && recAnim) {
      expect(recAnim.events.length).toBe(origAnim.events.length);

      // Keyframe bone tracks should match
      const origBoneTracks = Object.keys(origAnim.keyframes).sort();
      const recBoneTracks = Object.keys(recAnim.keyframes).sort();
      expect(recBoneTracks).toEqual(origBoneTracks);

      // Keyframe values should be close
      for (const boneKey of origBoneTracks) {
        const boneIdx = parseInt(boneKey);
        const origKfs = origAnim.keyframes[boneIdx];
        const recKfs = recAnim.keyframes[boneIdx];
        if (!origKfs || !recKfs) continue;

        expect(recKfs.length).toBe(origKfs.length);

        for (let k = 0; k < origKfs.length; k++) {
          const origKf = origKfs[k];
          const recKf = recKfs[k];
          if (!origKf || !recKf) continue;

          expect(recKf.tick).toBe(origKf.tick);
          expect(recKf.coordX).toBeCloseTo(origKf.coordX, 2);
          expect(recKf.coordY).toBeCloseTo(origKf.coordY, 2);
          expect(recKf.coordZ).toBeCloseTo(origKf.coordZ, 2);
          expect(recKf.rotationX).toBeCloseTo(origKf.rotationX, 2);
          expect(recKf.rotationY).toBeCloseTo(origKf.rotationY, 2);
          expect(recKf.rotationZ).toBeCloseTo(origKf.rotationZ, 2);
          expect(recKf.scaleX).toBeCloseTo(origKf.scaleX, 2);
          expect(recKf.scaleY).toBeCloseTo(origKf.scaleY, 2);
          expect(recKf.scaleZ).toBeCloseTo(origKf.scaleZ, 2);
        }
      }
    }
  });
});

describe("Non-zero root bone round-trip (production path)", () => {
  /** Skeleton where the root bone is NOT at the origin. */
  function makeOffsetRootSkeleton(): BG3DSkeleton {
    const bones: BG3DBone[] = [
      {
        parentBone: -1,
        name: "Pelvis",
        coordX: 5,
        coordY: 30,
        coordZ: -10,
        numPointsAttachedToBone: 0,
        numNormalsAttachedToBone: 0,
        pointIndices: [],
        normalIndices: [],
      },
      {
        parentBone: 0,
        name: "Torso",
        coordX: 5,
        coordY: 50,
        coordZ: -10,
        numPointsAttachedToBone: 0,
        numNormalsAttachedToBone: 0,
        pointIndices: [],
        normalIndices: [],
      },
      {
        parentBone: 0,
        name: "LeftLeg",
        coordX: 2,
        coordY: 20,
        coordZ: -10,
        numPointsAttachedToBone: 0,
        numNormalsAttachedToBone: 0,
        pointIndices: [],
        normalIndices: [],
      },
    ];

    // Keyframe coords must be LOCAL (relative to parent)
    const animations: BG3DAnimation[] = [
      {
        name: "Idle",
        numAnimEvents: 0,
        events: [],
        keyframes: {
          // Pelvis: local = absolute (root bone)
          "0": [
            {
              tick: 0,
              accelerationMode: 1,
              coordX: 5,
              coordY: 30,
              coordZ: -10,
              rotationX: 0,
              rotationY: 0,
              rotationZ: 0,
              scaleX: 1,
              scaleY: 1,
              scaleZ: 1,
            },
          ],
          // Torso: local = (5,50,-10) - (5,30,-10) = (0,20,0)
          "1": [
            {
              tick: 0,
              accelerationMode: 1,
              coordX: 0,
              coordY: 20,
              coordZ: 0,
              rotationX: 0,
              rotationY: 0,
              rotationZ: 0,
              scaleX: 1,
              scaleY: 1,
              scaleZ: 1,
            },
          ],
          // LeftLeg: local = (2,20,-10) - (5,30,-10) = (-3,-10,0)
          "2": [
            {
              tick: 0,
              accelerationMode: 1,
              coordX: -3,
              coordY: -10,
              coordZ: 0,
              rotationX: 0,
              rotationY: 0,
              rotationZ: 0,
              scaleX: 1,
              scaleY: 1,
              scaleZ: 1,
            },
          ],
        },
      },
    ];

    return {
      version: 272,
      numAnims: animations.length,
      numJoints: bones.length,
      num3DMFLimbs: 0,
      bones,
      animations,
    };
  }

  it("preserves absolute bone positions with non-zero root", () => {
    const skeleton = makeOffsetRootSkeleton();
    const doc = new Document();
    const buffer = doc.createBuffer("base");

    const result = createSkeletonSystem(doc, skeleton, buffer);
    expect(result.isErr()).toBe(false);
    if (result.isErr()) return;

    const recovered = gltfSkeletonToBg3d(doc);
    expect(recovered).toBeDefined();
    if (!recovered) return;

    for (let i = 0; i < skeleton.bones.length; i++) {
      const orig = skeleton.bones[i];
      const rec = recovered.bones[i];
      if (!orig || !rec) continue;

      expect(rec.coordX).toBeCloseTo(orig.coordX, 2);
      expect(rec.coordY).toBeCloseTo(orig.coordY, 2);
      expect(rec.coordZ).toBeCloseTo(orig.coordZ, 2);
      expect(rec.parentBone).toBe(orig.parentBone);
    }
  });

  it("preserves local keyframe coords with non-zero root", () => {
    const skeleton = makeOffsetRootSkeleton();
    const doc = new Document();
    const buffer = doc.createBuffer("base");

    const result = createSkeletonSystem(doc, skeleton, buffer);
    expect(result.isErr()).toBe(false);
    if (result.isErr()) return;

    const recovered = gltfSkeletonToBg3d(doc);
    expect(recovered).toBeDefined();
    if (!recovered) return;

    const origAnim = skeleton.animations[0];
    const recAnim = recovered.animations[0];
    expect(origAnim).toBeDefined();
    expect(recAnim).toBeDefined();
    if (!origAnim || !recAnim) return;

    for (const boneKey of Object.keys(origAnim.keyframes)) {
      const boneIdx = parseInt(boneKey);
      const origKfs = origAnim.keyframes[boneIdx];
      const recKfs = recAnim.keyframes[boneIdx];
      if (!origKfs || !recKfs) continue;

      expect(recKfs.length).toBe(origKfs.length);

      for (let k = 0; k < origKfs.length; k++) {
        const o = origKfs[k];
        const r = recKfs[k];
        if (!o || !r) continue;

        expect(r.coordX).toBeCloseTo(o.coordX, 2);
        expect(r.coordY).toBeCloseTo(o.coordY, 2);
        expect(r.coordZ).toBeCloseTo(o.coordZ, 2);
      }
    }
  });

  it("modifying child keyframe does not change parent rest position", () => {
    const skeleton = makeOffsetRootSkeleton();

    // Move Torso keyframe dramatically
    const anim = skeleton.animations[0];
    expect(anim).toBeDefined();
    if (!anim) return;
    const torsoKfs = anim.keyframes[1];
    expect(torsoKfs).toBeDefined();
    if (!torsoKfs || torsoKfs.length === 0) return;
    const kf = torsoKfs[0];
    if (!kf) return;

    kf.coordX += 50;
    kf.coordY += 100;

    const doc = new Document();
    const buffer = doc.createBuffer("base");
    const result = createSkeletonSystem(doc, skeleton, buffer);
    expect(result.isErr()).toBe(false);
    if (result.isErr()) return;

    const recovered = gltfSkeletonToBg3d(doc);
    expect(recovered).toBeDefined();
    if (!recovered) return;

    // Pelvis (parent) rest position must be unchanged
    const pelvis = recovered.bones[0];
    expect(pelvis).toBeDefined();
    if (!pelvis) return;
    expect(pelvis.coordX).toBeCloseTo(5, 2);
    expect(pelvis.coordY).toBeCloseTo(30, 2);
    expect(pelvis.coordZ).toBeCloseTo(-10, 2);

    // LeftLeg (sibling) rest position must be unchanged
    const leftLeg = recovered.bones[2];
    expect(leftLeg).toBeDefined();
    if (!leftLeg) return;
    expect(leftLeg.coordX).toBeCloseTo(2, 2);
    expect(leftLeg.coordY).toBeCloseTo(20, 2);
    expect(leftLeg.coordZ).toBeCloseTo(-10, 2);

    // Torso rest position also must be unchanged
    // (only the keyframe changed, not the bone definition)
    const torso = recovered.bones[1];
    expect(torso).toBeDefined();
    if (!torso) return;
    expect(torso.coordX).toBeCloseTo(5, 2);
    expect(torso.coordY).toBeCloseTo(50, 2);
    expect(torso.coordZ).toBeCloseTo(-10, 2);

    // Torso keyframe should reflect the modification
    const recAnim = recovered.animations[0];
    expect(recAnim).toBeDefined();
    if (!recAnim) return;
    const recTorsoKfs = recAnim.keyframes[1];
    expect(recTorsoKfs).toBeDefined();
    if (!recTorsoKfs || recTorsoKfs.length === 0) return;
    const recKf = recTorsoKfs[0];
    if (!recKf) return;
    expect(recKf.coordX).toBeCloseTo(50, 2);
    expect(recKf.coordY).toBeCloseTo(120, 2);
    expect(recKf.coordZ).toBeCloseTo(0, 2);
  });
});
