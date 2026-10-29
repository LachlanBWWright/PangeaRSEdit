interface BinaryPart { bytes: Uint8Array; offset: number }

export function customItemModelFixture(size = 100, includeWalk = true): Uint8Array {
  const parts: BinaryPart[] = [];
  let length = 0;
  function append(values: Float32Array | Uint16Array) {
    const bytes = new Uint8Array(values.buffer);
    const index = parts.length;
    parts.push({ bytes, offset: length });
    length += Math.ceil(bytes.length / 4) * 4;
    return index;
  }
  const position = append(new Float32Array([0, 0, 0, size, 0, 0, 0, size, 0]));
  const normal = append(new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]));
  const joints = append(new Uint16Array(12));
  const weights = append(new Float32Array([1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0]));
  const indices = append(new Uint16Array([0, 1, 2]));
  const inverse = append(new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));
  const time = append(new Float32Array([0, 1]));
  const translation = append(new Float32Array([0, 0, 0, 0, size / 10, 0]));
  const clip = (name: string) => ({ name, samplers: [{ input: 6, output: 7, interpolation: "LINEAR" }], channels: [{ sampler: 0, target: { node: 1, path: "translation" } }] });
  const document = {
    asset: { version: "2.0", generator: "Pangea custom item acceptance fixture" },
    scene: 0, scenes: [{ nodes: [0, 1] }],
    nodes: [{ name: "Fixture model", mesh: 0, skin: 0 }, { name: "Root joint" }],
    meshes: [{ name: "Triangle", primitives: [{ attributes: { POSITION: 0, NORMAL: 1, JOINTS_0: 2, WEIGHTS_0: 3 }, indices: 4 }] }],
    skins: [{ joints: [1], inverseBindMatrices: 5, skeleton: 1 }],
    animations: includeWalk ? [clip("Idle"), clip("Walk")] : [clip("Idle")],
    buffers: [{ byteLength: length }],
    bufferViews: parts.map((part) => ({ buffer: 0, byteOffset: part.offset, byteLength: part.bytes.length })),
    accessors: [
      { bufferView: position, componentType: 5126, count: 3, type: "VEC3", min: [0, 0, 0], max: [size, size, 0] },
      { bufferView: normal, componentType: 5126, count: 3, type: "VEC3" },
      { bufferView: joints, componentType: 5123, count: 3, type: "VEC4" },
      { bufferView: weights, componentType: 5126, count: 3, type: "VEC4" },
      { bufferView: indices, componentType: 5123, count: 3, type: "SCALAR" },
      { bufferView: inverse, componentType: 5126, count: 1, type: "MAT4" },
      { bufferView: time, componentType: 5126, count: 2, type: "SCALAR", min: [0], max: [1] },
      { bufferView: translation, componentType: 5126, count: 2, type: "VEC3" },
    ],
  };
  const json = new TextEncoder().encode(JSON.stringify(document));
  const jsonLength = Math.ceil(json.length / 4) * 4;
  const bytes = new Uint8Array(12 + 8 + jsonLength + 8 + length);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, 0x46546c67, true); view.setUint32(4, 2, true); view.setUint32(8, bytes.length, true);
  view.setUint32(12, jsonLength, true); view.setUint32(16, 0x4e4f534a, true);
  bytes.fill(32, 20, 20 + jsonLength); bytes.set(json, 20);
  view.setUint32(20 + jsonLength, length, true); view.setUint32(24 + jsonLength, 0x004e4942, true);
  for (const part of parts) bytes.set(part.bytes, 28 + jsonLength + part.offset);
  return bytes;
}
