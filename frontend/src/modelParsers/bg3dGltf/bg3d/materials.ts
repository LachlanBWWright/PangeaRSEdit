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
        let pngBuffer: Uint8Array;
        try {
          if (
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
        } catch {
          pngBuffer = tex.pixels;
        }

        const texture = doc.createTexture();
        texture.setMimeType("image/png");
        texture.setImage(pngBuffer);
        texture.setExtras({
          width: tex.width,
          height: tex.height,
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
