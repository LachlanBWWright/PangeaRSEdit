// KeyF: Keyframe entry
export interface KeyFObj {
  tick: number;
  accelerationMode: number;
  coordX: number;
  coordY: number;
  coordZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

export interface KeyFEntry {
  name: string;
  order: number;
  obj: KeyFObj[];
}
// NumK: Number of keyframes entry
export interface NumKObj {
  numKeyFrames: number;
}

export interface NumKEntry {
  name: string;
  order: number;
  obj: NumKObj[];
}
// Evnt: Animation event entry
export interface EvntObj {
  time: number;
  type: number;
  value: number;
}

export interface EvntEntry {
  name: string;
  order: number;
  obj: EvntObj[];
}
// AnHd: Animation header entry
export interface AnHdObj {
  animName: string;
  numAnimEvents: number;
}

export interface AnHdEntry {
  name: string;
  order: number;
  obj: AnHdObj;
}

// Header structure
export interface SkeletonHeader {
  version: number;
  numAnims: number;
  numJoints: number;
  num3DMFLimbs: number;
}

// Bone object inside Bone field
export interface BoneObj {
  parentBone: number; // -1 if no parent, otherwise index of parent bone
  name: string;
  coordX: number;
  coordY: number;
  coordZ: number;
  numPointsAttachedToBone: number;
  numNormalsAttachedToBone: number;
}

export interface BoneEntry {
  name: string;
  order: number;
  obj: BoneObj;
}

// BonP: array of { pointIndex: number }
export interface BonPEntry {
  name: string;
  order: number;
  obj: { pointIndex: number }[];
}

// BonN: array of { normal: number }
export interface BonNEntry {
  name: string;
  order: number;
  obj: { normal: number }[];
}

// RelP: array of { relOffsetX: number, relOffsetY: number, relOffsetZ: number }
export interface RelPEntry {
  name: string;
  order: number;
  obj: { relOffsetX: number; relOffsetY: number; relOffsetZ: number }[];
}

// Hedr: header entry
export interface HedrEntry {
  name: string;
  order: number;
  obj: SkeletonHeader;
}

export interface SkeletonResource {
  _metadata?: Record<string, unknown>;
  Hedr: { [key: string]: HedrEntry };
  Bone: { [key: string]: BoneEntry };
  BonP: { [key: string]: BonPEntry };
  BonN: { [key: string]: BonNEntry };
  RelP?: { [key: string]: RelPEntry };
  AnHd: { [key: string]: AnHdEntry };
  Evnt: { [key: string]: EvntEntry };
  NumK: { [key: string]: NumKEntry };
  KeyF: { [key: string]: KeyFEntry };
  [key: string]: unknown;
}
