import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { Result, ResultAsync } from "neverthrow";
import Jpeg from "jpeg-js";
import { Document } from "@gltf-transform/core";
import { BG3DTagType, bg3dParsedToBG3D, parseBG3D, PixelFormatSrc } from "./parseBG3D";
import { convertBG3DTextureToPngResult } from "./materialConversion";
import { mapCodecError } from "../schemas/common";
import { pngToRgba8Result } from "./image/pngArgb";
import { gltfToBG3D } from "./parsedBg3dGitfConverter";

function file(words: readonly number[]): ArrayBuffer {
  const buffer = new ArrayBuffer(20 + words.length * 4);
  new Uint8Array(buffer).set([66, 71, 51, 68]);
  const view = new DataView(buffer);
  words.forEach((word, index) => view.setUint32(20 + index * 4, word, false));
  return buffer;
}

describe("BG3D malformed binary boundaries", () => {
  it("returns typed errors for every truncated header and end tag", () => {
    const complete = file([BG3DTagType.MATERIALFLAGS, 0, BG3DTagType.ENDFILE]);
    expect(parseBG3D(complete).isOk()).toBe(true);
    for (let size = 0; size < complete.byteLength; size++) expect(parseBG3D(complete.slice(0, size)).isErr()).toBe(true);
  });

  it.each([BG3DTagType.MATERIALFLAGS, BG3DTagType.MATERIALDIFFUSECOLOR, BG3DTagType.TEXTUREMAP, BG3DTagType.JPEGTEXTURE, BG3DTagType.GEOMETRY, BG3DTagType.BOUNDINGBOX])("rejects truncated fixed payload for tag %s", (tag) => {
    expect(parseBG3D(file([tag])).isErr()).toBe(true);
  });

  it("checks array counts and texture data lengths before allocating or reading them", () => {
    const geometry = [BG3DTagType.GEOMETRY, 1, 0, 0, 0, 0, 0, 0, 0xffffffff, 0, 0, 0, 0, 0];
    expect(parseBG3D(file([...geometry, BG3DTagType.VERTEXARRAY])).isErr()).toBe(true);
    expect(parseBG3D(file([BG3DTagType.MATERIALFLAGS, 0, BG3DTagType.TEXTUREMAP, 1, 1, 6407, 32855, 100, 0, 0, 0, 0])).isErr()).toBe(true);
    expect(parseBG3D(file([BG3DTagType.MATERIALFLAGS, 0, BG3DTagType.JPEGTEXTURE, 0xffffffff, 0xffffffff, 0, 1])).isErr()).toBe(true);
  });

  it("rejects excessive nesting before recursive model traversal", () => {
    expect(parseBG3D(file([...Array.from({ length: 513 }, () => BG3DTagType.GROUPSTART), BG3DTagType.ENDFILE])).isErr()).toBe(true);
  });
});

describe("strict native texture conversion", () => {
  it("returns typed errors for malformed PNG chunks, including signed-length overflow", () => {
    expect(pngToRgba8Result(new Uint8Array([137, 80])).isErr()).toBe(true);
    const oversized = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 255, 255, 255, 255, 73, 69, 78, 68]);
    expect(pngToRgba8Result(oversized).isErr()).toBe(true);
  });

  it("converts JPEG images with real non-square dimensions to ordinary native RGBA pixels", () => {
    const encoded = Result.fromThrowable(() => Jpeg.encode({ width: 2, height: 3, data: Buffer.from(new Uint8Array(24).fill(255)) }, 90), mapCodecError)();
    expect(encoded.isOk()).toBe(true);
    if (encoded.isErr()) return;
    const doc = new Document();
    const texture = doc.createTexture().setImage(new Uint8Array(encoded.value.data)).setMimeType("image/jpeg");
    doc.createMaterial().setBaseColorTexture(texture);
    const parsed = gltfToBG3D(doc);
    const native = parsed.materials[0]?.textures[0];
    expect(native?.width).toBe(2);
    expect(native?.height).toBe(3);
    expect(native?.srcPixelFormat).toBe(PixelFormatSrc.GL_RGBA);
    expect(native?.isJpeg).toBeUndefined();
    expect(native?.pixels.byteLength).toBe(24);
    expect(parseBG3D(bg3dParsedToBG3D(parsed)).isOk()).toBe(true);
  });
  it("reports invalid JPEG boundaries and raw pixel lengths without throwing", () => {
    const jpeg = { width: 1, height: 1, srcPixelFormat: -1, dstPixelFormat: -1, bufferSize: 4, pixels: new Uint8Array([0, 0, 0, 4]), isJpeg: true };
    expect(convertBG3DTextureToPngResult(jpeg).isErr()).toBe(true);
    expect(convertBG3DTextureToPngResult({ ...jpeg, isJpeg: false, srcPixelFormat: PixelFormatSrc.GL_RGBA, width: 2 }).isErr()).toBe(true);
    expect(convertBG3DTextureToPngResult({ ...jpeg, pixels: new Uint8Array([0, 0, 0, 4, 1]), bufferSize: 5 }).isErr()).toBe(true);
  });

  it("encodes valid ARGB16 textures even with an odd source byte offset", () => {
    const bytes = new Uint8Array([0, 255, 255]);
    const result = convertBG3DTextureToPngResult({ width: 1, height: 1, srcPixelFormat: PixelFormatSrc.GL_UNSIGNED_SHORT_1_5_5_5_REV, dstPixelFormat: 32855, bufferSize: 2, pixels: bytes.subarray(1) });
    expect(result.isOk()).toBe(true);
    if (result.isOk()) expect([...result.value.subarray(0, 4)]).toEqual([137, 80, 78, 71]);
  });

  it("decodes actual Nanosaur 2 QuickTime JPEG textures using the standalone codec", async () => {
    const bytes = await ResultAsync.fromPromise(readFile(new URL("../../../../games/pangea-ports/games/Nanosaur2-Android/Data/Models/weapons.bg3d", import.meta.url)), mapCodecError);
    expect(bytes.isOk()).toBe(true);
    if (bytes.isErr()) return;
    const model = parseBG3D(new Uint8Array(bytes.value).buffer);
    expect(model.isOk()).toBe(true);
    if (model.isErr()) return;
    const textures = model.value.materials.flatMap((material) => material.textures).filter((texture) => texture.isJpeg);
    expect(textures.length).toBeGreaterThan(0);
    for (const texture of textures) expect(convertBG3DTextureToPngResult(texture).isOk()).toBe(true);
  });
});
