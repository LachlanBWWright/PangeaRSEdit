import type { Node } from "@gltf-transform/core";
import type { BG3DBone, BG3DKeyframe } from "./parseBG3D";
import { quaternionToEuler } from "./rotationUtils";

export function animationRestPose(joint: Node, index: number, bones?: readonly BG3DBone[]): BG3DKeyframe {
  const bone = bones?.[index];
  const parent = bone ? bones?.[bone.parentBone] : undefined;
  const translation = joint.getTranslation();
  const [x, y, z, w] = joint.getRotation();
  const [rotationX, rotationY, rotationZ] = quaternionToEuler(x, y, z, w);
  const [scaleX, scaleY, scaleZ] = joint.getScale();
  return {
    tick: 0,
    accelerationMode: 0,
    coordX: bone ? bone.coordX - (parent?.coordX ?? 0) : translation[0],
    coordY: bone ? bone.coordY - (parent?.coordY ?? 0) : translation[1],
    coordZ: bone ? bone.coordZ - (parent?.coordZ ?? 0) : translation[2],
    rotationX, rotationY, rotationZ,
    scaleX, scaleY, scaleZ,
  };
}
