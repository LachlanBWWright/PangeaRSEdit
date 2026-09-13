import { describe, expect, it } from "vitest";
import { Document, WebIO } from "@gltf-transform/core";
import { convertGltfAsset } from "./scriptAssetConversion";
import { parseBG3D } from "@/modelParsers/parseBG3D";

async function createTriangleGlb(): Promise<Uint8Array> {
  const document = new Document();
  const buffer = document.createBuffer();
  const primitive = document
    .createPrimitive()
    .setAttribute(
      "POSITION",
      document
        .createAccessor()
        .setType("VEC3")
        .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
        .setBuffer(buffer),
    );
  const mesh = document.createMesh().addPrimitive(primitive);
  const node = document.createNode().setMesh(mesh);
  const scene = document.createScene().addChild(node);
  document.getRoot().setDefaultScene(scene);
  const glb = await new WebIO().writeBinary(document);
  return new Uint8Array(glb);
}

describe("scriptAssetConversion", () => {
  it("normalizes and converts a supported glb into a native runtime asset", async () => {
    const result = await convertGltfAsset("crate.glb", await createTriangleGlb());

    if (result.isErr()) {
      expect.fail(result.error);
      return;
    }
    expect(result.value.nativeBytes.byteLength).toBeGreaterThan(0);
    expect(result.value.normalizedSourceBytes.byteLength).toBeGreaterThan(0);
    const parsed = parseBG3D(new Uint8Array(result.value.nativeBytes).buffer);
    expect(parsed.isOk()).toBe(true);
    if (parsed.isOk()) {
      expect(parsed.value.materials.length).toBeGreaterThan(0);
    }
  });

  it("rejects non-modern model paths before conversion", async () => {
    const result = await convertGltfAsset("crate.bg3d", new Uint8Array());

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.fail("Expected unsupported model format");
    }
    expect(result.error).toContain("Unsupported modern model format");
  });

  it("produces deterministic native and normalized bytes", async () => {
    const source = await createTriangleGlb();
    const first = await convertGltfAsset("crate.glb", source);
    const second = await convertGltfAsset("crate.glb", source);

    expect(first.isOk()).toBe(true);
    expect(second.isOk()).toBe(true);
    if (first.isErr() || second.isErr()) return;
    expect(first.value.nativeBytes).toEqual(second.value.nativeBytes);
    expect(first.value.normalizedSourceBytes).toEqual(second.value.normalizedSourceBytes);
    expect(first.value.warnings).toEqual(second.value.warnings);
  });

  it("rejects malformed modern model bytes", async () => {
    const result = await convertGltfAsset("broken.glb", new Uint8Array([0, 1, 2, 3]));

    expect(result.isErr()).toBe(true);
    if (result.isOk()) {
      expect.fail("Expected malformed glTF input to be rejected");
    }
  });
});
