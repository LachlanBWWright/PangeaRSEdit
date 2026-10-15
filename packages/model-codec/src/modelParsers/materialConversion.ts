/**
 * Material and Texture Conversion Utilities
 *
 * Handles conversion of BG3D materials and textures to glTF format,
 * including pixel format handling, JPEG decompression, and alpha modes.
 */

import {
  BG3DMaterial,
  BG3DTexture,
  BG3DMaterialFlags,
  PixelFormatSrc,
} from "./parseBG3D";
import { argb16ToRgba8, rgb24ToRgba8, rgba8ToPngResult } from "./image/pngArgb";
import { decodeJpegNodeResult } from "../utils/jpegDecompress";
import { Document, Material } from "@gltf-transform/core";
import { err, type Result } from "neverthrow";

/**
 * Convert BG3D material properties to glTF material settings
 *
 * Handles:
 * - Base color and opacity
 * - Alpha mode determination based on texture format
 * - Special handling for JPEG textures with alpha channels
 * - Binary alpha (ARGB16) vs blended alpha
 */
export function convertBG3DMaterialToGltf(
  doc: Document,
  bgMaterial: BG3DMaterial,
  materialIndex: number,
): Material {
  const gltfMaterial = doc.createMaterial("BG3DMaterial");
  gltfMaterial.setName(`Material_${materialIndex.toString().padStart(4, "0")}`);
  gltfMaterial.setExtras({ pangeaMaterialFlags: bgMaterial.flags });

  // Set base color from BG3D diffuse color
  gltfMaterial.setBaseColorFactor(bgMaterial.diffuseColor);

  // glTF default metallic=1 makes models black without an environment map;
  // BG3D materials are not PBR.
  gltfMaterial.setMetallicFactor(0);
  gltfMaterial.setRoughnessFactor(1);

  // Determine alpha mode based on BG3D material properties
  // JPEG textures (Nanosaur 2) are opaque unless they carry a separate alpha channel
  // (jpegAlphaData). Using BLEND on a fully-opaque texture forces Three.js into the
  // transparent render pass and causes depth-sorting artefacts.
  // JPEG alpha data represents hard cutout transparency (like window/glass outlines),
  // so MASK (alphaTest=0.5) is preferable over BLEND — it avoids the depth-sort pass
  // entirely while still punching out the transparent pixels correctly.
  const hasJpegTexture = bgMaterial.textures.some((t) => t.isJpeg);
  const hasJpegAlpha = bgMaterial.textures.some(
    (t) => t.isJpeg && t.jpegAlphaData,
  );

  if (hasJpegTexture) {
    if (hasJpegAlpha) {
      gltfMaterial.setAlphaMode("MASK");
      gltfMaterial.setAlphaCutoff(0.5);
    } else {
      gltfMaterial.setAlphaMode("OPAQUE");
    }
  } else if (
    bgMaterial.flags & BG3DMaterialFlags.BG3D_MATERIALFLAG_ALWAYSBLEND
  ) {
    // For ARGB16 (1-bit alpha) textures with ALWAYSBLEND, use MASK rather than BLEND.
    // ARGB16 stores binary alpha (1=opaque, 0=transparent), so MASK is more correct
    // and avoids the transparent render pass (which causes depth-sorting artefacts).
    gltfMaterial.setAlphaMode("MASK");
    gltfMaterial.setAlphaCutoff(0.5);
  } else if (bgMaterial.flags & BG3DMaterialFlags.BG3D_MATERIALFLAG_TEXTURED) {
    const hasAlphaTexture = bgMaterial.textures.some(
      (t) =>
        t.srcPixelFormat === PixelFormatSrc.GL_UNSIGNED_SHORT_1_5_5_5_REV ||
        t.srcPixelFormat === PixelFormatSrc.GL_RGBA,
    );
    if (hasAlphaTexture) {
      gltfMaterial.setAlphaMode("MASK");
      gltfMaterial.setAlphaCutoff(0.5);
    } else {
      gltfMaterial.setAlphaMode("OPAQUE");
    }
  }

  return gltfMaterial;
}

/**
 * Convert a single BG3D texture to PNG bytes
 *
 * Handles:
 * - JPEG textures with QuickTime ImageDescription format
 * - ARGB16 textures with byte swapping
 * - RGB8 and RGBA8 textures
 * - Per-pixel alpha channels for JPEG textures
 */
export function convertBG3DTextureToPng(texture: BG3DTexture): Uint8Array {
  return convertBG3DTextureToPngResult(texture).unwrapOr(texture.pixels);
}

export function convertBG3DTextureToPngResult(texture: BG3DTexture): Result<Uint8Array, string> {
  if (!Number.isInteger(texture.width) || !Number.isInteger(texture.height) || texture.width <= 0 || texture.height <= 0 || texture.width > 16384 || texture.height > 16384 || texture.bufferSize !== texture.pixels.byteLength) return err("Invalid BG3D texture dimensions or byte length");

  if (texture.isJpeg) {
    // JPEG texture (Nanosaur 2) - decompress from QuickTime format
    if (texture.pixels.byteLength < 4) return err("Truncated QuickTime JPEG texture header");
    const view = new DataView(texture.pixels.buffer, texture.pixels.byteOffset, texture.pixels.byteLength);
    const offset = view.getInt32(0, false); // big-endian
    if (offset < 4 || offset >= texture.pixels.byteLength) return err("Invalid QuickTime JPEG payload offset");
    const payloadSize = texture.bufferSize - offset;
    const payloadView = new Uint8Array(
      texture.pixels.buffer,
      texture.pixels.byteOffset + offset,
      payloadSize,
    );

    // Copy to new buffer for decodeJpegNode
    const payloadBuffer = new Uint8Array(payloadSize);
    payloadBuffer.set(payloadView);

    // Decompress JPEG
    const decoded = decodeJpegNodeResult(payloadBuffer.buffer);
    if (decoded.isErr()) return err(decoded.error);
    const imageData = decoded.value;
    if (imageData.width !== texture.width || imageData.height !== texture.height) return err("JPEG texture dimensions do not match the BG3D header");
    if (texture.jpegAlphaData && texture.jpegAlphaData.length !== imageData.width * imageData.height) return err("JPEG alpha channel length does not match texture dimensions");

    // Apply separate per-pixel alpha channel when present (Nanosaur 2 JPEG format).
    // Without this the alpha remains 255 (fully opaque) and transparent cutouts appear opaque.
    if (
      texture.jpegAlphaData &&
      texture.jpegAlphaData.length === imageData.width * imageData.height
    ) {
      for (let k = 0; k < texture.jpegAlphaData.length; k++) {
        imageData.data[k * 4 + 3] = texture.jpegAlphaData[k] ?? 255;
      }
    }

    // Convert to PNG
    return rgba8ToPngResult(
      new Uint8Array(imageData.data),
      imageData.width,
      imageData.height,
    );
  } else if (
    texture.srcPixelFormat === PixelFormatSrc.GL_UNSIGNED_SHORT_1_5_5_5_REV
  ) {
    // ARGB16 with byte swap
    if (texture.pixels.byteLength !== texture.width * texture.height * 2) return err("ARGB16 texture byte length does not match its dimensions");
    const pixelBytes = new Uint8Array(texture.pixels);
    const src = new Uint16Array(pixelBytes.buffer);
    // Byte swap each 16-bit value
    const swapped = new Uint16Array(src.length);
    for (let k = 0; k < src.length; k++) {
      const val = src[k];
      if (val !== undefined) {
        swapped[k] = ((val & 0xff) << 8) | ((val >> 8) & 0xff);
      }
    }
    return rgba8ToPngResult(argb16ToRgba8(swapped), texture.width, texture.height);
  } else if (texture.srcPixelFormat === PixelFormatSrc.GL_RGB) {
    // RGB8
    if (texture.pixels.byteLength !== texture.width * texture.height * 3) return err("RGB texture byte length does not match its dimensions");
    return rgba8ToPngResult(rgb24ToRgba8(texture.pixels), texture.width, texture.height);
  } else if (texture.srcPixelFormat === PixelFormatSrc.GL_RGBA) {
    // GL_RGBA (RGBA8)
    return rgba8ToPngResult(texture.pixels, texture.width, texture.height);
  } else {
    // Unknown/unsupported format, fallback to raw buffer
    return err(`Unsupported BG3D texture pixel format: ${texture.srcPixelFormat}`);
  }

}

/**
 * Process all materials and textures for a BG3D model
 *
 * Creates glTF materials with proper alpha modes and attaches
 * texture images as baseColorTextures.
 */
export function processBG3DMaterials(
  doc: Document,
  materials: BG3DMaterial[],
): Material[] {
  const gltfMaterials: Material[] = materials.map((mat, i) => {
    return convertBG3DMaterialToGltf(doc, mat, i);
  });

  // Process textures and attach to materials
  materials.forEach((mat, i) => {
    if (mat.textures && mat.textures.length > 0) {
      mat.textures.forEach((tex, j) => {
        const pngBuffer = convertBG3DTextureToPng(tex);

        const texture = doc.createTexture();
        texture.setMimeType("image/png");
        texture.setImage(pngBuffer);

        // Attach the first texture as baseColorTexture
        if (j === 0) {
          const gltfMat = gltfMaterials[i];
          if (gltfMat) {
            gltfMat.setBaseColorTexture(texture);
          }
        }
      });
    }
  });

  return gltfMaterials;
}
