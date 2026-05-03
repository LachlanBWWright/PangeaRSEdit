import { describe, expect, it } from "vitest";
import {
  AnimationClip,
  AnimationMixer,
  Object3D,
  VectorKeyframeTrack,
} from "three";
import { syncAnimationActionTime } from "./hooks";

describe("syncAnimationActionTime", () => {
  it("applies the requested time to the mixer pose immediately", () => {
    const root = new Object3D();
    const clip = new AnimationClip("Move", 1, [
      new VectorKeyframeTrack(".position", [0, 1], [0, 0, 0, 1, 2, 3]),
    ]);
    const mixer = new AnimationMixer(root);
    const action = mixer.clipAction(clip);
    action.play();
    action.paused = true;

    syncAnimationActionTime(mixer, action, 1);

    expect(action.time).toBe(1);
    expect(root.position.x).toBeCloseTo(1, 5);
    expect(root.position.y).toBeCloseTo(2, 5);
    expect(root.position.z).toBeCloseTo(3, 5);
  });
});
