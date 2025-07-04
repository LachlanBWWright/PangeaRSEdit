import {
  BG3DParseResult,
  BG3DMaterial,
  BG3DGeometryFull,
  BG3DTagType,
} from "./parseBG3D";

/**
 * Serialize a BG3DParseResult back to a BG3D ArrayBuffer
 * This reverses the logic of parseBG3D.ts
 */
export function bg3dParsedToBG3D(
  parsed: BG3DParseResult,
  originalHeader?: Uint8Array,
): ArrayBuffer {
  // Estimate buffer size (over-allocate, then slice)
  let size = 1024 * 1024; // 1MB default, grow if needed
  let buffer = new ArrayBuffer(size);
  let view = new DataView(buffer);
  let offset = 0;

  // Write header: use original if provided, else default
  if (originalHeader && originalHeader.length === 20) {
    new Uint8Array(buffer, 0, 20).set(originalHeader);
    offset += 20;
  } else {
    view.setUint8(offset++, "B".charCodeAt(0));
    view.setUint8(offset++, "G".charCodeAt(0));
    view.setUint8(offset++, "3".charCodeAt(0));
    view.setUint8(offset++, "D".charCodeAt(0));
    for (let i = 0; i < 16; i++) view.setUint8(offset++, 0);
  }
  console.log("Writing header at offset", offset);

  // Write materials
  for (const mat of parsed.materials) {
    // MATERIALFLAGS
    console.log("Writing MATERIALFLAGS at offset", offset);
    view.setUint32(offset, BG3DTagType.MATERIALFLAGS, false);
    offset += 4;
    view.setUint32(offset, mat.flags, false);
    offset += 4;
    // MATERIALDIFFUSECOLOR
    console.log("Writing MATERIALDIFFUSECOLOR at offset", offset);
    view.setUint32(offset, BG3DTagType.MATERIALDIFFUSECOLOR, false);
    offset += 4;
    for (let i = 0; i < 4; i++) {
      view.setFloat32(offset, mat.diffuseColor[i], false);
      offset += 4;
    }
    // TEXTUREMAP(s)
    for (const tex of mat.textures) {
      console.log("Writing TEXTUREMAP at offset", offset);
      view.setUint32(offset, BG3DTagType.TEXTUREMAP, false);
      offset += 4;
      view.setUint32(offset, tex.width, false);
      offset += 4;
      view.setUint32(offset, tex.height, false);
      offset += 4;
      view.setUint32(offset, tex.srcPixelFormat, false);
      offset += 4;
      view.setUint32(offset, tex.dstPixelFormat, false);
      offset += 4;
      view.setUint32(offset, tex.bufferSize, false);
      offset += 4;
      for (let i = 0; i < 4; i++) {
        view.setUint32(offset, 0, false);
        offset += 4;
      } // reserved
      // Write pixel data
      new Uint8Array(buffer, offset, tex.bufferSize).set(tex.pixels);
      offset += tex.bufferSize;
    }
  }

  // Write groups (if any)
  for (const group of parsed.groups) {
    console.log("Writing GROUPSTART at offset", offset);
    view.setUint32(offset, BG3DTagType.GROUPSTART, false);
    offset += 4;
    // Write group children as geometries
    for (const geom of group.children) {
      writeGeometry(view, buffer, geom, offset);
      offset = writeGeometry.offset;
    }
    console.log("Writing GROUPEND at offset", offset);
    view.setUint32(offset, BG3DTagType.GROUPEND, false);
    offset += 4;
  }

  // Write geometries (top-level, not in groups)
  for (const geom of parsed.geometries) {
    writeGeometry(view, buffer, geom, offset);
    offset = writeGeometry.offset;
  }

  // ENDFILE
  console.log("Writing ENDFILE at offset", offset);
  view.setUint32(offset, BG3DTagType.ENDFILE, false);
  offset += 4;

  // Return the used slice
  return buffer.slice(0, offset);
}

// Helper to write a geometry and its arrays
function writeGeometry(
  view: DataView,
  buffer: ArrayBuffer,
  geom: BG3DGeometryFull,
  startOffset: number,
) {
  let offset = startOffset;
  // GEOMETRY tag
  console.log("Writing GEOMETRY at offset", offset);
  view.setUint32(offset, BG3DTagType.GEOMETRY, false);
  offset += 4;
  view.setUint32(offset, geom.type, false);
  offset += 4;
  view.setUint32(offset, geom.numMaterials, false);
  offset += 4;
  for (let i = 0; i < 4; i++) {
    view.setUint32(offset, geom.layerMaterialNum?.[i] ?? 0, false);
    offset += 4;
  }
  view.setUint32(offset, geom.flags, false);
  offset += 4;
  view.setUint32(offset, geom.numPoints, false);
  offset += 4;
  view.setUint32(offset, geom.numTriangles, false);
  offset += 4;

  // VERTEXARRAY
  if (geom.points) {
    console.log("Writing VERTEXARRAY at offset", offset);
    view.setUint32(offset, BG3DTagType.VERTEXARRAY, false);
    offset += 4;
    for (const [x, y, z] of geom.points) {
      view.setFloat32(offset, x, false);
      offset += 4;
      view.setFloat32(offset, y, false);
      offset += 4;
      view.setFloat32(offset, z, false);
      offset += 4;
    }
  }
  // NORMALARRAY
  if (geom.normals) {
    console.log("Writing NORMALARRAY at offset", offset);
    view.setUint32(offset, BG3DTagType.NORMALARRAY, false);
    offset += 4;
    for (const [x, y, z] of geom.normals) {
      view.setFloat32(offset, x, false);
      offset += 4;
      view.setFloat32(offset, y, false);
      offset += 4;
      view.setFloat32(offset, z, false);
      offset += 4;
    }
  }
  // UVARRAY
  if (geom.uvs) {
    console.log("Writing UVARRAY at offset", offset);
    view.setUint32(offset, BG3DTagType.UVARRAY, false);
    offset += 4;
    for (const [u, v] of geom.uvs) {
      view.setFloat32(offset, u, false);
      offset += 4;
      view.setFloat32(offset, v, false);
      offset += 4;
    }
  }
  // COLORARRAY
  if (geom.colors) {
    console.log("Writing COLORARRAY at offset", offset);
    view.setUint32(offset, BG3DTagType.COLORARRAY, false);
    offset += 4;
    for (const [r, g, b, a] of geom.colors) {
      view.setUint8(offset++, r);
      view.setUint8(offset++, g);
      view.setUint8(offset++, b);
      view.setUint8(offset++, a);
    }
  }
  // TRIANGLEARRAY
  if (geom.triangles) {
    console.log("Writing TRIANGLEARRAY at offset", offset);
    view.setUint32(offset, BG3DTagType.TRIANGLEARRAY, false);
    offset += 4;
    for (const [a, b, c] of geom.triangles) {
      view.setUint32(offset, a, false);
      offset += 4;
      view.setUint32(offset, b, false);
      offset += 4;
      view.setUint32(offset, c, false);
      offset += 4;
    }
  }
  // BOUNDINGBOX
  if (geom.boundingBox) {
    console.log("Writing BOUNDINGBOX at offset", offset);
    view.setUint32(offset, BG3DTagType.BOUNDINGBOX, false);
    offset += 4;
    for (let i = 0; i < 3; i++)
      view.setFloat32(offset, geom.boundingBox.min[i], false), (offset += 4);
    for (let i = 0; i < 3; i++)
      view.setFloat32(offset, geom.boundingBox.max[i], false), (offset += 4);
  }
  // Update offset for next write
  writeGeometry.offset = offset;
}
// Static property to track offset
writeGeometry.offset = 0;
