import { BG3DParseResult, BG3DMaterial, BG3DGeometryFull } from "./parseBG3D";

// BG3D tag constants
const TAGS = {
  MATERIALFLAGS: 0,
  MATERIALDIFFUSECOLOR: 1,
  TEXTUREMAP: 2,
  GROUPSTART: 3,
  GROUPEND: 4,
  GEOMETRY: 5,
  VERTEXARRAY: 6,
  NORMALARRAY: 7,
  UVARRAY: 8,
  COLORARRAY: 9,
  TRIANGLEARRAY: 10,
  BOUNDINGBOX: 11,
  ENDFILE: 12,
};

function writeUint32BE(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, false);
}
function writeFloat32BE(view: DataView, offset: number, value: number) {
  view.setFloat32(offset, value, false);
}

export function bg3dParsedToBG3D(parsed: BG3DParseResult): ArrayBuffer {
  // Estimate size (over-allocate, then slice)
  let size = 1024 * 1024; // 1MB default, can be optimized
  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);
  let offset = 0;

  // Write header 'BG3D'
  view.setUint8(offset++, "B".charCodeAt(0));
  view.setUint8(offset++, "G".charCodeAt(0));
  view.setUint8(offset++, "3".charCodeAt(0));
  view.setUint8(offset++, "D".charCodeAt(0));

  // Write materials
  for (const mat of parsed.materials) {
    writeUint32BE(view, offset, TAGS.MATERIALFLAGS);
    offset += 4;
    writeUint32BE(view, offset, mat.flags);
    offset += 4;
    writeUint32BE(view, offset, TAGS.MATERIALDIFFUSECOLOR);
    offset += 4;
    for (let i = 0; i < 4; i++) {
      writeFloat32BE(view, offset, mat.diffuseColor[i]);
      offset += 4;
    }
    for (const tex of mat.textures) {
      writeUint32BE(view, offset, TAGS.TEXTUREMAP);
      offset += 4;
      writeUint32BE(view, offset, tex.width);
      offset += 4;
      writeUint32BE(view, offset, tex.height);
      offset += 4;
      writeUint32BE(view, offset, tex.srcPixelFormat);
      offset += 4;
      writeUint32BE(view, offset, tex.dstPixelFormat);
      offset += 4;
      writeUint32BE(view, offset, tex.bufferSize);
      offset += 4;
      offset += 16; // skip 4 unused uint32s
      new Uint8Array(buffer, offset, tex.bufferSize).set(tex.pixels);
      offset += tex.bufferSize;
    }
  }

  // Write geometry
  for (const geom of parsed.geometries as BG3DGeometryFull[]) {
    writeUint32BE(view, offset, TAGS.GEOMETRY);
    offset += 4;
    writeUint32BE(view, offset, geom.type);
    offset += 4;
    writeUint32BE(view, offset, geom.numMaterials);
    offset += 4;
    writeUint32BE(view, offset, geom.numPoints);
    offset += 4;
    writeUint32BE(view, offset, geom.numTriangles);
    offset += 4;
    for (let i = 0; i < 4; i++)
      writeUint32BE(view, offset, geom.layerMaterialNum[i] || 0), (offset += 4);
    offset += 12; // skip 3 uint32
    offset += 16; // skip 4 uint32
    if (geom.points) {
      writeUint32BE(view, offset, TAGS.VERTEXARRAY);
      offset += 4;
      for (const [x, y, z] of geom.points) {
        writeFloat32BE(view, offset, x);
        offset += 4;
        writeFloat32BE(view, offset, y);
        offset += 4;
        writeFloat32BE(view, offset, z);
        offset += 4;
      }
    }
    if (geom.normals) {
      writeUint32BE(view, offset, TAGS.NORMALARRAY);
      offset += 4;
      for (const [x, y, z] of geom.normals) {
        writeFloat32BE(view, offset, x);
        offset += 4;
        writeFloat32BE(view, offset, y);
        offset += 4;
        writeFloat32BE(view, offset, z);
        offset += 4;
      }
    }
    if (geom.uvs) {
      writeUint32BE(view, offset, TAGS.UVARRAY);
      offset += 4;
      for (const [u, v] of geom.uvs) {
        writeFloat32BE(view, offset, u);
        offset += 4;
        writeFloat32BE(view, offset, v);
        offset += 4;
      }
    }
    if (geom.colors) {
      writeUint32BE(view, offset, TAGS.COLORARRAY);
      offset += 4;
      for (const [r, g, b, a] of geom.colors) {
        view.setUint8(offset++, r);
        view.setUint8(offset++, g);
        view.setUint8(offset++, b);
        view.setUint8(offset++, a);
      }
    }
    if (geom.triangles) {
      writeUint32BE(view, offset, TAGS.TRIANGLEARRAY);
      offset += 4;
      for (const [a, b, c] of geom.triangles) {
        writeUint32BE(view, offset, a);
        offset += 4;
        writeUint32BE(view, offset, b);
        offset += 4;
        writeUint32BE(view, offset, c);
        offset += 4;
      }
    }
    if (geom.boundingBox) {
      writeUint32BE(view, offset, TAGS.BOUNDINGBOX);
      offset += 4;
      for (let i = 0; i < 3; i++)
        writeFloat32BE(view, offset, geom.boundingBox.min[i]), (offset += 4);
      for (let i = 0; i < 3; i++)
        writeFloat32BE(view, offset, geom.boundingBox.max[i]), (offset += 4);
    }
  }

  // End tag
  writeUint32BE(view, offset, TAGS.ENDFILE);
  offset += 4;

  // Return the used slice
  return buffer.slice(0, offset);
}
