import { Document } from "@gltf-transform/core";
import { describe, expect, it } from "vitest";
import { getRigidInfluence, shouldReplaceRigidInfluence } from "./rigidSkinning";

describe("rigid skinning", () => {
  it("decodes normalized integer weights and selects the highest weight", () => {
    const document = new Document();
    const buffer = document.createBuffer();
    const joints = document
      .createAccessor()
      .setType("VEC4")
      .setArray(new Uint8Array([2, 1, 0, 0]))
      .setBuffer(buffer);
    const weights = document
      .createAccessor()
      .setType("VEC4")
      .setArray(new Uint8Array([102, 153, 0, 0]))
      .setNormalized(true)
      .setBuffer(buffer);

    const influence = getRigidInfluence(joints, weights, 0, 3);

    expect(influence?.jointIndex).toBe(1);
    expect(influence?.weight).toBeCloseTo(0.6);
    expect(influence?.discardedWeight).toBeCloseTo(0.4);
    expect(influence?.positiveInfluenceCount).toBe(2);
  });

  it("uses the lowest joint index to break equal-weight ties", () => {
    const document = new Document();
    const buffer = document.createBuffer();
    const joints = document
      .createAccessor()
      .setType("VEC4")
      .setArray(new Uint16Array([3, 1, 0, 0]))
      .setBuffer(buffer);
    const weights = document
      .createAccessor()
      .setType("VEC4")
      .setArray(new Float32Array([0.5, 0.5, 0, 0]))
      .setBuffer(buffer);

    expect(getRigidInfluence(joints, weights, 0, 4)?.jointIndex).toBe(1);
  });

  it("uses the same deterministic rule when mesh references disagree", () => {
    const current = {
      jointIndex: 2,
      weight: 0.75,
      discardedWeight: 0.25,
      positiveInfluenceCount: 2,
    };
    const candidate = {
      jointIndex: 1,
      weight: 0.75,
      discardedWeight: 0.25,
      positiveInfluenceCount: 2,
    };

    expect(shouldReplaceRigidInfluence(current, candidate)).toBe(true);
  });
});
