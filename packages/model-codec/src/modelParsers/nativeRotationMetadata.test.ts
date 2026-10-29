import { describe, expect, it } from "vitest";
import { parseNativeRotations, unchangedNativeRotation } from "./nativeRotationMetadata";
import { eulerToQuaternion } from "./rotationUtils";

describe("native Euler rotation metadata", () => {
  it("preserves full turns that quaternion keyframes cannot represent", () => {
    const frame = { tick: 30, rotationX: 4 * Math.PI, rotationY: 0, rotationZ: 0 };
    const tracks = parseNativeRotations({ 0: [frame] });
    expect(unchangedNativeRotation(tracks, "0", 30, eulerToQuaternion(frame.rotationX, 0, 0))).toEqual(frame);
  });

  it("ignores stale metadata when a rotation or its timeline was edited", () => {
    const frame = { tick: 30, rotationX: Math.PI, rotationY: 0, rotationZ: 0 };
    const tracks = parseNativeRotations({ 0: [frame] });
    expect(unchangedNativeRotation(tracks, "0", 30, eulerToQuaternion(0, 0, 0))).toBeNull();
    expect(unchangedNativeRotation(tracks, "0", 60, eulerToQuaternion(Math.PI, 0, 0))).toBeNull();
  });

  it("rejects malformed metadata rather than applying untrusted native rotations", () => {
    expect(parseNativeRotations({ 0: [{ tick: 0, rotationX: Number.NaN }] })).toEqual({});
  });
});
