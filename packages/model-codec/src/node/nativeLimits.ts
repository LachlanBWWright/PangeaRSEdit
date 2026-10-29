import { err, ok, type Result } from "neverthrow";
import type { BG3DSkeleton } from "../modelParsers/parseBG3D.js";

const limits: Readonly<Record<string, { joints: number; clips: number; keys: number }>> = {
  ottomatic: { joints: 20, clips: 40, keys: 15 },
  cromag: { joints: 20, clips: 25, keys: 15 },
  bugdom: { joints: 20, clips: 25, keys: 15 },
  nanosaur: { joints: 20, clips: 20, keys: 15 },
  bugdom2: { joints: 30, clips: 40, keys: 60 },
  nanosaur2: { joints: 40, clips: 40, keys: 60 },
  billyfrontier: { joints: 30, clips: 40, keys: 60 },
};

export function validateNativeSkeleton(skeleton: BG3DSkeleton | undefined, target: string): Result<void, string> {
  const limit = limits[target];
  if (!limit) return err(`Unknown native model target: ${target}`);
  if (!skeleton) return ok(undefined);
  if (skeleton.numAnims < 1 || skeleton.animations.length < 1)
    return err("Animated native geometry requires at least one animation clip. Add a bind-pose animation before importing.");
  if (Math.max(skeleton.numJoints, skeleton.bones.length) > limit.joints)
    return err(`${target} supports at most ${limit.joints} skeleton joints. Simplify the rig before importing.`);
  if (Math.max(skeleton.numAnims, skeleton.animations.length) > limit.clips)
    return err(`${target} supports at most ${limit.clips} animation clips. Remove unused clips before importing.`);
  if (skeleton.animations.some((animation) => Math.max(animation.numAnimEvents, animation.events.length) > 30))
    return err(`${target} supports at most 30 events per animation clip. Remove unused events before importing.`);
  if (skeleton.animations.some((animation) => Object.values(animation.keyframes).some((keys) => keys.length > limit.keys)))
    return err(`${target} supports at most ${limit.keys} animation keys per bone. Simplify the animation before importing.`);
  return ok(undefined);
}
