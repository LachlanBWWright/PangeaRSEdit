import { describe, it, expect } from "vitest";
import { Document } from "@gltf-transform/core";
import { BG3DSkeleton } from "../../parseBG3D";

import { bg3dBonesToGltf, gltfJointsToBg3dBones } from "./bones";

describe("skeleton bones roundtrip", () => {
  it("roundtrips simple parent/child bone positions", () => {
    const parsedSkeleton: BG3DSkeleton = {
      version: 272,
      numAnims: 0,
      numJoints: 2,
      num3DMFLimbs: 0,
      bones: [
        {
          parentBone: -1,
          name: "root",
          coordX: 0,
          coordY: 0,
          coordZ: 0,
          numPointsAttachedToBone: 0,
          numNormalsAttachedToBone: 0,
        },
        {
          parentBone: 0,
          name: "child",
          coordX: 1.234,
          coordY: -0.5,
          coordZ: 2.0,
          numPointsAttachedToBone: 0,
          numNormalsAttachedToBone: 0,
        },
      ],
      animations: [],
    };

    const doc = new Document();
    const { joints, skeletonRoot } = bg3dBonesToGltf(parsedSkeleton, doc);

    // Create skin and attach skeleton root so gltfJointsToBg3dBones can detect root
    const skin = doc.createSkin();
    skin.setSkeleton(skeletonRoot);
    joints.forEach((j) => skin.addJoint(j));

    const bonesBack = gltfJointsToBg3dBones(joints, skin);

    expect(bonesBack.length).toBe(parsedSkeleton.bones.length);
    // Parent relationship should be preserved
    expect(bonesBack[1].parentBone).toBe(0);

    // Coordinates should roundtrip approximately (allow small float differences)
    expect(bonesBack[1].coordX).toBeCloseTo(parsedSkeleton.bones[1].coordX, 5);
    expect(bonesBack[1].coordY).toBeCloseTo(parsedSkeleton.bones[1].coordY, 5);
    expect(bonesBack[1].coordZ).toBeCloseTo(parsedSkeleton.bones[1].coordZ, 5);
  });
});
