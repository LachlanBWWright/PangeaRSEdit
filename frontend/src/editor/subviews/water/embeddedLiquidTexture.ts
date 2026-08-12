import {
  parseBG3D,
  PixelFormatSrc,
  type BG3DParseResult,
  type BG3DTexture,
} from "@/modelParsers/parseBG3D";
import { err, ok, ResultAsync, type Result } from "neverthrow";

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
  const canvas = document.createElement("canvas");
  canvas.width = texture.width;
  canvas.height = texture.height;
  const context = canvas.getContext("2d");
  if (!context) return err("Canvas context is unavailable");

  let pixels: Uint8ClampedArray;
  if (texture.srcPixelFormat === PixelFormatSrc.GL_RGBA) {
    pixels = new Uint8ClampedArray(texture.pixels);
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
  context.putImageData(
    new ImageData(imagePixels, texture.width, texture.height),
    0,
    0,
  );
  return ok(canvas);
}

export function loadBg3dMaterialTexture(
  url: string,
  materialIndex: number,
): ResultAsync<HTMLCanvasElement, string> {
  return ResultAsync.fromPromise(fetch(url), (error) => String(error))
    .andThen((response) =>
      response.ok
        ? ResultAsync.fromPromise(response.arrayBuffer(), (error) => String(error))
        : err(`Could not load ${url}`),
    )
    .andThen((buffer) => parseBG3D(buffer))
    .andThen((model) => extractEmbeddedTexture(model, materialIndex))
    .andThen(embeddedTextureToCanvas);
}
