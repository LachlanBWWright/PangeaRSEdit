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
import { argb16ToRgba8, rgb24ToRgba8 } from "../../../modelParsers/image/pngArgb";
import type { Texture } from "../types";

/**
 * Extracts textures from parsed BG3D data and converts them to displayable images
 *
 * @param bg3dParsed - Parsed BG3D model data containing materials and textures
 * @returns Array of Texture objects with canvas image data URLs
 */
export function extractTexturesFromBG3D(
  bg3dParsed: BG3DParseResult | null
): Texture[] {
  if (!bg3dParsed) {
    return [];
  }

  const extractedTextures: Texture[] = [];

  bg3dParsed.materials.forEach((material, materialIndex) => {
    material.textures.forEach((texture, textureIndex) => {
      // Create a canvas to convert the raw pixel data to an image
      const canvas = document.createElement("canvas");
      canvas.width = texture.width;
      canvas.height = texture.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const imageData = ctx.createImageData(texture.width, texture.height);

      // Use srcPixelFormat to determine how to decode the texture data
      if (texture.srcPixelFormat === 6407) {
        // GL_RGB format (24-bit)
        const rgba = rgb24ToRgba8(texture.pixels);
        imageData.data.set(rgba);
      } else if (texture.srcPixelFormat === 6408) {
        // GL_RGBA format (32-bit)
        imageData.data.set(texture.pixels);
      } else if (texture.srcPixelFormat === 33638) {
        // GL_UNSIGNED_SHORT_1_5_5_5_REV format (16-bit ARGB)
        // Need to apply byte swap like the glTF conversion does in bg3dGltf/bg3d/materials.ts
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
        // For now, fill with gray - JPEG handling would need decompression
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = 128;
          imageData.data[i + 1] = 128;
          imageData.data[i + 2] = 128;
          imageData.data[i + 3] = 255;
        }
      } else {
        // Unknown format, fill with gray
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] = 128;
          imageData.data[i + 1] = 128;
          imageData.data[i + 2] = 128;
          imageData.data[i + 3] = 255;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      const imageUrl = canvas.toDataURL("image/png");
      extractedTextures.push({
        name: `Material_${materialIndex}_Texture_${textureIndex}`,
        url: imageUrl,
        type: "diffuse",
        material: `Material ${materialIndex}`,
        size: { width: texture.width, height: texture.height },
      });
    });
  });

  return extractedTextures;
}
