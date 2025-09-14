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

// Bone object inside Bone field (extended format for Otto Matic and later)
export interface BoneObj {
  name: string;
  parentBone: number; // Index of parent bone (-1 if root)
  relX: number; // Position relative to parent
  relY: number;
  relZ: number;
  relRotX: number; // Rotation relative to parent (degrees)
  relRotY: number;
  relRotZ: number;
  numPointsAttached: number; // Number of mesh points attached to this bone
  attachedPointList: number[]; // Indices of attached mesh points
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
