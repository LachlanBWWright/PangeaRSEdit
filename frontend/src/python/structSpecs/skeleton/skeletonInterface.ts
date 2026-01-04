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
// Matches File_BoneDefinitionType from file.h:
// int32_t parentBone, unsigned char name[32], OGLPoint3D coord, uint16_t numPointsAttachedToBone,
// uint16_t numNormalsAttachedToBone, uint32_t reserved[8]
export interface BoneObj {
  parentBone: number; // -1 if no parent, otherwise index of parent bone (int32_t)
  name: string; // 32-byte Pascal string
  coordX: number;
  coordY: number;
  coordZ: number;
  numPointsAttachedToBone: number;
  numNormalsAttachedToBone: number;
  reserved0?: number; // Reserved field 0
  reserved1?: number; // Reserved field 1
  reserved2?: number; // Reserved field 2
  reserved3?: number; // Reserved field 3
  reserved4?: number; // Reserved field 4
  reserved5?: number; // Reserved field 5
  reserved6?: number; // Reserved field 6
  reserved7?: number; // Reserved field 7
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
  Hedr: Record<string, HedrEntry>;
  Bone: Record<string, BoneEntry>;
  BonP: Record<string, BonPEntry>;
  BonN: Record<string, BonNEntry>;
  RelP?: Record<string, RelPEntry>;
  AnHd: Record<string, AnHdEntry>;
  Evnt: Record<string, EvntEntry>;
  NumK: Record<string, NumKEntry>;
  KeyF: Record<string, KeyFEntry>;
  [key: string]: unknown;
}
