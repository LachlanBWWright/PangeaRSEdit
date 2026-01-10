/**
 * Tunnel Texture Utilities
 *
 * Utilities for working with embedded RGBA textures in tunnel files.
 */

import type { TunnelTexture } from "./types";

/**
 * Convert tunnel texture to an HTMLCanvasElement for display
 *
 * @param texture - The tunnel texture data
 * @returns Canvas element with the texture rendered
 */
export function tunnelTextureToCanvas(texture: TunnelTexture): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = texture.width;
  canvas.height = texture.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return canvas;
  }

  const imageData = ctx.createImageData(texture.width, texture.height);
  imageData.data.set(texture.data);
  ctx.putImageData(imageData, 0, 0);

  return canvas;
}

/**
 * Convert canvas to tunnel texture format
 *
 * @param canvas - The source canvas
 * @returns TunnelTexture with RGBA data
 */
export function canvasToTunnelTexture(canvas: HTMLCanvasElement): TunnelTexture {
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      width: canvas.width,
      height: canvas.height,
      data: new Uint8Array(canvas.width * canvas.height * 4),
    };
  }

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  return {
    width: canvas.width,
    height: canvas.height,
    data: new Uint8Array(imageData.data),
  };
}

/**
 * Create a data URL from tunnel texture for use in img elements
 *
 * @param texture - The tunnel texture data
 * @returns Data URL string
 */
export function tunnelTextureToDataUrl(texture: TunnelTexture): string {
  const canvas = tunnelTextureToCanvas(texture);
  return canvas.toDataURL("image/png");
}

/**
 * Create a placeholder texture with a solid color
 *
 * @param width - Texture width
 * @param height - Texture height
 * @param r - Red component (0-255)
 * @param g - Green component (0-255)
 * @param b - Blue component (0-255)
 * @param a - Alpha component (0-255)
 * @returns TunnelTexture with solid color
 */
export function createSolidTexture(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
  a = 255,
): TunnelTexture {
  const size = width * height * 4;
  const data = new Uint8Array(size);

  for (let i = 0; i < size; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = a;
  }

  return { width, height, data };
}
