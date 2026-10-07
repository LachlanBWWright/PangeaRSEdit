import { describe, expect, it } from "vitest";
import { BigEndianReader, BigEndianWriter } from "./binaryUtils";
import { parse3DMFToMetaFile } from "./parse3DMF";
import { write3DMFFromMetaFile } from "./write3DMF";
import { bg3dParseResultToMetaFile, metaFileToBG3DParseResult } from "./convert";
import { CHUNK_3DMF, CHUNK_TMSH, TexturingMode, TQ3Boolean, type TQ3MetaFile, type TQ3TriMeshData } from "./types";

function createMesh(x: number): TQ3TriMeshData {
  return {
    numPoints: 3, points: [{ x, y: 0, z: 0 }, { x: x + 1, y: 0, z: 0 }, { x, y: 1, z: 0 }],
    numTriangles: 1, triangles: [{ pointIndices: [0, 1, 2] }],
    vertexNormals: null, vertexUVs: null, vertexColors: null,
    bBox: { min: { x, y: 0, z: 0 }, max: { x: x + 1, y: 1, z: 0 }, isEmpty: TQ3Boolean.False },
    texturingMode: TexturingMode.Off, internalTextureID: -1, hasVertexNormals: false, hasVertexColors: false,
    diffuseColor: { r: 0.2, g: 0.4, b: 0.6, a: 0.5 },
  };
}

function createFile(): TQ3MetaFile {
  const meshes = [createMesh(0), createMesh(10), createMesh(20)];
  return { numTextures: 0, textures: [], numMeshes: 3, meshes, numTopLevelGroups: 2,
    topLevelGroups: [{ numMeshes: 2, meshes: meshes.slice(0, 2) }, { numMeshes: 1, meshes: meshes.slice(2) }] };
}

function header(): BigEndianWriter {
  const writer = new BigEndianWriter();
  writer.writeUint32(CHUNK_3DMF); writer.writeUint32(16);
  writer.writeUint16(1); writer.writeUint16(5); writer.writeUint32(0); writer.writeUint64(0);
  return writer;
}

describe("3DMF bounds and grouping", () => {
  it("returns errors for invalid reader offsets/counts and unsafe 64-bit positions", () => {
    const reader = new BigEndianReader(new ArrayBuffer(8));
    reader.goto(-1); expect(reader.readUint32().isErr()).toBe(true);
    reader.goto(0.5); expect(reader.readUint8().isErr()).toBe(true);
    reader.goto(0); expect(reader.readBytes(-1).isErr()).toBe(true);
    expect(reader.readBytes(Number.NaN).isErr()).toBe(true);
    const writer = new BigEndianWriter(); writer.writeUint32(0xffffffff); writer.writeUint32(0xffffffff);
    expect(new BigEndianReader(writer.getBuffer()).readUint64().isErr()).toBe(true);
  });

  it("rejects truncated unknown chunks instead of accepting a seek past EOF", () => {
    const writer = header(); writer.writeUint32(0x74657374); writer.writeUint32(1000);
    expect(parse3DMFToMetaFile(writer.getBuffer()).isErr()).toBe(true);
  });

  it("rejects impossible mesh counts before allocating mesh arrays", () => {
    const writer = header(); writer.writeUint32(CHUNK_TMSH); writer.writeUint32(52);
    writer.writeUint32(0xffffffff); writer.writeUint32(0); writer.writeUint32(0); writer.writeUint32(0);
    writer.writeUint32(0xffffffff); writer.writeUint32(0);
    for (let index = 0; index < 7; index++) writer.writeUint32(0);
    expect(parse3DMFToMetaFile(writer.getBuffer()).isErr()).toBe(true);
  });

  it("preserves native group membership, bounds and diffuse alpha through native and BG3D roundtrips", () => {
    const original = createFile();
    const native = write3DMFFromMetaFile(original).andThen(parse3DMFToMetaFile);
    expect(native.isOk()).toBe(true);
    if (native.isErr()) return;
    expect(native.value.topLevelGroups.map(group => group.numMeshes)).toEqual([2, 1]);
    expect(native.value.meshes.map(mesh => mesh.bBox)).toEqual(original.meshes.map(mesh => mesh.bBox));
    expect(native.value.meshes[0]?.diffuseColor.a).toBeCloseTo(0.5);
    const converted = metaFileToBG3DParseResult(native.value).andThen(bg3dParseResultToMetaFile)
      .andThen(write3DMFFromMetaFile).andThen(parse3DMFToMetaFile);
    expect(converted.isOk()).toBe(true);
    if (converted.isErr()) return;
    expect(converted.value.topLevelGroups.map(group => group.numMeshes)).toEqual([2, 1]);
    expect(converted.value.meshes[0]?.diffuseColor.a).toBeCloseTo(0.5);
  });

  it("refuses inconsistent writer counts and out-of-range indices", () => {
    const file = createFile();
    expect(write3DMFFromMetaFile({ ...file, numMeshes: 4 }).isErr()).toBe(true);
    const mesh = file.meshes[0];
    if (!mesh) return;
    mesh.triangles = [{ pointIndices: [0, 1, 3] }];
    expect(write3DMFFromMetaFile(file).isErr()).toBe(true);
  });

  it("preserves empty model groups so later model indices stay stable", () => {
    const file = createFile();
    file.topLevelGroups.splice(1, 0, { numMeshes: 0, meshes: [] });
    file.numTopLevelGroups++;
    const result = write3DMFFromMetaFile(file).andThen(parse3DMFToMetaFile)
      .andThen(metaFileToBG3DParseResult).andThen(bg3dParseResultToMetaFile)
      .andThen(write3DMFFromMetaFile).andThen(parse3DMFToMetaFile);
    expect(result.isOk()).toBe(true);
    if (result.isErr()) return;
    expect(result.value.topLevelGroups.map(group => group.numMeshes)).toEqual([2, 0, 1]);
  });
});
