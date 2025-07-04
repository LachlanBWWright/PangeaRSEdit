// parseBG3D.ts
// Full BG3D file parser for Otto Matic and related games

// BG3D tag constants (from C headers and extractbg3d.py)
export enum BG3DTagType {
  MATERIALFLAGS = 0,
  MATERIALDIFFUSECOLOR = 1,
  TEXTUREMAP = 2,
  GROUPSTART = 3,
  GROUPEND = 4,
  GEOMETRY = 5,
  VERTEXARRAY = 6,
  NORMALARRAY = 7,
  UVARRAY = 8,
  COLORARRAY = 9,
  TRIANGLEARRAY = 10,
  ENDFILE = 11,
  BOUNDINGBOX = 12, //LATER Games only
  JPEGTEXTURE = 13, // Nanosaur 2 only
}

// BG3D material structure (partial)
export interface BG3DMaterial {
  flags: number;
  diffuseColor: [number, number, number, number];
  textures: BG3DTexture[];
}

export interface BG3DTexture {
  width: number;
  height: number;
  srcPixelFormat: number;
  dstPixelFormat: number;
  bufferSize: number;
  pixels: Uint8Array;
}

export interface BG3DGeometry {
  type: number;
  numMaterials: number;
  layerMaterialNum: number[];
  flags: number;
  numPoints: number;
  numTriangles: number;
  // ...
}

export interface BG3DGeometryFull extends BG3DGeometry {
  points?: [number, number, number][];
  normals?: [number, number, number][];
  uvs?: [number, number][];
  colors?: [number, number, number, number][];
  triangles?: [number, number, number][];
  boundingBox?: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

export interface BG3DGroup {
  children: BG3DGeometryFull[];
}

export interface BG3DParseResult {
  materials: BG3DMaterial[];
  groups: BG3DGroup[];
  geometries: BG3DGeometryFull[];
}

/**
 * Parse a .bg3d file from an ArrayBuffer
 * @param buffer ArrayBuffer containing the .bg3d file
 * @param gameType Which game this BG3D is from (Game enum)
 * @returns BG3DParseResult
 */
export function parseBG3D(buffer: ArrayBuffer): BG3DParseResult {
  const view = new DataView(buffer);
  let offset = 0;
  // Read header (first 4 bytes should be 'BG3D')
  const headerString = String.fromCharCode(
    view.getUint8(offset++),
    view.getUint8(offset++),
    view.getUint8(offset++),
    view.getUint8(offset++),
  );
  if (headerString !== "BG3D") {
    throw new Error("Not a BG3D file");
  }

  // Skip remainder of header (BG3DHeaderType is 20 bits, 16 bit string, 4 bit version)
  offset += 16;

  // Main parse state
  const materials: BG3DMaterial[] = [];
  const groups: BG3DGroup[] = [];
  const geometries: BG3DGeometryFull[] = [];
  let currentMaterial: BG3DMaterial | null = null;
  let done = false;

  // Tag-based parsing loop
  while (!done && offset < buffer.byteLength) {
    console.log(`Parsing at offset ${offset}/${buffer.byteLength}`);
    console.log(
      `Tag type: ${
        BG3DTagType[view.getUint32(offset, false)]
      } (${view.getUint32(offset, false)})`,
    );
    if (offset + 4 > buffer.byteLength) break;
    let tag = view.getUint32(offset, false);
    offset += 4;

    switch (tag) {
      case BG3DTagType.MATERIALFLAGS: {
        // 4 bytes: flags
        const flags = view.getUint32(offset, false);
        offset += 4;
        currentMaterial = { flags, diffuseColor: [1, 1, 1, 1], textures: [] };
        materials.push(currentMaterial);
        break;
      }
      case BG3DTagType.MATERIALDIFFUSECOLOR: {
        // 4 floats (RGBA)
        if (!currentMaterial)
          throw new Error("No current material for diffuse color");
        const r = view.getFloat32(offset, false);
        offset += 4;
        const g = view.getFloat32(offset, false);
        offset += 4;
        const b = view.getFloat32(offset, false);
        offset += 4;
        const a = view.getFloat32(offset, false);
        offset += 4;
        currentMaterial.diffuseColor = [r, g, b, a];
        break;
      }
      case BG3DTagType.TEXTUREMAP: {
        // Texture header: 4 bytes each: width, height, srcPixelFormat, dstPixelFormat, bufferSize, 4 unused
        const width = view.getUint32(offset, false);
        offset += 4;
        const height = view.getUint32(offset, false);
        offset += 4;
        const srcPixelFormat = view.getUint32(offset, false);
        offset += 4;
        const dstPixelFormat = view.getUint32(offset, false);
        offset += 4;
        const bufferSize = view.getUint32(offset, false);
        offset += 4;
        offset += 16; // skip 4 unused uint32s
        // Texture pixels
        const pixels = new Uint8Array(buffer, offset, bufferSize);
        offset += bufferSize;
        if (!currentMaterial)
          throw new Error("No current material for texture");
        currentMaterial.textures.push({
          width,
          height,
          srcPixelFormat,
          dstPixelFormat,
          bufferSize,
          pixels,
        });
        break;
      }
      case BG3DTagType.GROUPSTART: {
        // Start a new group
        groups.push({ children: [] });
        break;
      }
      case BG3DTagType.GROUPEND: {
        // End current group (no-op for now)
        break;
      }
      case BG3DTagType.GEOMETRY: {
        // Geometry header: type (4), numMaterials (4), layerMaterialNum[4] (16), flags (4), numPoints (4), numTriangles (4)
        const type = view.getUint32(offset, false);
        offset += 4;
        const numMaterials = view.getUint32(offset, false);
        offset += 4;
        const layerMaterialNum = [
          view.getUint32(offset, false),
          view.getUint32(offset + 4, false),
          view.getUint32(offset + 8, false),
          view.getUint32(offset + 12, false),
        ];
        offset += 16;
        const flags = view.getUint32(offset, false);
        offset += 4;
        const numPoints = view.getUint32(offset, false);
        offset += 4;
        const numTriangles = view.getUint32(offset, false);
        offset += 4;
        const geom: BG3DGeometryFull = {
          type,
          numMaterials,
          layerMaterialNum,
          flags,
          numPoints,
          numTriangles,
        };
        geometries.push(geom);
        break;
      }
      case BG3DTagType.VERTEXARRAY: {
        // Vertex array: numPoints * 3 floats
        if (geometries.length === 0)
          throw new Error("No geometry for vertex array");
        const geom = geometries[geometries.length - 1];
        const numPoints = geom.numPoints;
        const points: [number, number, number][] = [];
        for (let i = 0; i < numPoints; i++) {
          const x = view.getFloat32(offset, false);
          offset += 4;
          const y = view.getFloat32(offset, false);
          offset += 4;
          const z = view.getFloat32(offset, false);
          offset += 4;
          points.push([x, y, z]);
        }
        geom.points = points;
        break;
      }
      case BG3DTagType.NORMALARRAY: {
        // Normal array: numPoints * 3 floats
        if (geometries.length === 0)
          throw new Error("No geometry for normal array");
        const geom = geometries[geometries.length - 1];
        const numPoints = geom.numPoints;
        const normals: [number, number, number][] = [];
        for (let i = 0; i < numPoints; i++) {
          const x = view.getFloat32(offset, false);
          offset += 4;
          const y = view.getFloat32(offset, false);
          offset += 4;
          const z = view.getFloat32(offset, false);
          offset += 4;
          normals.push([x, y, z]);
        }
        geom.normals = normals;
        break;
      }
      case BG3DTagType.UVARRAY: {
        // UV array: numPoints * 2 floats
        if (geometries.length === 0)
          throw new Error("No geometry for uv array");
        const geom = geometries[geometries.length - 1];
        const numPoints = geom.numPoints;
        const uvs: [number, number][] = [];
        for (let i = 0; i < numPoints; i++) {
          const u = view.getFloat32(offset, false);
          offset += 4;
          const v = view.getFloat32(offset, false);
          offset += 4;
          uvs.push([u, v]);
        }
        geom.uvs = uvs;
        break;
      }
      case BG3DTagType.COLORARRAY: {
        // Color array: numPoints * 4 bytes (RGBA)
        if (geometries.length === 0)
          throw new Error("No geometry for color array");
        const geom = geometries[geometries.length - 1];
        const numPoints = geom.numPoints;
        const colors: [number, number, number, number][] = [];
        for (let i = 0; i < numPoints; i++) {
          const r = view.getUint8(offset++);
          const g = view.getUint8(offset++);
          const b = view.getUint8(offset++);
          const a = view.getUint8(offset++);
          colors.push([r, g, b, a]);
        }
        geom.colors = colors;
        break;
      }
      case BG3DTagType.TRIANGLEARRAY: {
        // Triangle array: numTriangles * 3 uint32
        if (geometries.length === 0)
          throw new Error("No geometry for triangle array");
        const geom = geometries[geometries.length - 1];
        const numTriangles = geom.numTriangles;
        const triangles: [number, number, number][] = [];
        for (let i = 0; i < numTriangles; i++) {
          const a = view.getUint32(offset, false);
          offset += 4;
          const b = view.getUint32(offset, false);
          offset += 4;
          const c = view.getUint32(offset, false);
          offset += 4;
          triangles.push([a, b, c]);
        }
        geom.triangles = triangles;
        break;
      }
      case BG3DTagType.BOUNDINGBOX: {
        // Bounding box: 6 floats (min x/y/z, max x/y/z)
        if (geometries.length === 0)
          throw new Error("No geometry for bounding box");
        const geom = geometries[geometries.length - 1];
        const min: [number, number, number] = [
          view.getFloat32(offset, false),
          view.getFloat32(offset + 4, false),
          view.getFloat32(offset + 8, false),
        ];
        const max: [number, number, number] = [
          view.getFloat32(offset + 12, false),
          view.getFloat32(offset + 16, false),
          view.getFloat32(offset + 20, false),
        ];
        offset += 24;
        geom.boundingBox = { min, max };
        break;
      }
      case BG3DTagType.ENDFILE: {
        done = true;
        break;
      }
      default: {
        throw new Error(`Unknown BG3D tag: ${tag} at offset ${offset - 4}`);
      }
    }
  }

  return {
    materials,
    groups,
    geometries,
    // Add more as needed
  };
}
