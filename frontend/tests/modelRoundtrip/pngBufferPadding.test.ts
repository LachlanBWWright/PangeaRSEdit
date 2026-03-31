import { describe, it, expect } from "vitest";
import { NodeIO, Document } from "@gltf-transform/core";
import { rgba8ToPng, pngToRgba8 } from "@/modelParsers/image/pngArgb";

describe("PNG buffer padding in GLB roundtrip", () => {
  it("decodes PNG from gltf-transform GLB without extra trailing bytes", async () => {
    const doc = new Document();
    const buf = doc.createBuffer("buffer");
    const scene = doc.createScene("scene");

    const rgba = new Uint8Array([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255,
    ]);
    const pngData = rgba8ToPng(rgba, 2, 2);

    const texture = doc
      .createTexture("tex")
      .setMimeType("image/png")
      .setImage(pngData);
    const material = doc.createMaterial("mat").setBaseColorTexture(texture);

    const positions = doc
      .createAccessor()
      .setType("VEC3")
      .setArray(new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]))
      .setBuffer(buf);
    const indices = doc
      .createAccessor()
      .setType("SCALAR")
      .setArray(new Uint32Array([0, 1, 2]))
      .setBuffer(buf);
    const prim = doc
      .createPrimitive()
      .setAttribute("POSITION", positions)
      .setIndices(indices)
      .setMaterial(material);
    const mesh = doc.createMesh("mesh").addPrimitive(prim);
    const node = doc.createNode("node").setMesh(mesh);
    scene.addChild(node);

    const io = new NodeIO();

    const glb1 = await io.writeBinary(doc);
    const doc2 = await io.readBinary(glb1);
    const glb2 = await io.writeBinary(doc2);
    const doc3 = await io.readBinary(glb2);

    const textures = doc3.getRoot().listTextures();
    expect(textures.length).toBe(1);

    const image = textures[0]?.getImage();
    expect(image).toBeInstanceOf(Uint8Array);
    if (!(image instanceof Uint8Array)) return;

    const imageBuffer = new ArrayBuffer(image.byteLength);
    new Uint8Array(imageBuffer).set(image);
    const result = pngToRgba8(imageBuffer);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
  });

  it("successfully decodes PNG with trailing padding bytes after IEND", async () => {
    const rgba = new Uint8Array([
      128, 64, 32, 255, 64, 128, 32, 255, 32, 64, 128, 255, 255, 128, 64, 255,
    ]);
    const pngData = rgba8ToPng(rgba, 2, 2);

    // Add trailing padding bytes (simulating GLB alignment)
    const paddedBuffer = new ArrayBuffer(pngData.byteLength + 3);
    new Uint8Array(paddedBuffer).set(new Uint8Array(pngData));

    // pngToRgba8 should now succeed even with trailing bytes
    const result = pngToRgba8(paddedBuffer);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
  });

  it("successfully decodes PNG from a Uint8Array view with trailing bytes", async () => {
    const rgba = new Uint8Array([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 0, 255,
    ]);
    const pngData = rgba8ToPng(rgba, 2, 2);

    // Create a larger buffer with the PNG at the beginning
    const paddedBuffer = new ArrayBuffer(pngData.byteLength + 16);
    new Uint8Array(paddedBuffer).set(new Uint8Array(pngData));

    // Create a Uint8Array view that includes the padding
    const paddedView = new Uint8Array(paddedBuffer, 0, pngData.byteLength + 8);

    // Convert to ArrayBuffer (simulating toExactArrayBuffer)
    const copy = new ArrayBuffer(paddedView.byteLength);
    new Uint8Array(copy).set(paddedView);

    // Should still decode correctly
    const result = pngToRgba8(copy);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
  });
});
