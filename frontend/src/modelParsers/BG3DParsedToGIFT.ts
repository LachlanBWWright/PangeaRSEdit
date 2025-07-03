import { BG3DParseResult, BG3DGeometryFull } from "../modelParsers/parseBG3D";

// Minimal glTF 2.0 types for output
interface GLTFBuffer {
  byteLength: number;
  uri: string;
}
interface GLTFBufferView {
  buffer: number;
  byteOffset: number;
  byteLength: number;
}
interface GLTFAccessor {
  bufferView: number;
  byteOffset: number;
  componentType: number;
  count: number;
  type: string;
}
interface GLTFPrimitive {
  attributes: { [key: string]: number };
  indices: number;
  material: number;
}
interface GLTFMesh {
  primitives: GLTFPrimitive[];
}
interface GLTFNode {
  mesh: number;
}
interface GLTFMaterial {
  pbrMetallicRoughness: { baseColorFactor: [number, number, number, number] };
}
interface GLTFScene {
  nodes: number[];
}
interface GLTF {
  asset: { version: string; generator: string };
  buffers: GLTFBuffer[];
  bufferViews: GLTFBufferView[];
  accessors: GLTFAccessor[];
  meshes: GLTFMesh[];
  nodes: GLTFNode[];
  scenes: GLTFScene[];
  scene: number;
  materials: GLTFMaterial[];
}

/**
 * Convert a BG3DParseResult to a minimal glTF 2.0 JSON structure
 * @param bg3d BG3DParseResult from parseBG3D
 * @returns glTF 2.0 JSON object
 */
export function bg3dParsedToGLTF(bg3d: BG3DParseResult): GLTF {
  // Buffers for all mesh data
  const buffers: Uint8Array[] = [];
  const bufferViews: GLTFBufferView[] = [];
  const accessors: GLTFAccessor[] = [];
  const meshes: GLTFMesh[] = [];
  const nodes: GLTFNode[] = [];
  const materials: GLTFMaterial[] = [];

  // Helper to add data to buffer and create bufferView+accessor
  function addBuffer(
    data: Float32Array | Uint16Array | Uint8Array,
    componentType: number,
    type: string,
    count: number,
  ): { accessor: number } {
    const byteOffset = buffers.reduce((sum, b) => sum + b.byteLength, 0);
    buffers.push(new Uint8Array(data.buffer));
    bufferViews.push({
      buffer: 0,
      byteOffset,
      byteLength: data.byteLength,
    });
    accessors.push({
      bufferView: bufferViews.length - 1,
      byteOffset: 0,
      componentType,
      count,
      type,
    });
    return { accessor: accessors.length - 1 };
  }

  // Convert each geometry to a glTF mesh
  for (const geom of bg3d.geometries as BG3DGeometryFull[]) {
    // Positions
    const points = geom.points ?? [];
    const positionArray = new Float32Array(points.flat());
    const posAccessor = addBuffer(
      positionArray,
      5126,
      "VEC3",
      points.length,
    ).accessor;
    // Normals (optional)
    let normalAccessor: number | undefined = undefined;
    if (geom.normals) {
      const normals = geom.normals;
      const normalArray = new Float32Array(normals.flat());
      normalAccessor = addBuffer(
        normalArray,
        5126,
        "VEC3",
        normals.length,
      ).accessor;
    }
    // UVs (optional)
    let uvAccessor: number | undefined = undefined;
    if (geom.uvs) {
      const uvs = geom.uvs;
      const uvArray = new Float32Array(uvs.flat());
      uvAccessor = addBuffer(uvArray, 5126, "VEC2", uvs.length).accessor;
    }
    // Indices
    const triangles = geom.triangles ?? [];
    const indexArray = new Uint16Array(triangles.flat());
    const indexAccessor = addBuffer(
      indexArray,
      5123,
      "SCALAR",
      indexArray.length,
    ).accessor;
    // Material (use first material if available)
    const matIndex = geom.layerMaterialNum ? geom.layerMaterialNum[0] : 0;
    // Mesh primitive
    const attributes: { [key: string]: number } = { POSITION: posAccessor };
    if (normalAccessor !== undefined) attributes.NORMAL = normalAccessor;
    if (uvAccessor !== undefined) attributes.TEXCOORD_0 = uvAccessor;
    meshes.push({
      primitives: [
        {
          attributes,
          indices: indexAccessor,
          material: matIndex,
        },
      ],
    });
    nodes.push({ mesh: meshes.length - 1 });
  }

  // Convert materials
  for (const mat of bg3d.materials) {
    const pbr = { baseColorFactor: mat.diffuseColor };
    // TODO: Add texture support
    materials.push({ pbrMetallicRoughness: pbr });
  }

  // Concatenate all buffers
  const totalLength = buffers.reduce((sum, b) => sum + b.byteLength, 0);
  const bigBuffer = new Uint8Array(totalLength);
  let offset = 0;
  for (const b of buffers) {
    bigBuffer.set(b, offset);
    offset += b.byteLength;
  }

  // glTF JSON
  const gltf: GLTF = {
    asset: { version: "2.0", generator: "pangearsedit bg3d2gltf" },
    buffers: [
      {
        byteLength: bigBuffer.byteLength,
        uri:
          "data:application/octet-stream;base64," +
          btoa(String.fromCharCode(...bigBuffer)),
      },
    ],
    bufferViews,
    accessors,
    meshes,
    nodes,
    scenes: [{ nodes: nodes.map((_, i) => i) }],
    scene: 0,
    materials,
  };
  return gltf;
}
