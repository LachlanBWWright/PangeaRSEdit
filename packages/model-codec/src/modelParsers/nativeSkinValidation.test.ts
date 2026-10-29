import { Document } from "@gltf-transform/core";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { prepareNativeDocument } from "../node/gltf";
import { bg3dParsedToBG3D } from "./parseBG3D";
import { bg3dParsedToGLTF, gltfToBG3D } from "./parsedBg3dGitfConverter";
import { readNativeAsset } from "../node/native";
import { parseBG3DWithSkeleton } from "./bg3dWithSkeleton";
import { bg3dSkeletonToSkeletonResource } from "./skeletonExport";
import { skeletonResourceToBinary } from "./skeletonBinaryExport";
import { readNativeNormalBindings } from "./nativeNormalBindings";

function rig(positions: readonly number[], normals: readonly number[]): Document {
  const document = new Document();
  const buffer = document.createBuffer();
  const left = document.createNode("Left joint");
  const right = document.createNode("Right joint");
  const skin = document.createSkin().addJoint(left).addJoint(right);
  const position = document.createAccessor().setType("VEC3").setBuffer(buffer).setArray(new Float32Array(positions));
  const normal = document.createAccessor().setType("VEC3").setBuffer(buffer).setArray(new Float32Array(normals));
  const joints = document.createAccessor().setType("VEC4").setBuffer(buffer).setArray(new Uint16Array([0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]));
  const weights = document.createAccessor().setType("VEC4").setBuffer(buffer).setArray(new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]));
  const indices = document.createAccessor().setType("SCALAR").setBuffer(buffer).setArray(new Uint16Array([0, 1, 2]));
  const primitive = document.createPrimitive().setAttribute("POSITION", position).setAttribute("NORMAL", normal).setAttribute("JOINTS_0", joints).setAttribute("WEIGHTS_0", weights).setIndices(indices);
  const mesh = document.createNode().setMesh(document.createMesh("Leg mesh").addPrimitive(primitive)).setSkin(skin);
  document.createScene().addChild(left).addChild(right).addChild(mesh);
  return document;
}

describe("native rigid skin palette safety", () => {
  it("preserves independent normal owners when a production Ant rig passes through GLB", async () => {
    const path = fileURLToPath(new URL("../../../../frontend/public/games/bugdom1/skeletons/Ant.3dmf", import.meta.url));
    const source = await readNativeAsset(path);
    expect(source.isOk()).toBe(true);
    if (source.isErr() || !source.value.parsed.skeleton) return;
    const document = bg3dParsedToGLTF(source.value.parsed);
    const accepted = await prepareNativeDocument(document, false, 15);
    expect(accepted.isOk(), accepted.isErr() ? accepted.error : "").toBe(true);
    if (accepted.isErr()) return;
    const restored = gltfToBG3D(accepted.value.document);
    const bindings = readNativeNormalBindings(accepted.value.document);
    expect(bindings).not.toBeNull();
    if (!bindings) return;
    const originalOwners = Object.fromEntries(source.value.parsed.skeleton.bones.flatMap((bone, joint) => (bone.normalIndices ?? []).map((index) => [index, joint])));
    const restoredOwners = Object.fromEntries(restored.skeleton?.bones.flatMap((bone, joint) => (bone.normalIndices ?? []).map((index) => [index, joint])) ?? []);
    // Stock resources may contain trailing slots that no normalized mesh normal references.
    const consumedOwners = Object.fromEntries(Object.entries(originalOwners).filter(([index]) => Number(index) < bindings.normals.length));
    expect(restoredOwners).toEqual(consumedOwners);
    const joint = accepted.value.document.getRoot().listSkins()[0]?.listJoints()[0];
    const originalName = joint?.getName();
    joint?.setName("Replaced joint");
    expect(readNativeNormalBindings(accepted.value.document)).toBeNull();
    if (originalName !== undefined) joint?.setName(originalName);
    const extras = accepted.value.document.getRoot().getExtras();
    accepted.value.document.getRoot().setExtras({ ...extras, pangeaNativeNormalBindings: null });
    const refused = await prepareNativeDocument(accepted.value.document, true, 15);
    expect(refused.isErr()).toBe(true);
    if (refused.isErr()) expect(refused.error).toContain("normal palette entry");
  });

  it("refuses coincident vertices belonging to different joints even with lossy conversion enabled", async () => {
    const document = rig([0, 0, 0, 0, 0, 0, 1, 0, 0], [1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const result = await prepareNativeDocument(document, true);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toContain("Leg mesh");
      expect(result.error).toContain("vertex 1");
      expect(result.error).toContain("Left joint and Right joint");
      expect(result.error).toContain("0.001 game units");
    }
  });

  it("normalizes normals and refuses cross-joint matches at the runtime 0.02 tolerance", async () => {
    const document = rig([0, 0, 0, 1, 0, 0, 0, 1, 0], [2, 0, 0, 1, 0.01, 0, 0, 0, 1]);
    const result = await prepareNativeDocument(document, true);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error).toContain("normal palette entry");
      expect(result.error).toContain("0.02 on one axis");
    }
  });

  it("keeps distinct normalized runtime palette ownership through native binary serialization", async () => {
    const document = rig([0, 0, 0, 1, 0, 0, 0, 1, 0], [2, 0, 0, 1, 0.03, 0, 0, 0, 3]);
    const result = await prepareNativeDocument(document, true);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    const native = gltfToBG3D(result.value.document);
    const skeleton = native.skeleton;
    expect(skeleton).toBeDefined();
    if (!skeleton) return;
    expect(skeleton.bones.map((bone) => bone.normalIndices)).toEqual([[0], [1, 2]]);
    const resource = skeletonResourceToBinary(bg3dSkeletonToSkeletonResource(skeleton));
    expect(resource.isOk()).toBe(true);
    if (resource.isErr()) return;
    const reparsed = await parseBG3DWithSkeleton(bg3dParsedToBG3D(native), resource.value);
    expect(reparsed.isOk()).toBe(true);
    if (reparsed.isOk()) {
      expect(reparsed.value.skeleton?.bones.map((bone) => bone.pointIndices)).toEqual([[0], [1, 2]]);
      expect(reparsed.value.skeleton?.bones.map((bone) => bone.normalIndices)).toEqual([[0], [1, 2]]);
    }
  });
});
