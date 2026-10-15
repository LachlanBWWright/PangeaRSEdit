export interface HedrRaw {
  version: number;
  numAnims: number;
  numJoints: number;
  num3DMFLimbs: number;
}
export interface BoneRaw {
  parentBone: number;
  name: string;
  coordX: number;
  coordY: number;
  coordZ: number;
  numPointsAttachedToBone: number;
  numNormalsAttachedToBone: number;
  reserved0?: number;
  reserved1?: number;
  reserved2?: number;
  reserved3?: number;
  reserved4?: number;
  reserved5?: number;
  reserved6?: number;
  reserved7?: number;
}
export interface BonPRaw { pointIndex: number }
export interface BonNRaw { normal: number }
export interface RelPRaw {
  relOffsetX: number;
  relOffsetY: number;
  relOffsetZ: number;
}
export interface AnHdRaw {
  animName: string;
  numAnimEvents: number;
}
export interface EvntRaw {
  time: number;
  type: number;
  value: number;
}
export interface NumKRaw { numKeyFrames: number }
export interface KeyFRaw {
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
