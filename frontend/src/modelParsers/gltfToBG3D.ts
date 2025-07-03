import { BG3DParseResult, BG3DGeometryFull, BG3DMaterial } from "./parseBG3D";

// Minimal glTF 2.0 types for input (matching BG3DParsedToGIFT)
interface GLTF {
  buffers: { uri: string; byteLength: number }[];
  bufferViews: { buffer: number; byteOffset: number; byteLength: number }[];
  accessors: {
    bufferView: number;
    byteOffset: number;
    componentType: number;
    count: number;
    type: string;
  }[];
  meshes: {
    primitives: {
      attributes: { [key: string]: number };
      indices: number;
      material: number;
    }[];
  }[];
  materials: {
    pbrMetallicRoughness: { baseColorFactor: [number, number, number, number] };
  }[];
}

/**
 * Convert a minimal glTF 2.0 JSON structure to a BG3DParseResult
 * @param gltf glTF 2.0 JSON object
 * @returns BG3DParseResult
 */
export function gltfToBG3D(gltf: GLTF): BG3DParseResult {
  // Decode buffer (assume single buffer, data URI)
  const bufferUri = gltf.buffers[0].uri;
  const base64 = bufferUri.split(",")[1];
  const binary = atob(base64);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);

  // Helper to extract typed arrays from bufferViews/accessors
  function getArray<T extends Float32Array | Uint16Array | Uint8Array>(
    accessorIndex: number,
    ctor: { new (b: ArrayBuffer, o: number, l: number): T },
    bytesPerElement: number,
  ): T {
    const accessor = gltf.accessors[accessorIndex];
    const view = gltf.bufferViews[accessor.bufferView];
    const numComponents =
      accessor.type === "VEC3"
        ? 3
        : accessor.type === "VEC2"
        ? 2
        : accessor.type === "VEC4"
        ? 4
        : 1;
    const offset = (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const length = accessor.count * numComponents;
    return new ctor(buf.buffer, offset, length);
  }

  // Convert materials
  const materials: BG3DMaterial[] = gltf.materials.map((mat) => ({
    flags: 0,
    diffuseColor: mat.pbrMetallicRoughness.baseColorFactor,
    textures: [],
  }));

  // Convert meshes/geometries
  const geometries: BG3DGeometryFull[] = [];
  for (const mesh of gltf.meshes) {
    for (const prim of mesh.primitives) {
      // Positions
      const posAccessor = prim.attributes["POSITION"];
      const positions = getArray(posAccessor, Float32Array, 4);
      const points: [number, number, number][] = [];
      for (let i = 0; i < positions.length; i += 3) {
        points.push([positions[i], positions[i + 1], positions[i + 2]]);
      }
      // Normals (optional)
      let normals: [number, number, number][] | undefined = undefined;
      if ("NORMAL" in prim.attributes) {
        const normalAccessor = prim.attributes["NORMAL"];
        const normalArr = getArray(normalAccessor, Float32Array, 4);
        normals = [];
        for (let i = 0; i < normalArr.length; i += 3) {
          normals.push([normalArr[i], normalArr[i + 1], normalArr[i + 2]]);
        }
      }
      // UVs (optional)
      let uvs: [number, number][] | undefined = undefined;
      if ("TEXCOORD_0" in prim.attributes) {
        const uvAccessor = prim.attributes["TEXCOORD_0"];
        const uvArr = getArray(uvAccessor, Float32Array, 4);
        uvs = [];
        for (let i = 0; i < uvArr.length; i += 2) {
          uvs.push([uvArr[i], uvArr[i + 1]]);
        }
      }
      // Indices
      const indexArr = getArray(prim.indices, Uint16Array, 2);
      const triangles: [number, number, number][] = [];
      for (let i = 0; i < indexArr.length; i += 3) {
        triangles.push([indexArr[i], indexArr[i + 1], indexArr[i + 2]]);
      }
      // Material
      const layerMaterialNum = [prim.material, 0, 0, 0];
      geometries.push({
        type: 0,
        numMaterials: 1,
        numPoints: points.length,
        numTriangles: triangles.length,
        layerMaterialNum,
        points,
        normals,
        uvs,
        triangles,
      });
    }
  }

  return {
    materials,
    groups: [], // Not handled in minimal glTF
    geometries,
  };
}
