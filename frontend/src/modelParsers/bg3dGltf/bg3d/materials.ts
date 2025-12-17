/**
 * Material conversion functions for BG3D ↔ glTF
 */

import {
  BG3DMaterial,
  BG3DTexture,
  PixelFormatSrc,
  PixelFormatDst,
} from "../../parseBG3D";

import {
  argb16ToPng,
  rgb24ToPng,
  rgba8ToPng,
  pngToRgba8,
} from "../../image/pngArgb";

import { Material, Document } from "@gltf-transform/core";
import { decodeJpegNode } from "../../../utils/jpegDecompress";

/**
 * Convert BG3D materials to glTF materials
 */
export function bg3dMaterialsToGltf(
  parsedMaterials: BG3DMaterial[],
  doc: Document,
): Material[] {
  const gltfMaterials: Material[] = parsedMaterials.map((mat, i) => {
    const m = doc.createMaterial("BG3DMaterial");
    m.setName(`Material_${i.toString().padStart(4, "0")}`);
    m.setBaseColorFactor(mat.diffuseColor);
    m.setExtras({
      flags: mat.flags,
    });
    return m;
  });

  return gltfMaterials;
}

/**
 * Convert BG3D textures to glTF textures and attach to materials
 */
export function bg3dTexturesToGltf(
  parsedMaterials: BG3DMaterial[],
  gltfMaterials: Material[],
  doc: Document,
): void {
  parsedMaterials.forEach((mat, i) => {
    if (mat.textures && mat.textures.length > 0) {
      mat.textures.forEach((tex, j) => {
        let pngBuffer: Uint8Array | Buffer;
        let actualWidth = tex.width;
        let actualHeight = tex.height;

        try {
          // Handle JPEG textures (Nanosaur 2)
          if ((tex as any).isJpeg) {
            const jpegTex = tex as any;
            console.log(`[Material ${i}] Processing JPEG texture, bufferSize: ${jpegTex.bufferSize}, expected dimensions: ${jpegTex.width}x${jpegTex.height}`);

            // Extract payload from QuickTime ImageDescription format
            const view = new DataView(jpegTex.pixels.buffer, jpegTex.pixels.byteOffset);
            const offset = view.getInt32(0, false); // big-endian
            const payloadSize = jpegTex.bufferSize - offset;
            const payloadView = new Uint8Array(jpegTex.pixels.buffer, jpegTex.pixels.byteOffset + offset, payloadSize);

            console.log(`[Material ${i}] Offset: ${offset}, Payload size: ${payloadSize}`);

            // Copy to new buffer for decodeJpegNode
            const payloadBuffer = new Uint8Array(payloadSize);
            payloadBuffer.set(payloadView);

            // Decompress JPEG
            const imageData = decodeJpegNode(payloadBuffer.buffer);
            console.log(`[Material ${i}] Decompressed JPEG: ${imageData.width}x${imageData.height}, data length: ${imageData.data.length}`);
            console.log(`[Material ${i}] BG3D texture metadata: ${jpegTex.width}x${jpegTex.height}`);

            // Use decompressed dimensions (JPEG may differ from metadata)
            actualWidth = imageData.width;
            actualHeight = imageData.height;
            console.log(`[Material ${i}] Using decompressed dimensions: ${actualWidth}x${actualHeight}`);

            // Convert to PNG
            pngBuffer = rgba8ToPng(new Uint8Array(imageData.data), actualWidth, actualHeight);
            console.log(`[Material ${i}] PNG buffer created, size: ${pngBuffer.length}`);
          } else if (
            tex.srcPixelFormat === PixelFormatSrc.GL_UNSIGNED_SHORT_1_5_5_5_REV
          ) {
            // ARGB16 with byte swap
            const src = new Uint16Array(
              tex.pixels.buffer,
              tex.pixels.byteOffset,
              tex.pixels.byteLength / 2,
            );
            const swapped = new Uint16Array(src.length);
            for (let k = 0; k < src.length; k++) {
              const val = src[k] ?? 0;
              swapped[k] = ((val & 0xff) << 8) | ((val >> 8) & 0xff);
            }
            pngBuffer = argb16ToPng(swapped, tex.width, tex.height);
          } else if (tex.srcPixelFormat === PixelFormatSrc.GL_RGB) {
            pngBuffer = rgb24ToPng(tex.pixels, tex.width, tex.height);
          } else if (tex.srcPixelFormat === PixelFormatSrc.GL_RGBA) {
            pngBuffer = rgba8ToPng(tex.pixels, tex.width, tex.height);
          } else {
            pngBuffer = tex.pixels;
          }
        } catch (error) {
          console.error(`Failed to convert texture for material ${i}:`, error);
          // Fallback: convert raw pixels to RGBA and then to PNG
          try {
            const fallbackRgba = new Uint8Array(tex.width * tex.height * 4);
            // Fill with gray color as placeholder
            for (let i = 0; i < fallbackRgba.length; i += 4) {
              fallbackRgba[i] = 128;      // R
              fallbackRgba[i + 1] = 128;  // G
              fallbackRgba[i + 2] = 128;  // B
              fallbackRgba[i + 3] = 255;  // A
            }
            pngBuffer = rgba8ToPng(fallbackRgba, tex.width, tex.height);
          } catch (fallbackError) {
            console.error(`Fallback also failed for material ${i}:`, fallbackError);
            // Last resort: use original pixels
            pngBuffer = tex.pixels;
          }
        }

        const texture = doc.createTexture();
        texture.setMimeType("image/png");

        // Verify PNG header
        const isPngValid = pngBuffer.length >= 8 &&
          pngBuffer[0] === 0x89 &&
          pngBuffer[1] === 0x50 &&
          pngBuffer[2] === 0x4e &&
          pngBuffer[3] === 0x47;

        console.log(`[Material ${i}] Texture ${j}: Setting PNG with length ${pngBuffer.length}, valid: ${isPngValid}, dimensions: ${actualWidth}x${actualHeight}`);
        console.log(`[Material ${i}] Texture ${j}: First 8 bytes: ${Array.from(pngBuffer.slice(0, 8)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);

        // gltf-transform expects a Buffer or Uint8Array
        // pngBuffer from rgba8ToPng is already a Buffer, so use it directly
        texture.setImage(pngBuffer);
        texture.setExtras({
          width: actualWidth,
          height: actualHeight,
          srcPixelFormat: tex.srcPixelFormat,
          dstPixelFormat: tex.dstPixelFormat,
          bufferSize: tex.bufferSize,
        });

        // Attach the first texture as baseColorTexture
        if (j === 0) {
          const gltfMaterial = gltfMaterials[i];
          if (gltfMaterial) {
            gltfMaterial.setBaseColorTexture(texture);
          }
        }
      });
    }
  });
}

/**
 * Convert glTF materials back to BG3D materials
 */
export async function gltfMaterialsToBg3d(
  docMaterials: Material[],
  materialExtras: Array<Record<string, unknown>>,
): Promise<BG3DMaterial[]> {
  const materials: BG3DMaterial[] = await Promise.all(
    docMaterials.map(async (mat, index) => {
      let diffuseColor: [number, number, number, number] = [1, 1, 1, 1];
      const baseColor = mat.getBaseColorFactor();
      if (Array.isArray(baseColor) && baseColor.length === 4) {
        diffuseColor = [baseColor[0], baseColor[1], baseColor[2], baseColor[3]];
      }

      // Get BG3D-specific flags from extras
      const flags = (materialExtras[index]?.flags as number) || 0;

      // Restore textures from baseColorTexture
      const textures: BG3DTexture[] = [];
      const baseColorTex = mat.getBaseColorTexture();
      if (baseColorTex) {
        const image = baseColorTex.getImage();
        if (image instanceof Uint8Array) {
          // Verify this is valid PNG data by checking PNG signature
          const isPNG =
            image.length >= 8 &&
            image[0] === 0x89 &&
            image[1] === 0x50 &&
            image[2] === 0x4e &&
            image[3] === 0x47 &&
            image[4] === 0x0d &&
            image[5] === 0x0a &&
            image[6] === 0x1a &&
            image[7] === 0x0a;

          if (isPNG) {
            // BG3D textures are typically RGB format (no alpha channel)
            // Even if PNG is stored as RGBA in glTF (due to pngjs library limitations),
            // we convert back to RGB to match original format and prevent file size inflation
            const rgbaRes = await pngToRgba8(Buffer.from(image));
            const rgb = new Uint8Array((rgbaRes.data.length / 4) * 3);
            for (let i = 0, j = 0; i < rgbaRes.data.length; i += 4, j += 3) {
              rgb[j + 0] = rgbaRes.data[i + 0] ?? 0;
              rgb[j + 1] = rgbaRes.data[i + 1] ?? 0;
              rgb[j + 2] = rgbaRes.data[i + 2] ?? 0;
            }
            const pngRes = {
              data: rgb,
              width: rgbaRes.width,
              height: rgbaRes.height,
            };

            const materialExtra = (materialExtras as Array<Record<string, unknown>>)[index]!;
            const textureExtra = (materialExtra?.textureExtras as unknown[] | undefined)?.[0];
            textures.push({
              pixels: pngRes.data,
              width: pngRes.width,
              height: pngRes.height,
              srcPixelFormat: PixelFormatSrc.GL_RGB, // BG3D default format
              dstPixelFormat:
                ((textureExtra as Record<string, unknown> | undefined)?.dstPixelFormat as number | undefined) ||
                PixelFormatDst.GL_UNSIGNED_SHORT_5_5_5_1,
              bufferSize: pngRes.data.byteLength, // Use actual converted data size
            });
          } else {
            console.warn(
              "Image data from glTF is not valid PNG, skipping texture for material",
              index,
            );
          }
        }
      }

      return {
        diffuseColor,
        flags,
        textures,
      };
    }),
  );

  return materials;
}
