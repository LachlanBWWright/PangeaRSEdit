import { Document } from "@gltf-transform/core";
import { describe, expect, it } from "vitest";
import { prepareGltfFiles, prepareNativeDocument } from "../src/node/gltf";
import { rgba8ToPngResult } from "../src/modelParsers/image/pngArgb";

function triangleDocument(): Document {
  const document = new Document();
  const buffer = document.createBuffer();
  const positions = document.createAccessor().setType("VEC3").setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0])).setBuffer(buffer);
  const primitive = document.createPrimitive().setAttribute("POSITION", positions);
  const mesh = document.createMesh().addPrimitive(primitive);
  const scene = document.createScene().addChild(document.createNode().setMesh(mesh));
  document.getRoot().setDefaultScene(scene);
  return document;
}

describe("native compatibility policy", () => {
  it("returns a typed error for malformed PNG pixels", async () => {
    const document = triangleDocument();
    const texture = document.createTexture("broken").setMimeType("image/png").setImage(new Uint8Array([1, 2, 3]));
    document.createMaterial().setBaseColorTexture(texture);
    const result = await prepareNativeDocument(document, true);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toContain("broken");
  });

  it("requires explicit acceptance before dropping a normal map", async () => {
    const document = triangleDocument();
    const encoded = rgba8ToPngResult(new Uint8Array([128, 128, 255, 255]), 1, 1);
    expect(encoded.isOk()).toBe(true);
    if (encoded.isErr()) return;
    const texture = document.createTexture().setMimeType("image/png").setImage(encoded.value);
    const material = document.createMaterial().setNormalTexture(texture);
    document.getRoot().listMeshes()[0]?.listPrimitives()[0]?.setMaterial(material);
    const refused = await prepareNativeDocument(document, false);
    expect(refused.isErr()).toBe(true);
    if (refused.isErr()) expect(refused.error).toContain("--allow-lossy");
    const accepted = await prepareNativeDocument(document, true);
    expect(accepted.isOk()).toBe(true);
    if (accepted.isOk()) expect(accepted.value.warnings.join(" ")).toContain("normal maps");
  });

  it("rejects unsupported image codecs instead of silently dropping textures", async () => {
    const document = triangleDocument();
    document.createTexture().setMimeType("image/webp").setImage(new Uint8Array([1, 2, 3]));
    const result = await prepareNativeDocument(document, true);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toContain("image/webp");
  });

  it("merges multiple glTF buffers when writing GLB", async () => {
    const document = triangleDocument();
    const normals = document.createAccessor().setType("VEC3").setArray(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1])).setBuffer(document.createBuffer());
    document.getRoot().listMeshes()[0]?.listPrimitives()[0]?.setAttribute("NORMAL", normals);
    expect(document.getRoot().listBuffers()).toHaveLength(2);
    const result = await prepareGltfFiles(document, "/unused/model.glb");
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toHaveLength(1);
      expect(result.value[0]?.bytes.length).toBeGreaterThan(100);
    }
    expect(document.getRoot().listBuffers()).toHaveLength(1);
  });
});
