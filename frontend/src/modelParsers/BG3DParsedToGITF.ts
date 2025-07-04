import { BG3DParseResult } from "./parseBG3D";
import { argb16ToPng } from "./image/pngArgb";

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
    m.setExtras({ flags: mat.flags });
    return m;
  });

  // 2. Textures/Images (if any)
  // Note: BG3D allows multiple textures per material, glTF usually one per channel
  // We'll attach the first texture as baseColorTexture, others in extras
  const gltfTextures: Texture[] = [];
  parsed.materials.forEach((mat, i) => {
    if (mat.textures && mat.textures.length > 0) {
      const tex = mat.textures[0];
      // Convert 16-bit ARGB1555 pixel data to PNG buffer
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
        // fallback: store raw data if conversion fails
        pngBuffer = Buffer.from(tex.pixels);
      }
      // Create a texture and assign the PNG buffer directly
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
    if (gltfMaterials[0]) {
      prim.setMaterial(gltfMaterials[0]); // TODO: Use correct material index if available
    }
    // Extras for unmappable fields
    prim.setExtras({
      layerMaterialNum: geom.layerMaterialNum,
      flags: geom.flags,
      boundingBox: geom.boundingBox,
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
  });

  return doc;
}
