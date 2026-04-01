import { Document, NodeIO } from "@gltf-transform/core";
import { describe, expect, it } from "vitest";
import {
  getJointParentBoneIndex,
  gltfToBG3D,
} from "@/modelParsers/parsedBg3dGitfConverter";
import { gltfJointsToBg3dBones } from "@/modelParsers/bg3dGltf/skeleton/bones";

function makeScrambledSkeletonDocument(): Document {
  const doc = new Document();
  const buffer = doc.createBuffer("buffer");
  const scene = doc.createScene("scene");
  doc.getRoot().setDefaultScene(scene);

  const skeletonRoot = doc.createNode("Armature");
  const root = doc.createNode("Root");
  root.setTranslation([0, 0, 0]);

  const childNearOrigin = doc.createNode("ChildNearOrigin");
  childNearOrigin.setTranslation([0, 2, 0]);

  const grandchildNearOrigin = doc.createNode("GrandchildNearOrigin");
  grandchildNearOrigin.setTranslation([0.25, 0.5, 0]);

  childNearOrigin.addChild(grandchildNearOrigin);
  root.addChild(childNearOrigin);
  skeletonRoot.addChild(root);
  scene.addChild(skeletonRoot);

  const skin = doc.createSkin("skin");
  skin.setSkeleton(skeletonRoot);
  skin.addJoint(grandchildNearOrigin);
  skin.addJoint(root);
  skin.addJoint(childNearOrigin);

  const timeAccessor = doc
    .createAccessor()
    .setType("SCALAR")
    .setArray(new Float32Array([0, 1]))
    .setBuffer(buffer);

  const translationAccessor = doc
    .createAccessor()
    .setType("VEC3")
    .setArray(new Float32Array([0.25, 0.5, 0, 0.5, 0.75, 0]))
    .setBuffer(buffer);

  const sampler = doc
    .createAnimationSampler()
    .setInput(timeAccessor)
    .setOutput(translationAccessor)
    .setInterpolation("LINEAR");

  const channel = doc
    .createAnimationChannel()
    .setTargetNode(grandchildNearOrigin)
    .setTargetPath("translation")
    .setSampler(sampler);

  doc.createAnimation("EditedKeyframe").addSampler(sampler).addChannel(channel);

  return doc;
}

describe("bone order recovery", () => {
  it("recovers absolute rest positions from non-parent-first joints without inverse bind matrices", async () => {
    const io = new NodeIO();
    const sourceDoc = makeScrambledSkeletonDocument();
    const glbBytes = await io.writeBinary(sourceDoc);
    const readDoc = await io.readBinary(glbBytes);

    const parsed = await gltfToBG3D(readDoc);
    expect(parsed.skeleton).toBeDefined();

    const skeleton = parsed.skeleton;
    if (!skeleton) {
      return;
    }

    expect(skeleton.bones).toHaveLength(3);

    const grandchild = skeleton.bones[0];
    const root = skeleton.bones[1];
    const child = skeleton.bones[2];

    expect(grandchild?.parentBone).toBe(2);
    expect(root?.parentBone).toBe(-1);
    expect(child?.parentBone).toBe(1);

    expect(root?.coordX).toBeCloseTo(0, 5);
    expect(root?.coordY).toBeCloseTo(0, 5);
    expect(root?.coordZ).toBeCloseTo(0, 5);

    expect(child?.coordX).toBeCloseTo(0, 5);
    expect(child?.coordY).toBeCloseTo(2, 5);
    expect(child?.coordZ).toBeCloseTo(0, 5);

    expect(grandchild?.coordX).toBeCloseTo(0.25, 5);
    expect(grandchild?.coordY).toBeCloseTo(2.5, 5);
    expect(grandchild?.coordZ).toBeCloseTo(0, 5);

    const animation = skeleton.animations[0];
    const grandchildKeyframes = animation?.keyframes[0];
    expect(grandchildKeyframes).toHaveLength(2);
    expect(grandchildKeyframes?.[0]?.coordX).toBeCloseTo(0.25, 5);
    expect(grandchildKeyframes?.[0]?.coordY).toBeCloseTo(0.5, 5);
    expect(grandchildKeyframes?.[1]?.coordX).toBeCloseTo(0.5, 5);
    expect(grandchildKeyframes?.[1]?.coordY).toBeCloseTo(0.75, 5);
  });

  it("recovers modular bone positions even when child joints are listed before parents", () => {
    const doc = makeScrambledSkeletonDocument();
    const skin = doc.getRoot().listSkins()[0];

    expect(skin).toBeDefined();
    if (!skin) {
      return;
    }

    const recoveredBones = gltfJointsToBg3dBones(skin.listJoints(), skin);
    expect(recoveredBones).toHaveLength(3);

    const grandchild = recoveredBones[0];
    const root = recoveredBones[1];
    const child = recoveredBones[2];

    expect(grandchild?.coordX).toBeCloseTo(0.25, 5);
    expect(grandchild?.coordY).toBeCloseTo(2.5, 5);
    expect(grandchild?.coordZ).toBeCloseTo(0, 5);
    expect(child?.coordY).toBeCloseTo(2, 5);
    expect(root?.coordY).toBeCloseTo(0, 5);
  });

  it("uses the immediate parent node even when other ancestry information would be misleading", () => {
    interface MockJoint {
      name: string;
      getParentNode(): MockJoint | null;
      listParents(): MockJoint[];
    }

    const armature: MockJoint = {
      name: "Armature",
      getParentNode: () => null,
      listParents: () => [],
    };
    const pelvis: MockJoint = {
      name: "Pelvis",
      getParentNode: () => armature,
      listParents: () => [armature],
    };
    const torso: MockJoint = {
      name: "Torso",
      getParentNode: () => pelvis,
      listParents: () => [armature, pelvis],
    };
    const rightHip: MockJoint = {
      name: "RightHip",
      getParentNode: () => pelvis,
      listParents: () => [armature, pelvis],
    };
    const leftHip: MockJoint = {
      name: "LeftHip",
      getParentNode: () => pelvis,
      listParents: () => [armature, pelvis],
    };

    const joints = [pelvis, torso, rightHip, leftHip];

    expect(getJointParentBoneIndex(pelvis, joints)).toBe(-1);
    expect(getJointParentBoneIndex(torso, joints)).toBe(0);
    expect(getJointParentBoneIndex(rightHip, joints)).toBe(0);
    expect(getJointParentBoneIndex(leftHip, joints)).toBe(0);
  });
});
