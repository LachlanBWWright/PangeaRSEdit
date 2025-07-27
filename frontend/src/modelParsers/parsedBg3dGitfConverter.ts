// Browser-safe base64 encoding for Uint8Array
function uint8ToBase64(u8: Uint8Array): string {
  const CHUNK_SIZE = 0x8000;
  let result = "";
  for (let i = 0; i < u8.length; i += CHUNK_SIZE) {
    result += String.fromCharCode.apply(
      null,
      u8.subarray(i, i + CHUNK_SIZE) as any,
    );
  }
  return btoa(result);
}
import {
  BG3DGeometry,
  BG3DGroup,
  BG3DMaterial,
  BG3DParseResult,
  BG3DTexture,
} from "./parseBG3D";

import {
  argb16ToPng,
  rgb24ToPng,
  rgba8ToPng,
  pngToArgb16,
  pngToRgb8,
  pngToRgba8,
} from "./image/pngArgb";

import { Document, Mesh, Material, Texture, Node } from "@gltf-transform/core";
import { PixelFormatSrc, PixelFormatDst } from "./parseBG3D";

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
  console.log("Creating new glTF Document");
  doc.createBuffer("Basebuffer");
  console.log("Created base buffer for glTF Document");

  // 1. Materials
  const gltfMaterials: Material[] = parsed.materials.map((mat, i) => {
    const m = doc.createMaterial("BG3DMaterial");
    m.setName(`Material_${i.toString().padStart(4, "0")}`);
    m.setBaseColorFactor(mat.diffuseColor);
    // Only store BG3DMaterial.flags in extras (no texture data)
    m.setExtras({
      flags: mat.flags,
    });

    return m;
  });

  console.log("Stage 2");
  // 2. Textures/Images (attach ALL textures as glTF images, not just the first)
  parsed.materials.forEach((mat, i) => {
    if (mat.textures && mat.textures.length > 0) {
      mat.textures.forEach((tex, j) => {
        let pngBuffer: Uint8Array<ArrayBufferLike>;
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
            // Byte swap each 16-bit value
            const swapped = new Uint16Array(src.length);
            for (let k = 0; k < src.length; k++) {
              const val = src[k];
              swapped[k] = ((val & 0xff) << 8) | ((val >> 8) & 0xff);
            }
            pngBuffer = argb16ToPng(swapped, tex.width, tex.height);
          } else if (tex.srcPixelFormat === PixelFormatSrc.GL_RGB) {
            // RGB8
            pngBuffer = rgb24ToPng(tex.pixels, tex.width, tex.height);
          } else if (tex.srcPixelFormat === PixelFormatSrc.GL_RGBA) {
            // GL_RGBA (RGBA8)
            pngBuffer = rgba8ToPng(tex.pixels, tex.width, tex.height);
          } else {
            // Unknown/unsupported format, fallback to raw buffer
            pngBuffer = tex.pixels;
          }
        } catch (e) {
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
        // Attach the first texture as baseColorTexture for compatibility
        if (j === 0) {
          gltfMaterials[i].setBaseColorTexture(texture);
        }
      });
    }
  });

  console.log("Stage 3");

  // Helper to collect all geometries from group hierarchy (using .children)
  function collectGeometries(groups: BG3DGroup[]): BG3DGeometry[] {
    const result: BG3DGeometry[] = [];
    function traverse(group: BG3DGroup) {
      if (Array.isArray(group.children)) {
        for (const child of group.children) {
          if (Array.isArray((child as any).children)) {
            // It's a BG3DGroup
            traverse(child as BG3DGroup);
          } else {
            // It's a BG3DGeometry
            result.push(child as BG3DGeometry);
          }
        }
      }
    }
    for (const group of groups) {
      traverse(group);
    }
    return result;
  }

  const allGeometries = collectGeometries(parsed.groups);

  console.log("Stage 4");

  // 3. Meshes and Primitives
  const gltfMeshes: Mesh[] = [];
  allGeometries.forEach((geom) => {
    const mesh = doc.createMesh();

    mesh.setName(`Item_${gltfMeshes.length.toString().padStart(4, "0")}`);

    // Create accessors as consts using ternary expressions, then use if checks for prim.setAttribute/setIndices
    const positionAccessor = geom.vertices
      ? doc
          .createAccessor()
          .setType("VEC3")
          .setArray(new Float32Array(geom.vertices.flat()))
      : null;
    const normalAccessor = geom.normals
      ? doc
          .createAccessor()
          .setType("VEC3")
          .setArray(new Float32Array(geom.normals.flat()))
      : null;
    const texcoordAccessor = geom.uvs
      ? doc
          .createAccessor()
          .setType("VEC2")
          .setArray(new Float32Array(geom.uvs.flat()))
      : null;
    const colorAccessor = geom.colors
      ? doc
          .createAccessor()
          .setType("VEC4")
          .setArray(new Uint8Array(geom.colors.flat()))
      : null;
    const indexAccessor = geom.triangles
      ? doc
          .createAccessor()
          .setType("SCALAR")
          .setArray(new Uint32Array(geom.triangles.flat()))
      : null;

    for (let i = 0; i < geom.numMaterials; i++) {
      const prim = doc.createPrimitive();

      if (positionAccessor) {
        prim.setAttribute("POSITION", positionAccessor);
      }
      if (normalAccessor) {
        prim.setAttribute("NORMAL", normalAccessor);
      }
      if (texcoordAccessor) {
        prim.setAttribute("TEXCOORD_0", texcoordAccessor);
      }
      if (colorAccessor) {
        prim.setAttribute("COLOR_0", colorAccessor);
      }
      if (indexAccessor) {
        prim.setIndices(indexAccessor);
      }
      // Material
      // Store per-primitive material index in extras

      if (gltfMaterials[geom.layerMaterialNum[i]]) {
        prim.setMaterial(gltfMaterials[geom.layerMaterialNum[i]]);
      }
      // Extras for unmappable fields and BG3D-specific fields
      prim.setExtras({
        flags: geom.flags,
        boundingBox: geom.boundingBox,
        type: geom.type,
      });
      mesh.addPrimitive(prim);
    }

    gltfMeshes.push(mesh);
  });

  console.log("Stage 5");

  // 4. Nodes and Hierarchy (Groups)
  // Encode BG3D group hierarchy as glTF nodes
  function createNodeForGroup(group: BG3DGroup, idx: number) {
    const node = doc.createNode();
    node.setName("item_" + idx.toString().padStart(4, "0"));
    idx++;
    // Attach meshes for all geometries in this group
    for (const child of group.children) {
      if (Array.isArray((child as any).children)) {
        // It's a BG3DGroup
        const childNode = createNodeForGroup(child as BG3DGroup, idx);
        node.addChild(childNode.node);
        idx = childNode.idx;
      } else {
        // It's a BG3DGeometry
        const geomIndex = allGeometries.indexOf(child as BG3DGeometry);
        if (geomIndex >= 0 && gltfMeshes[geomIndex]) {
          node.addChild(
            doc
              .createNode()
              .setMesh(gltfMeshes[geomIndex])
              .setName("item_" + idx.toString().padStart(4, "0")),
          );
        }
      }
    }
    return { node, idx };
  }
  // Add all top-level groups as root nodes
  // Add all top-level groups as root nodes (using setChildren for glTF-Transform)
  const rootNodes: Node[] = []; //parsed.groups.map((group) => createNodeForGroup(group, 0));
  let idx = 0;
  for (const group of parsed.groups) {
    const { node, idx: newIdx } = createNodeForGroup(group, idx);
    rootNodes.push(node);
    idx = newIdx;
  }
  const scene = doc.createScene("Scene");
  for (const node of rootNodes) {
    doc.getRoot().listNodes().push(node);
    scene.addChild(node);
  }

  // 5. Store any unmappable data in extras at the root (for legacy round-trip)
  doc.getRoot().setExtras({
    groups: parsed.groups,
    // Store BG3DParseResult-level fields for round-trip
    bg3dFields: {
      // No flat geometries array anymore; if needed, can extract from groups
    },
  });

  console.log("Finalizing glTF Document");

  return doc;
}

export async function gltfToBG3D(doc: Document): Promise<BG3DParseResult> {
  console.log("gltfToBG3D: Restoring materials...");
  const docMaterials = doc.getRoot().listMaterials();
  const materials: BG3DMaterial[] = await Promise.all(
    docMaterials.map(async (mat, i) => {
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

      console.log(
        `Material[${i}]: diffuseColor=`,
        diffuseColor,
        "flags=",
        flags,
      );

      // Only restore textures from baseColorTexture (do not parse from extras)
      let textures: BG3DTexture[] = [];

      const baseColorTex = mat.getBaseColorTexture();
      if (baseColorTex) {
        const image = baseColorTex.getImage();

        const size = baseColorTex.getSize();
        console.log("TEX SIZE", size);
        if (image instanceof Uint8Array) {
          console.log(
            `Material[${i}]: Restoring texture from baseColorTexture, byteLength=`,
            image.byteLength,
          );

          const pngRes = await pngToRgba8(image.buffer as ArrayBuffer);

          textures.push({
            pixels: pngRes.data,
            width: pngRes.width,
            height: pngRes.height,
            srcPixelFormat: PixelFormatSrc.GL_RGBA,
            dstPixelFormat: PixelFormatDst.GL_UNSIGNED_SHORT_5_5_5_1,
            bufferSize: pngRes.data.byteLength,
          });
        } else {
          console.log(
            `Material[${i}]: baseColorTexture image is not Uint8Array, got:`,
            typeof image,
          );
        }
      } else {
        console.log(`Material[${i}]: No baseColorTexture found.`);
      }
      return {
        diffuseColor,
        flags,
        textures,
      };
    }),
  );

  console.log("gltfToBG3D: Restoring geometries...");
  //TODO: Needs Fixing
  //TODO: Not scanning nodes?
  //TODO: Double roundtrip ruins texture data
  //doc.getGraph().listEdges()[0].getChild()

  // Processes a glTF Node, extracts mesh/geometry data, and returns BG3DGeometry[]
  // Processes a glTF Node, extracts mesh/geometry data, and returns BG3DGroup
  function processNode(node: Node): BG3DGroup | BG3DGeometry {
    const children: (BG3DGroup | BG3DGeometry)[] = [];
    const mesh = node.getMesh();
    if (mesh) {
      // Use processMesh to extract geometry from mesh
      return processMesh(mesh, 0);
    }
    // Recursively process child nodes
    const nodeChildren = node.listChildren();
    for (const childNode of nodeChildren) {
      children.push(processNode(childNode));
    }
    return { children };
  }

  function processMesh(mesh: Mesh, meshIdx: number) {
    console.log(`Parsing mesh ${mesh.getName()}`);
    const primitives = mesh.listPrimitives();
    const prim = primitives[0]; // Assuming single primitive per mesh
    const extras = prim.getExtras() || {};
    // POSITION

    const posAcc = prim.getAttribute("POSITION");
    let vertices: [number, number, number][] | undefined = undefined;
    if (posAcc) {
      const arr = Array.from(posAcc.getArray() as Float32Array);
      vertices = [];
      for (let i = 0; i < arr.length; i += 3) {
        if (i + 2 < arr.length) vertices.push([arr[i], arr[i + 1], arr[i + 2]]);
      }
    }
    const numPoints = vertices ? vertices.length : 0;
    // NORMAL
    const normAcc = prim.getAttribute("NORMAL");
    let normals: [number, number, number][] | undefined = undefined;
    if (normAcc) {
      const arr = Array.from(normAcc.getArray() as Float32Array);
      normals = [];
      for (let i = 0; i < arr.length; i += 3) {
        if (i + 2 < arr.length) normals.push([arr[i], arr[i + 1], arr[i + 2]]);
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
    const numTriangles = triangles ? triangles.length : 0;

    // Unmappable fields from extras

    let layerMaterialNum: number[] = [0, 0, 0, 0];

    let numMaterials = 0;
    for (let i = 0; i < 4 && i < primitives.length; i++) {
      //Find index of corresponding material in docmaterials

      let found = false;
      for (let j = 0; j < docMaterials.length; j++) {
        if (docMaterials[j] === primitives[i].getMaterial()) {
          layerMaterialNum[i] = j;
          numMaterials++;
          found = true;

          break;
        }
      }
      if (!found) {
        console.warn(
          `Geometry mesh[${meshIdx}] prim[${i}]: No matching material found for primitive`,
        );
      }
    }

    /*     if (
      Array.isArray(extras.layerMaterialNum) &&
      extras.layerMaterialNum.length === 4
    ) {
      layerMaterialNum = extras.layerMaterialNum;
    } */
    console.log("Layer Material Num:", layerMaterialNum);
    console.log("numMaterials:", numMaterials);
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

    console.log(
      `Geometry mesh[${meshIdx}] prim[]: vertices=${
        vertices?.length ?? 0
      }, normals=${normals?.length ?? 0}, uvs=${uvs?.length ?? 0}, colors=${
        colors?.length ?? 0
      }, triangles=${triangles?.length ?? 0}, layerMaterialNum=`,
      layerMaterialNum,
      "flags=",
      flags,
      "boundingBox=",
      boundingBox,
      "type=",
      type,
      "numMaterials=",
      numMaterials,
      "numPoints=",
      numPoints,
      "numTriangles=",
      numTriangles,
    );
    return {
      vertices,
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
    };
  }

  const childNodes = doc.getRoot().listScenes()[0].listChildren();
  //childNodes.forEach(node => node.getM)
  console.log("childNodes:");
  console.log(childNodes);
  const processedNodes = childNodes.map((node) => processNode(node));
  //Flat processing
  //TODO: FIX, REMOVE AND REPLACE
  const geometries: BG3DGeometry[] = [];
  doc
    .getRoot()
    .listMeshes()
    .forEach((mesh, meshIdx) => {
      geometries.push(processMesh(mesh, meshIdx));
    });

  console.log("gltfToBG3D: Restoring groups...");
  let groups: BG3DGroup[] = [];
  const rootExtras = doc.getRoot().getExtras() || {};
  if (Array.isArray(rootExtras.groups)) {
    console.log("gltfToBG3D: Found group structure in root extras.");
    groups = rootExtras.groups;
  } else {
    console.log(
      "gltfToBG3D: No group structure found, creating single group with all geometries.",
    );
    groups = [{ children: geometries }];
  }

  const result = {
    materials,
    groups: processedNodes,
    //groups,
  };
  console.log("gltfToBG3D: Final BG3DParseResult:", result);
  return result;
}
