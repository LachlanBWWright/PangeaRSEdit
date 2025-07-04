import {
  BG3DGeometryFull,
  BG3DGroup,
  BG3DMaterial,
  BG3DParseResult,
  BG3DTexture,
} from "./parseBG3D";
import { argb16ToPng, pngToArgb16 } from "./image/pngArgb";

import { Document, Mesh, Material, Texture } from "@gltf-transform/core";

/**
 * Convert a BG3DParseResult to a glTF Document, transferring all possible data.
 * Any data that cannot be mapped is stored in extras.
 * Data that cannot be transferred:
 *   - BG3DMaterial.flags (stored in extras)
 *   - BG3DTexture pixel format fields (stored in extras, pixel data may need conversion)
 *   - Geometry.layerMaterialNum (stored in extras)
 *   - Geometry.boundingBox (stored in extras)
 */
export function bg3dParsedToGLTF(parsed: BG3DParseResult): Document {
  const doc = new Document();

  // 1. Materials
  const gltfMaterials: Material[] = parsed.materials.map((mat) => {
    const m = doc.createMaterial("BG3DMaterial");
    m.setBaseColorFactor(mat.diffuseColor);
    // Store all BG3DMaterial fields in extras
    m.setExtras({
      flags: mat.flags,
      // Store all textures in extras for round-trip
      textures: mat.textures?.map((tex) => ({
        width: tex.width,
        height: tex.height,
        srcPixelFormat: tex.srcPixelFormat,
        dstPixelFormat: tex.dstPixelFormat,
        bufferSize: tex.bufferSize,
        // Store pixel data as base64 for round-trip
        pixels: Buffer.from(tex.pixels).toString("base64"),
      })),
    });
    return m;
  });

  // 2. Textures/Images (if any)
  // Attach the first texture as baseColorTexture for compatibility
  const gltfTextures: Texture[] = [];
  parsed.materials.forEach((mat, i) => {
    if (mat.textures && mat.textures.length > 0) {
      const tex = mat.textures[0];
      let pngBuffer: Buffer;
      try {
        pngBuffer = argb16ToPng(
          new Uint16Array(
            tex.pixels.buffer,
            tex.pixels.byteOffset,
            tex.pixels.byteLength / 2,
          ),
          tex.width,
          tex.height,
        );
      } catch (e) {
        pngBuffer = Buffer.from(tex.pixels);
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
      gltfMaterials[i].setBaseColorTexture(texture);
      gltfTextures.push(texture);
    }
  });

  // 3. Meshes and Primitives
  const gltfMeshes: Mesh[] = [];
  parsed.geometries.forEach((geom) => {
    const mesh = doc.createMesh();
    const prim = doc.createPrimitive();
    // POSITION
    if (geom.points) {
      prim.setAttribute(
        "POSITION",
        doc
          .createAccessor()
          .setType("VEC3")
          .setArray(new Float32Array(geom.points.flat())),
      );
    }
    // NORMAL
    if (geom.normals) {
      prim.setAttribute(
        "NORMAL",
        doc
          .createAccessor()
          .setType("VEC3")
          .setArray(new Float32Array(geom.normals.flat())),
      );
    }
    // TEXCOORD_0
    if (geom.uvs) {
      prim.setAttribute(
        "TEXCOORD_0",
        doc
          .createAccessor()
          .setType("VEC2")
          .setArray(new Float32Array(geom.uvs.flat())),
      );
    }
    // COLOR_0
    if (geom.colors) {
      prim.setAttribute(
        "COLOR_0",
        doc
          .createAccessor()
          .setType("VEC4")
          .setArray(new Uint8Array(geom.colors.flat())),
      );
    }
    // Indices
    if (geom.triangles) {
      prim.setIndices(
        doc
          .createAccessor()
          .setType("SCALAR")
          .setArray(new Uint32Array(geom.triangles.flat())),
      );
    }
    // Material
    // Store per-primitive material index in extras
    let materialIndex = 0;
    if (
      Array.isArray(geom.layerMaterialNum) &&
      geom.layerMaterialNum.length > 0
    ) {
      materialIndex = geom.layerMaterialNum[0];
    }
    if (gltfMaterials[materialIndex]) {
      prim.setMaterial(gltfMaterials[materialIndex]);
    }
    // Extras for unmappable fields and BG3D-specific fields
    prim.setExtras({
      layerMaterialNum: geom.layerMaterialNum,
      flags: geom.flags,
      boundingBox: geom.boundingBox,
      type: geom.type,
      numMaterials: geom.numMaterials,
      numPoints: geom.numPoints,
      numTriangles: geom.numTriangles,
      materialIndex,
    });
    mesh.addPrimitive(prim);
    gltfMeshes.push(mesh);
  });

  // 4. Nodes and Hierarchy (Groups)
  // For simplicity, put all meshes as root nodes; group hierarchy can be added if needed
  gltfMeshes.forEach((mesh) => {
    doc.createNode().setMesh(mesh);
  });

  // 5. Store any unmappable data in extras at the root
  doc.getRoot().setExtras({
    groups: parsed.groups,
    // Store BG3DParseResult-level fields for round-trip
    bg3dFields: {
      numMaterials: parsed.geometries?.[0]?.numMaterials,
      type: parsed.geometries?.[0]?.type,
    },
  });

  return doc;
}

export function gltfToBG3D(doc: Document): BG3DParseResult {
  // 1. Materials (restore all fields and all textures from extras)
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

      // Restore all textures from extras if present, otherwise fallback to baseColorTexture
      let textures: BG3DTexture[] = [];
      if (Array.isArray(extras.textures)) {
        // Textures were stored in extras as an array of objects
        textures = extras.textures.map((t: any) => {
          let pixels: Uint8Array = new Uint8Array();
          let width = 0;
          let height = 0;
          let srcPixelFormat = 0;
          let dstPixelFormat = 0;
          let bufferSize = 0;
          if (t && typeof t === "object") {
            if (typeof t.pixels === "string") {
              // base64 encoded
              pixels = Uint8Array.from(atob(t.pixels), (c) => c.charCodeAt(0));
            } else if (t.pixels instanceof Uint8Array) {
              pixels = t.pixels;
            }
            width = typeof t.width === "number" ? t.width : 0;
            height = typeof t.height === "number" ? t.height : 0;
            srcPixelFormat =
              typeof t.srcPixelFormat === "number" ? t.srcPixelFormat : 0;
            dstPixelFormat =
              typeof t.dstPixelFormat === "number" ? t.dstPixelFormat : 0;
            bufferSize =
              typeof t.bufferSize === "number"
                ? t.bufferSize
                : pixels.byteLength;
          }
          return {
            pixels,
            width,
            height,
            srcPixelFormat,
            dstPixelFormat,
            bufferSize,
          };
        });
      } else {
        // Fallback: try to restore from baseColorTexture
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
      }
      return {
        diffuseColor,
        flags,
        textures,
      };
    });

  // 3. Geometries (restore all BG3D-specific fields from extras)
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
        // Restore type, numMaterials, numPoints, numTriangles from extras if present
        const type = typeof extras.type === "number" ? extras.type : 0;
        const numMaterials =
          typeof extras.numMaterials === "number" ? extras.numMaterials : 1;
        const numPoints =
          typeof extras.numPoints === "number"
            ? extras.numPoints
            : points?.length ?? 0;
        const numTriangles =
          typeof extras.numTriangles === "number"
            ? extras.numTriangles
            : triangles?.length ?? 0;
        geometries.push({
          points,
          normals,
          uvs,
          colors,
          triangles,
          layerMaterialNum,
          flags,
          boundingBox,
          numMaterials,
          type,
          numPoints,
          numTriangles,
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
