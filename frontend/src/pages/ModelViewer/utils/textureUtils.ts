/**
 * Texture extraction and conversion utilities
 *
 * Converts BG3D texture data into displayable canvas images across multiple formats:
 * - GL_RGB (24-bit)
 * - GL_RGBA (32-bit)
 * - GL_UNSIGNED_SHORT_1_5_5_5_REV (16-bit ARGB with alpha blending)
 * - JPEG (Nanosaur 2)
 */

import { BG3DParseResult } from "../../../modelParsers/parseBG3D";
import {
  argb16ToRgba8,
  rgb24ToRgba8,
} from "../../../modelParsers/image/pngArgb";
import { decodeJpegNode } from "../../../utils/jpegDecompress";
import type { Texture } from "../types";

/**
 * Extracts textures from parsed BG3D data and converts them to displayable images
 *
 * @param bg3dParsed - Parsed BG3D model data containing materials and textures
 * @returns Promise resolving to array of Texture objects with canvas image data URLs
 */
export async function extractTexturesFromBG3D(
  bg3dParsed: BG3DParseResult | null,
): Promise<Texture[]> {
  if (!bg3dParsed) {
    return [];
  }

  const extractedTextures: Texture[] = [];

  for (const [materialIndex, material] of bg3dParsed.materials.entries()) {
    for (const [textureIndex, texture] of material.textures.entries()) {
      // Create a canvas to convert the raw pixel data to an image
      const canvas = document.createElement("canvas");
      canvas.width = texture.width;
      canvas.height = texture.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;

      let imageData: ImageData;

      // Use srcPixelFormat to determine how to decode the texture data
      if (texture.srcPixelFormat === 6407) {
        // GL_RGB format (24-bit)
        imageData = ctx.createImageData(texture.width, texture.height);
        const rgba = rgb24ToRgba8(texture.pixels);
        imageData.data.set(rgba);
      } else if (texture.srcPixelFormat === 6408) {
        // GL_RGBA format (32-bit)
        imageData = ctx.createImageData(texture.width, texture.height);
        imageData.data.set(texture.pixels);
      } else if (texture.srcPixelFormat === 33638) {
        // GL_UNSIGNED_SHORT_1_5_5_5_REV format (16-bit ARGB)
        // Need to apply byte swap like the glTF conversion does in bg3dGltf/bg3d/materials.ts
        imageData = ctx.createImageData(texture.width, texture.height);
        const pixelCount = texture.width * texture.height;
        const src = new Uint16Array(
          texture.pixels.buffer,
          texture.pixels.byteOffset,
          pixelCount,
        );
        const swapped = new Uint16Array(src.length);
        for (let k = 0; k < src.length; k++) {
          const val = src[k] ?? 0;
          swapped[k] = ((val & 0xff) << 8) | ((val >> 8) & 0xff);
        }

        // Check if material has alpha blending enabled
        const hasAlphaBlending = (material.flags & 0x2) !== 0; // BG3D_MATERIALFLAG_ALWAYSBLEND

        if (hasAlphaBlending) {
          // Material uses alpha blending, so respect the alpha bit
          const rgba = argb16ToRgba8(swapped);
          imageData.data.set(rgba);
        } else {
          // Material doesn't use alpha blending, treat as fully opaque
          // This ensures textures that don't use alpha channel display correctly
          const rgba = new Uint8Array(pixelCount * 4);
          for (let i = 0; i < pixelCount; i++) {
            const v = swapped[i] ?? 0;
            const r = (((v >> 10) & 0x1f) * 255) / 31;
            const g = (((v >> 5) & 0x1f) * 255) / 31;
            const b = ((v & 0x1f) * 255) / 31;
            rgba[i * 4 + 0] = r;
            rgba[i * 4 + 1] = g;
            rgba[i * 4 + 2] = b;
            rgba[i * 4 + 3] = 255; // Always opaque
          }
          imageData.data.set(rgba);
        }
      } else if (texture.isJpeg) {
        // JPEG texture (Nanosaur 2)
        // Data format: ImageDescription header + compressed image data
        // First 4 bytes (big-endian) = offset to actual image data
        const expectedPixelCount = texture.width * texture.height;
        imageData = ctx.createImageData(texture.width, texture.height);

        // Read the offset from the first 4 bytes (big-endian)
        const view = new DataView(
          texture.pixels.buffer,
          texture.pixels.byteOffset,
        );
        const offset = view.getInt32(0, false); // false = big-endian

        // Extract the actual compressed image data
        const payloadSize = texture.bufferSize - offset;
        const payloadView = new Uint8Array(
          texture.pixels.buffer,
          texture.pixels.byteOffset + offset,
          payloadSize,
        );

        // Copy payload to a new buffer (required for decodeJpegNode)
        const payloadBuffer = new Uint8Array(payloadSize);
        payloadBuffer.set(payloadView);

        // Use decodeJpegNode to decompress the payload
        // (it can handle JPEG and other image formats that stbi supports)
        const decompressedImageData = decodeJpegNode(payloadBuffer.buffer);
        imageData = decompressedImageData;

        // If there's separate alpha data, blend it in
        if (
          texture.jpegAlphaData &&
          texture.jpegAlphaData.length === expectedPixelCount
        ) {
          for (let i = 0; i < expectedPixelCount; i++) {
            imageData.data[i * 4 + 3] = texture.jpegAlphaData[i] ?? 255;
          }
        }
      } else {
        // Unknown format, fill with gray
        imageData = ctx.createImageData(texture.width, texture.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = 128;
          imageData.data[i + 1] = 128;
          imageData.data[i + 2] = 128;
          imageData.data[i + 3] = 255;
        }
      }

      // Adjust canvas size to match imageData dimensions (important for JPEG which may have different dimensions)
      if (
        canvas.width !== imageData.width ||
        canvas.height !== imageData.height
      ) {
        canvas.width = imageData.width;
        canvas.height = imageData.height;
      }

      ctx.putImageData(imageData, 0, 0);
      const imageUrl = canvas.toDataURL("image/png");
      extractedTextures.push({
        name: `Material_${materialIndex}_Texture_${textureIndex}`,
        url: imageUrl,
        type: "diffuse",
        material: `Material ${materialIndex}`,
        size: { width: imageData.width, height: imageData.height },
      });
    }
  }

  return extractedTextures;
}
