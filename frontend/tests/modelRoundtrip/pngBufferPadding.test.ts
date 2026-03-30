import { describe, it, expect } from "vitest";
import { NodeIO, Document } from "@gltf-transform/core";
import { rgba8ToPng, pngToRgba8 } from "@/modelParsers/image/pngArgb";

function toExactArrayBuffer(data: Uint8Array | ArrayBuffer): ArrayBuffer {
  if (data instanceof ArrayBuffer) {
    return data.slice(0);
  }
  const copy = new ArrayBuffer(data.byteLength);
  new Uint8Array(copy).set(
    new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  );
  return copy;
}

describe("PNG buffer padding in GLB roundtrip", () => {
  it("decodes PNG from gltf-transform GLB without extra trailing bytes", async () => {
    // Create a minimal glTF document with a PNG texture
    const doc = new Document();
    const buf = doc.createBuffer("buffer");
    const scene = doc.createScene("scene");

    // Create a small 2x2 RGBA PNG
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

    // Roundtrip: write → read → write → read
    const glb1 = await io.writeBinary(doc);
    const doc2 = await io.readBinary(glb1);
    const glb2 = await io.writeBinary(doc2);
    const doc3 = await io.readBinary(glb2);

    // Extract texture image
    const textures = doc3.getRoot().listTextures();
    expect(textures.length).toBe(1);

    const image = textures[0]?.getImage();
    expect(image).toBeInstanceOf(Uint8Array);
    if (!(image instanceof Uint8Array)) return;

    // Log buffer info for debugging
    console.log("Image byteLength:", image.byteLength);
    console.log("Image byteOffset:", image.byteOffset);
    console.log("Image buffer byteLength:", image.buffer.byteLength);

    // Find IEND marker to check for trailing bytes
    let iendPos = -1;
    for (let i = image.byteLength - 12; i >= 0; i--) {
      if (
        image[i] === 0x49 &&
        image[i + 1] === 0x45 &&
        image[i + 2] === 0x4e &&
        image[i + 3] === 0x44
      ) {
        iendPos = i;
        break;
      }
    }

    if (iendPos >= 0) {
      const pngActualEnd = iendPos + 4 + 4; // IEND type (4) + CRC (4)
      const extraBytes = image.byteLength - pngActualEnd;
      console.log("IEND at:", iendPos, "PNG end:", pngActualEnd, "Extra:", extraBytes);
    }

    // This is the exact code path from gltfToBG3D
    const imageBuffer = toExactArrayBuffer(image);
    const result = await pngToRgba8(imageBuffer);
    expect(result.width).toBe(2);
    expect(result.height).toBe(2);
  });

  it("detects and handles trailing padding bytes in GLB image data", async () => {
    // Create a PNG with known content
    const rgba = new Uint8Array([
      128, 64, 32, 255, 64, 128, 32, 255, 32, 64, 128, 255, 255, 128, 64, 255,
    ]);
    const pngData = rgba8ToPng(rgba, 2, 2);

    // Simulate: add trailing padding bytes (like GLB alignment might)
    const paddedBuffer = new ArrayBuffer(pngData.byteLength + 3);
    new Uint8Array(paddedBuffer).set(new Uint8Array(pngData));

    // Try decoding padded buffer - this SHOULD fail with pngjs
    try {
      await pngToRgba8(paddedBuffer);
      // If it succeeds, that's fine
    } catch (e) {
      // Expected: "unrecognised content at end of stream"
      const err = e instanceof Error ? e : new Error(String(e));
      console.log("Expected error with padded buffer:", err.message);
      expect(err.message).toContain("content at end");

      // Now try with trimmed buffer
      const trimmedBuffer = paddedBuffer.slice(0, pngData.byteLength);
      const result = await pngToRgba8(trimmedBuffer);
      expect(result.width).toBe(2);
      expect(result.height).toBe(2);
    }
  });
});
