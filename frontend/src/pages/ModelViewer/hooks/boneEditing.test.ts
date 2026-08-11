import { describe, expect, it } from "vitest";
import { Bone, Group } from "three";
import {
  collectSceneBoneNames,
  createBone,
  removeBone,
} from "@/modelEditing/bones/boneEditing";
import type { SkinWeightsData } from "@/modelEditing/weights/weightTypes";

function makeRig(): Group {
  const scene = new Group();
  const root = new Bone();
  root.name = "Root";
  const child = new Bone();
  child.name = "Child";
  root.add(child);
  scene.add(root);
  return scene;
}

const skinData: SkinWeightsData = {
  boneNames: ["Root", "Child"],
  vertices: [
    {
      vertexIndex: 0,
      influences: [{ boneIndex: 1, boneName: "Child", weight: 1 }],
    },
  ],
};

describe("bone editing", () => {
  it("creates a child bone and adds it to skin data", () => {
    const scene = makeRig();
    const result = createBone(scene, "Hand", "Child", skinData);

    expect(result.isOk()).toBe(true);
    expect(collectSceneBoneNames(scene)).toContain("Hand");
    expect(result.isOk() ? result.value.skinData?.boneNames : []).toContain(
      "Hand",
    );
  });

  it("removes a bone, reparents children, and transfers influences", () => {
    const scene = makeRig();
    const creation = createBone(scene, "Hand", "Child", skinData);
    expect(creation.isOk()).toBe(true);

    const result = removeBone(scene, "Child", skinData);

    expect(result.isOk()).toBe(true);
    expect(collectSceneBoneNames(scene)).toEqual(["Root", "Hand"]);
    expect(result.isOk() ? result.value.parentName : null).toBe("Root");
    expect(
      result.isOk()
        ? result.value.skinData?.vertices[0]?.influences[0]?.boneName
        : null,
    ).toBe("Root");
  });

  it("rejects duplicate bone names", () => {
    expect(createBone(makeRig(), "Root", null, skinData).isErr()).toBe(true);
  });
});
