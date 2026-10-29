import {
  parseBG3D,
  PixelFormatSrc,
  type BG3DParseResult,
  type BG3DTexture,
  type BG3DGroup,
  type BG3DGeometry,
} from "@/modelParsers/parseBG3D";
import { parse3DMF } from "@/modelParsers/parse3dmf";
import { err, ok, ResultAsync, Result } from "neverthrow";
import { fetchAsset } from "@/assets/fetchAsset";

export function extractEmbeddedTexture(
  model: BG3DParseResult,
  materialIndex: number,
): Result<BG3DTexture, string> {
  const material = model.materials[materialIndex];
  if (!material) return err(`Material ${materialIndex} does not exist`);
  const texture = material.textures[0];
  return texture
    ? ok(texture)
    : err(`Material ${materialIndex} does not contain a texture`);
}

function expandFiveBitChannel(value: number): number {
  return Math.round(value * (255 / 31));
}

function decodeArgb1555(texture: BG3DTexture): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(texture.width * texture.height * 4);
  const source = new DataView(
    texture.pixels.buffer,
    texture.pixels.byteOffset,
    texture.pixels.byteLength,
  );
  for (let index = 0; index < texture.width * texture.height; index++) {
    const value = source.getUint16(index * 2, false);
    pixels[index * 4] = expandFiveBitChannel((value >> 10) & 0x1f);
    pixels[index * 4 + 1] = expandFiveBitChannel((value >> 5) & 0x1f);
    pixels[index * 4 + 2] = expandFiveBitChannel(value & 0x1f);
    pixels[index * 4 + 3] = value & 0x8000 ? 255 : 0;
  }
  return pixels;
}

function decodeRgb(texture: BG3DTexture): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(texture.width * texture.height * 4);
  for (let index = 0; index < texture.width * texture.height; index++) {
    pixels[index * 4] = texture.pixels[index * 3] ?? 0;
    pixels[index * 4 + 1] = texture.pixels[index * 3 + 1] ?? 0;
    pixels[index * 4 + 2] = texture.pixels[index * 3 + 2] ?? 0;
    pixels[index * 4 + 3] = 255;
  }
  return pixels;
}

export function embeddedTextureToCanvas(
  texture: BG3DTexture,
): Result<HTMLCanvasElement, string> {
  const count = texture.width * texture.height;
  if (!Number.isSafeInteger(texture.width) || !Number.isSafeInteger(texture.height) || texture.width <= 0 || texture.height <= 0 || count > 16 * 1024 * 1024)
    return err("Invalid embedded texture dimensions");
  const channels = texture.srcPixelFormat === PixelFormatSrc.GL_RGBA ? 4 : texture.srcPixelFormat === PixelFormatSrc.GL_RGB ? 3 : 2;
  if (texture.pixels.length < count * channels) return err("Embedded texture pixels are incomplete");
  const canvas = document.createElement("canvas");
  canvas.width = texture.width;
  canvas.height = texture.height;
  const context = canvas.getContext("2d");
  if (!context) return err("Canvas context is unavailable");

  let pixels: Uint8ClampedArray;
  if (texture.srcPixelFormat === PixelFormatSrc.GL_RGBA) {
    pixels = new Uint8ClampedArray(texture.pixels.slice(0, count * 4));
  } else if (texture.srcPixelFormat === PixelFormatSrc.GL_RGB) {
    pixels = decodeRgb(texture);
  } else if (
    texture.srcPixelFormat === PixelFormatSrc.GL_UNSIGNED_SHORT_1_5_5_5_REV
  ) {
    pixels = decodeArgb1555(texture);
  } else {
    return err(`Unsupported embedded texture format ${texture.srcPixelFormat}`);
  }

  const imagePixels = new Uint8ClampedArray(pixels.length);
  imagePixels.set(pixels);
  return Result.fromThrowable(() => {
    context.putImageData(new ImageData(imagePixels, texture.width, texture.height), 0, 0);
    return canvas;
  }, () => "Could not decode the embedded texture on this canvas")();
}

export function loadModelMaterialTexture(
  url: string,
  materialIndex: number,
  modelIndex?: number,
): ResultAsync<HTMLCanvasElement, string> {
  return fetchAsset(url).mapErr((error) => error.message)
    .andThen((buffer) => buffer.byteLength >= 4 && new DataView(buffer).getUint32(0) === 0x33444d46 ? parse3DMF(buffer) : parseBG3D(buffer))
    .andThen((model) => {
      const geometry = modelIndex === undefined ? undefined : model.groups[0]?.children[modelIndex];
      const selected = modelIndex === undefined ? materialIndex : geometry ? firstMaterial(geometry) : -1;
      return extractEmbeddedTexture(model, selected ?? -1);
    })
    .andThen(embeddedTextureToCanvas);
}

function firstMaterial(node: BG3DGroup | BG3DGeometry): number | null {
  if (!("children" in node)) return node.layerMaterialNum[0] ?? null;
  for (const child of node.children) {
    const index = firstMaterial(child);
    if (index !== null) return index;
  }
  return null;
}
