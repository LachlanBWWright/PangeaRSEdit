import { readFileSync } from "node:fs";
import { Document, type Node } from "@gltf-transform/core";
import { describe, expect, it } from "vitest";
import { prepareNativeAnimations, sampleAnimationChannel, validateNativeAnimations } from "./animationSampling";
import { extractAnimationsFromGLTF } from "./skeletonSystemNew";
import { parseBG3DWithSkeleton } from "./bg3dWithSkeleton";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { bg3dSkeletonToSkeletonResource } from "./skeletonExport";
import { skeletonResourceToBinary } from "./skeletonBinaryExport";
import { parseSkeletonRsrcResult } from "./skeletonRsrc/parseSkeletonRsrcTS";
import { prepareNativeDocument } from "../node/gltf";

function rig(): { document: Document; joint: Node } {
  const document = new Document();
  document.createBuffer();
  const joint = document.createNode("Joint");
  document.createSkin().addJoint(joint);
  document.createScene().addChild(joint);
  document.createAnimation("Walk");
  return { document, joint };
}

function addChannel(document: Document, joint: Node, path: "translation" | "rotation" | "scale", times: number[], values: number[], interpolation: "LINEAR" | "STEP" | "CUBICSPLINE" = "LINEAR") {
  const buffer = document.getRoot().listBuffers()[0] ?? document.createBuffer();
  const input = document.createAccessor().setType("SCALAR").setArray(new Float32Array(times)).setBuffer(buffer);
  const output = document.createAccessor().setType(path === "rotation" ? "VEC4" : "VEC3").setArray(new Float32Array(values)).setBuffer(buffer);
  const sampler = document.createAnimationSampler().setInput(input).setOutput(output).setInterpolation(interpolation);
  const channel = document.createAnimationChannel().setTargetNode(joint).setTargetPath(path).setSampler(sampler);
  document.getRoot().listAnimations()[0]?.addSampler(sampler).addChannel(channel);
  return channel;
}

function fixture(name: string): ArrayBuffer {
  const bytes = readFileSync(new URL(`../../../../frontend/public/games/ottomatic/skeletons/${name}`, import.meta.url));
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

describe("native animation sampling", () => {
  it("creates a native bind-pose clip for a rig exported without animations", () => {
    const { document, joint } = rig();
    document.getRoot().listAnimations()[0]?.dispose();
    joint.setTranslation([1, 2, 3]);
    const skeleton = gltfToBG3D(document).skeleton;
    expect(skeleton?.numAnims).toBe(1);
    expect(skeleton?.animations[0]).toMatchObject({ name: "Bind pose", events: [], keyframes: { 0: [{ tick: 0, coordX: 1, coordY: 2, coordZ: 3 }] } });
  });

  it("samples every transform at the union of independent key times and preserves zero scale", () => {
    const { document, joint } = rig();
    addChannel(document, joint, "translation", [0, 1], [0, 0, 0, 10, 0, 0]);
    addChannel(document, joint, "scale", [0, 0.5, 1], [1, 1, 1, 0, 0, 0, 2, 2, 2]);
    expect(validateNativeAnimations(document).isOk()).toBe(true);
    const frames = extractAnimationsFromGLTF(document)[0]?.keyframes[0];
    expect(frames?.map((frame) => [frame.tick, frame.coordX, frame.scaleX, frame.accelerationMode])).toEqual([[0, 0, 1, 0], [15, 5, 0, 0], [30, 10, 2, 0]]);
  });

  it("uses quaternion slerp and retains a zero quaternion w at exact keys", () => {
    const { document, joint } = rig();
    const channel = addChannel(document, joint, "rotation", [0, 1], [0, 0, 0, 1, 0, 0, 1, 0]);
    expect(sampleAnimationChannel(channel, 0.5)[2]).toBeCloseTo(Math.SQRT1_2);
    const end = extractAnimationsFromGLTF(document)[0]?.keyframes[0]?.[1];
    expect(Math.abs(end?.rotationZ ?? 0)).toBeCloseTo(Math.PI);
  });

  it("preserves rest transforms on static joints and unanimated transform components", () => {
    const { document, joint } = rig();
    joint.setTranslation([10, 20, 30]).setScale([2, 3, 4]);
    const child = document.createNode("Animated child")
      .setRotation([0, 0, Math.SQRT1_2, Math.SQRT1_2]).setScale([4, 5, 6]);
    joint.addChild(child);
    document.getRoot().listSkins()[0]?.addJoint(child);
    addChannel(document, child, "translation", [0, 1], [1, 2, 3, 4, 5, 6]);
    const frames = extractAnimationsFromGLTF(document)[0]?.keyframes;
    expect(frames?.[0]).toHaveLength(1);
    expect(frames?.[0]?.[0]).toMatchObject({ tick: 0, coordX: 10, coordY: 20, coordZ: 30, scaleX: 2, scaleY: 3, scaleZ: 4 });
    expect(frames?.[1]).toHaveLength(2);
    for (const frame of frames?.[1] ?? []) {
      expect(frame.rotationZ).toBeCloseTo(Math.PI / 2);
      expect([frame.scaleX, frame.scaleY, frame.scaleZ]).toEqual([4, 5, 6]);
    }
  });

  it.each<"STEP" | "CUBICSPLINE">(["STEP", "CUBICSPLINE"])("rejects %s instead of interpreting tangent/step data as LINEAR", (interpolation) => {
    const { document, joint } = rig();
    addChannel(document, joint, "translation", [0, 1], [0, 0, 0, 1, 0, 0], interpolation);
    const result = validateNativeAnimations(document);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toContain(interpolation);
  });

  it("rejects multiple armatures, excessive native keys and tick collisions", () => {
    const multiple = rig();
    multiple.document.createSkin().addJoint(multiple.document.createNode("Other"));
    const multipleResult = validateNativeAnimations(multiple.document);
    expect(multipleResult.isErr()).toBe(true);
    if (multipleResult.isErr()) expect(multipleResult.error).toContain("2 armatures");
    const excessive = rig();
    addChannel(excessive.document, excessive.joint, "translation", Array.from({ length: 16 }, (_, index) => index), Array.from({ length: 48 }, () => 0));
    const excessiveResult = validateNativeAnimations(excessive.document, 15);
    expect(excessiveResult.isErr()).toBe(true);
    if (excessiveResult.isErr()) expect(excessiveResult.error).toContain("at most 15");
    const collision = rig();
    addChannel(collision.document, collision.joint, "scale", [0, 0.001], [1, 1, 1, 2, 2, 2]);
    const collisionResult = validateNativeAnimations(collision.document);
    expect(collisionResult.isErr()).toBe(true);
    if (collisionResult.isErr()) expect(collisionResult.error).toContain("same 30 Hz");
  });

  it("rejects empty tracks and non-unit quaternion values before native sampling", () => {
    const empty = rig();
    addChannel(empty.document, empty.joint, "translation", [], []);
    const emptyResult = validateNativeAnimations(empty.document);
    expect(emptyResult.isErr()).toBe(true);
    if (emptyResult.isErr()) expect(emptyResult.error).toContain("empty animation sampler");
    const invalid = rig();
    addChannel(invalid.document, invalid.joint, "rotation", [0], [0, 0, 0, 0]);
    const invalidResult = validateNativeAnimations(invalid.document);
    expect(invalidResult.isErr()).toBe(true);
    if (invalidResult.isErr()) expect(invalidResult.error).toContain("non-unit rotation quaternion");
  });

  it("reports non-native bind transforms and ignored animation channels before accepting conversion", async () => {
    const { document } = rig();
    const buffer = document.getRoot().listBuffers()[0] ?? document.createBuffer();
    const bind = document.createAccessor().setType("MAT4").setBuffer(buffer).setArray(new Float32Array([2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1]));
    document.getRoot().listSkins()[0]?.setInverseBindMatrices(bind);
    const positions = document.createAccessor().setType("VEC3").setBuffer(buffer).setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]));
    const mesh = document.createNode("Animated mesh").setMesh(document.createMesh().addPrimitive(document.createPrimitive().setAttribute("POSITION", positions)));
    document.getRoot().listScenes()[0]?.addChild(mesh);
    addChannel(document, mesh, "translation", [0, 1], [0, 0, 0, 1, 0, 0]);
    addChannel(document, document.getRoot().listSkins()[0]?.listJoints()[0] ?? mesh, "scale", [0, 1], [1, 1, 1, 2, 3, 4]);
    const refused = await prepareNativeDocument(document, false);
    expect(refused.isErr()).toBe(true);
    if (refused.isErr()) {
      expect(refused.error).toContain("bind rotations and scales");
      expect(refused.error).toContain("Ignored unsupported animation channels");
      expect(refused.error).toContain("Nonuniform animated scale");
    }
  });

  it("reduces a densely baked linear Blender track to two keys", () => {
    const { document, joint } = rig();
    addChannel(document, joint, "translation", Array.from({ length: 61 }, (_, index) => index / 30), Array.from({ length: 61 }, (_, index) => [index, 0, 0]).flat());
    const prepared = prepareNativeAnimations(document, 15);
    expect(prepared.isOk()).toBe(true);
    if (prepared.isErr()) return;
    expect(prepared.value.join(" ")).toContain("reduced to 2 keys");
    expect(validateNativeAnimations(document, 15).isOk()).toBe(true);
    expect(extractAnimationsFromGLTF(document)[0]?.keyframes[0]?.map((frame) => [frame.tick, frame.coordX])).toEqual([[0, 0], [60, 60]]);
  });

  it("requires explicit lossy acceptance for baked curves through the real normalization boundary", async () => {
    const { document, joint } = rig();
    const buffer = document.getRoot().listBuffers()[0] ?? document.createBuffer();
    const positions = document.createAccessor().setType("VEC3").setBuffer(buffer).setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]));
    document.createScene().addChild(document.createNode().setMesh(document.createMesh().addPrimitive(document.createPrimitive().setAttribute("POSITION", positions))));
    addChannel(document, joint, "translation", Array.from({ length: 91 }, (_, index) => index / 30), Array.from({ length: 91 }, (_, index) => [index, 0, 0]).flat());
    const refused = await prepareNativeDocument(document, false);
    expect(refused.isErr()).toBe(true);
    if (refused.isErr()) expect(refused.error).toContain("Baked and reduced");
    const accepted = await prepareNativeDocument(document, true);
    expect(accepted.isOk()).toBe(true);
    if (accepted.isOk()) expect(accepted.value.warnings.join(" ")).toContain("reduced to 2 keys");
  });

  it("evaluates cubic tangent Hermite values, then bounds reduced motion error at every native tick", () => {
    const { document, joint } = rig();
    const channel = addChannel(document, joint, "translation", [0, 1], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 10, 0, 0, 0, 0, 0], "CUBICSPLINE");
    expect(sampleAnimationChannel(channel, 0.25)[0]).toBeCloseTo(1.5625);
    const expected = Array.from({ length: 31 }, (_, tick) => sampleAnimationChannel(channel, tick / 30)[0] ?? 0);
    const prepared = prepareNativeAnimations(document, 15);
    expect(prepared.isOk()).toBe(true);
    expect(channel.getSampler()?.getInterpolation()).toBe("LINEAR");
    expect(channel.getSampler()?.getInput()?.getCount()).toBeLessThanOrEqual(15);
    for (const [tick, value] of expected.entries()) expect(Math.abs((sampleAnimationChannel(channel, tick / 30)[0] ?? 0) - value)).toBeLessThanOrEqual(0.25001);
  });

  it("normalizes quaternion cubic samples without treating tangents as values", () => {
    const { document, joint } = rig();
    const channel = addChannel(document, joint, "rotation", [0, 1], [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0], "CUBICSPLINE");
    const middle = sampleAnimationChannel(channel, 0.5);
    expect(Math.hypot(...middle)).toBeCloseTo(1);
    expect(middle[2]).toBeCloseTo(Math.SQRT1_2);
    expect(middle[3]).toBeCloseTo(Math.SQRT1_2);
    expect(prepareNativeAnimations(document, 60).isOk()).toBe(true);
  });

  it("refuses curves that cannot meet the reduction budget rather than exceeding native limits", () => {
    const { document, joint } = rig();
    addChannel(document, joint, "translation", Array.from({ length: 31 }, (_, index) => index / 30), Array.from({ length: 31 }, (_, index) => [index % 2 ? 100 : 0, 0, 0]).flat());
    const prepared = prepareNativeAnimations(document, 15);
    expect(prepared.isErr()).toBe(true);
    if (prepared.isErr()) expect(prepared.error).toContain("Simplify or split");
  });

  it("preserves real native Blob animation ticks, acceleration modes and serialized skeleton tracks", async () => {
    const original = await parseBG3DWithSkeleton(fixture("Blob.bg3d"), fixture("Blob.skeleton.rsrc"));
    expect(original.isOk()).toBe(true);
    if (original.isErr() || !original.value.skeleton) return;
    const document = bg3dParsedToGLTF(original.value);
    expect(validateNativeAnimations(document).isOk()).toBe(true);
    const restored = gltfToBG3D(document).skeleton;
    expect(restored).toBeDefined();
    if (!restored) return;
    expect(restored.animations.map((clip) => clip.events)).toEqual(original.value.skeleton.animations.map((clip) => clip.events));
    for (const [clipIndex, clip] of original.value.skeleton.animations.entries()) {
      for (const [bone, frames] of Object.entries(clip.keyframes)) {
        const actual = restored.animations[clipIndex]?.keyframes[Number(bone)];
        expect(actual?.map((frame) => [frame.tick, frame.accelerationMode])).toEqual(frames.map((frame) => [frame.tick, frame.accelerationMode]));
        for (const [index, frame] of frames.entries()) {
          expect(actual?.[index]?.coordX).toBeCloseTo(frame.coordX, 3);
          expect(actual?.[index]?.coordY).toBeCloseTo(frame.coordY, 3);
          expect(actual?.[index]?.coordZ).toBeCloseTo(frame.coordZ, 3);
          expect(actual?.[index]?.rotationX).toBeCloseTo(frame.rotationX, 3);
          expect(actual?.[index]?.rotationY).toBeCloseTo(frame.rotationY, 3);
          expect(actual?.[index]?.rotationZ).toBeCloseTo(frame.rotationZ, 3);
          expect(actual?.[index]?.scaleX).toBeCloseTo(frame.scaleX, 3);
          expect(actual?.[index]?.scaleY).toBeCloseTo(frame.scaleY, 3);
          expect(actual?.[index]?.scaleZ).toBeCloseTo(frame.scaleZ, 3);
        }
      }
    }
    const binary = skeletonResourceToBinary(bg3dSkeletonToSkeletonResource(restored));
    expect(binary.isOk()).toBe(true);
    if (binary.isErr()) return;
    const reparsed = await parseSkeletonRsrcResult(binary.value);
    expect(reparsed.isOk()).toBe(true);
    if (reparsed.isOk()) expect(Object.keys(reparsed.value.KeyF ?? {})).toHaveLength(restored.bones.length * restored.animations.length);
  });
});
