import { Document } from "@gltf-transform/core";
import {
  BG3DParseResult,
  BG3DMaterial,
  BG3DTexture,
  BG3DGeometryFull,
  BG3DGroup,
} from "./parseBG3D";
import { pngToArgb16 } from "./image/pngArgb";

/**
 * Convert a glTF Document (from @gltf-transform/core) to a BG3DParseResult.
 * Transfers all possible data. Any data that cannot be mapped is extracted from extras if present.
 * Data that cannot be transferred:
 *   - BG3D group hierarchy (unless present in extras)
 *   - Multiple textures per material (glTF only supports one baseColorTexture per material)
 *   - BG3DTexture pixel format fields (unless present in extras)
 *   - Geometry.layerMaterialNum and boundingBox (unless present in extras)
 */
export function gltfToBG3D(doc: Document): BG3DParseResult {
  // 1. Materials
  const materials: BG3DMaterial[] = doc
    .getRoot()
    .listMaterials()
    .map((mat) => {
      const extras = mat.getExtras() ?? {};
      let diffuseColor: [number, number, number, number] = [1, 1, 1, 1];
      const baseColor = mat.getBaseColorFactor();
      if (
        Array.isArray(baseColor) &&
        baseColor.length === 4 &&
        baseColor.every((v) => typeof v === "number")
      ) {
        diffuseColor = [baseColor[0], baseColor[1], baseColor[2], baseColor[3]];
      }
      const flags = typeof extras["flags"] === "number" ? extras["flags"] : 0;
      // 2. Textures
      const textures: BG3DTexture[] = [];
      const baseColorTex = mat.getBaseColorTexture();
      if (baseColorTex) {
        const image = baseColorTex.getImage();
        let texExtras: Record<string, unknown> = {};
        let pixels: Uint8Array = new Uint8Array();
        let width = 0;
        let height = 0;
        let srcPixelFormat: unknown = null;
        let dstPixelFormat: unknown = null;
        let bufferSize = 0;
        if (
          image !== null &&
          typeof image === "object" &&
          "getExtras" in image &&
          typeof image["getExtras"] === "function"
        ) {
          // getExtras is present
          const extrasValue = (image["getExtras"] as () => unknown)();
          if (typeof extrasValue === "object" && extrasValue !== null) {
            texExtras = extrasValue as Record<string, unknown>;
          }
          // If the image is a PNG buffer, decode it to ARGB1555
          let pngBuffer: Uint8Array | undefined = undefined;
          if ("buffer" in image && image["buffer"] instanceof Uint8Array) {
            pngBuffer = image["buffer"];
          } else if (image instanceof Uint8Array) {
            pngBuffer = image;
          }
          if (pngBuffer) {
            const pngResult = pngToArgb16(Buffer.from(pngBuffer));
            if (
              pngResult &&
              typeof pngResult === "object" &&
              "data" in pngResult &&
              "width" in pngResult &&
              "height" in pngResult &&
              pngResult.data instanceof Uint16Array &&
              typeof pngResult.width === "number" &&
              typeof pngResult.height === "number"
            ) {
              pixels = new Uint8Array(pngResult.data.buffer);
              width = pngResult.width;
              height = pngResult.height;
              srcPixelFormat =
                typeof texExtras["srcPixelFormat"] === "number"
                  ? texExtras["srcPixelFormat"]
                  : null;
              dstPixelFormat =
                typeof texExtras["dstPixelFormat"] === "number"
                  ? texExtras["dstPixelFormat"]
                  : null;
              bufferSize = pixels.byteLength;
            }
          } else if (
            "getBuffer" in image &&
            typeof image["getBuffer"] === "function"
          ) {
            const bufResult = image["getBuffer"]();
            if (bufResult instanceof Uint8Array) {
              pixels = bufResult;
            }
            width =
              typeof texExtras["width"] === "number"
                ? (texExtras["width"] as number)
                : 0;
            height =
              typeof texExtras["height"] === "number"
                ? (texExtras["height"] as number)
                : 0;
            srcPixelFormat =
              typeof texExtras["srcPixelFormat"] === "number"
                ? texExtras["srcPixelFormat"]
                : null;
            dstPixelFormat =
              typeof texExtras["dstPixelFormat"] === "number"
                ? texExtras["dstPixelFormat"]
                : null;
            bufferSize =
              typeof texExtras["bufferSize"] === "number"
                ? (texExtras["bufferSize"] as number)
                : pixels.byteLength;
          }
        }
        textures.push({
          pixels,
          width,
          height,
          srcPixelFormat:
            typeof srcPixelFormat === "number" ? srcPixelFormat : 0,
          dstPixelFormat:
            typeof dstPixelFormat === "number" ? dstPixelFormat : 0,
          bufferSize,
        });
      }
      return {
        diffuseColor,
        flags,
        textures,
      };
    });

  // 3. Geometries
  const geometries: BG3DGeometryFull[] = [];
  doc
    .getRoot()
    .listMeshes()
    .forEach((mesh) => {
      mesh.listPrimitives().forEach((prim) => {
        const extras = prim.getExtras() || {};
        // POSITION
        const posAcc = prim.getAttribute("POSITION");
        let points: [number, number, number][] | undefined = undefined;
        if (posAcc) {
          const arr = Array.from(posAcc.getArray() as Float32Array);
          points = [];
          for (let i = 0; i < arr.length; i += 3) {
            if (i + 2 < arr.length)
              points.push([arr[i], arr[i + 1], arr[i + 2]]);
          }
        }
        // NORMAL
        const normAcc = prim.getAttribute("NORMAL");
        let normals: [number, number, number][] | undefined = undefined;
        if (normAcc) {
          const arr = Array.from(normAcc.getArray() as Float32Array);
          normals = [];
          for (let i = 0; i < arr.length; i += 3) {
            if (i + 2 < arr.length)
              normals.push([arr[i], arr[i + 1], arr[i + 2]]);
          }
        }
        // UV
        const uvAcc = prim.getAttribute("TEXCOORD_0");
        let uvs: [number, number][] | undefined = undefined;
        if (uvAcc) {
          const arr = Array.from(uvAcc.getArray() as Float32Array);
          uvs = [];
          for (let i = 0; i < arr.length; i += 2) {
            if (i + 1 < arr.length) uvs.push([arr[i], arr[i + 1]]);
          }
        }
        // COLOR
        const colorAcc = prim.getAttribute("COLOR_0");
        let colors: [number, number, number, number][] | undefined = undefined;
        if (colorAcc) {
          const arr = Array.from(colorAcc.getArray() as Uint8Array);
          colors = [];
          for (let i = 0; i < arr.length; i += 4) {
            if (i + 3 < arr.length)
              colors.push([arr[i], arr[i + 1], arr[i + 2], arr[i + 3]]);
          }
        }
        // TRIANGLES
        const idxAcc = prim.getIndices();
        let triangles: [number, number, number][] | undefined = undefined;
        if (idxAcc) {
          const arr = Array.from(idxAcc.getArray() as Uint32Array);
          triangles = [];
          for (let i = 0; i < arr.length; i += 3) {
            if (i + 2 < arr.length)
              triangles.push([arr[i], arr[i + 1], arr[i + 2]]);
          }
        }
        // Unmappable fields from extras
        let layerMaterialNum: number[] = [0, 0, 0, 0];
        if (
          Array.isArray(extras.layerMaterialNum) &&
          extras.layerMaterialNum.length === 4
        ) {
          layerMaterialNum = extras.layerMaterialNum;
        }
        const flags = typeof extras.flags === "number" ? extras.flags : 0;
        let boundingBox:
          | { min: [number, number, number]; max: [number, number, number] }
          | undefined = undefined;
        if (
          extras.boundingBox &&
          typeof extras.boundingBox === "object" &&
          Array.isArray((extras.boundingBox as any).min) &&
          Array.isArray((extras.boundingBox as any).max) &&
          (extras.boundingBox as any).min.length === 3 &&
          (extras.boundingBox as any).max.length === 3
        ) {
          boundingBox = {
            min: (extras.boundingBox as any).min,
            max: (extras.boundingBox as any).max,
          };
        }
        geometries.push({
          points,
          normals,
          uvs,
          colors,
          triangles,
          layerMaterialNum,
          flags,
          boundingBox,
          numMaterials: 1, // Not always available
          type: 0, // Not always available
          numPoints: points?.length ?? 0,
          numTriangles: triangles?.length ?? 0,
        });
      });
    });

  // 4. Groups (from extras if present)
  let groups: BG3DGroup[] = [];
  const rootExtras = doc.getRoot().getExtras() || {};
  if (Array.isArray(rootExtras.groups)) {
    groups = rootExtras.groups;
  }

  return {
    materials,
    geometries,
    groups,
  };
}
