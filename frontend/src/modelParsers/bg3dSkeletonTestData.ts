import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";

export const testSkeleton: SkeletonResource = {
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
