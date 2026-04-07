/**
 * Bugdom 2 Tunnel Level (.tun) Binary Serializer
 *
 * Converts TunnelData back to binary format for saving.
 */

import { Result, ok, err } from "neverthrow";

function tryFn<T>(fn: () => T): Result<T, Error> {
  try {
    return ok(fn());
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}
import type {
  TunnelData,
  TunnelSplinePoint,
  TunnelTexture,
  TunnelItem,
  TunnelSection,
  TunnelSectionMesh,
  Point3D,
  Vector3D,
  TextureCoord,
  TriangleIndices,
  BoundingBox,
} from "./types";

/**
 * Binary writer helper for big-endian data
 */
class BinaryWriter {
  private buffer: ArrayBuffer;
  private view: DataView;
  private offset: number;

  constructor(initialSize: number = 1024 * 1024) {
    this.buffer = new ArrayBuffer(initialSize);
    this.view = new DataView(this.buffer);
    this.offset = 0;
  }

  private ensureCapacity(additionalBytes: number): void {
    const required = this.offset + additionalBytes;
    if (required <= this.buffer.byteLength) return;

    const newSize = Math.max(this.buffer.byteLength * 2, required);
    const newBuffer = new ArrayBuffer(newSize);
    const newView = new DataView(newBuffer);

    // Copy existing data
    const oldArray = new Uint8Array(this.buffer);
    const newArray = new Uint8Array(newBuffer);
    newArray.set(oldArray);

    this.buffer = newBuffer;
    this.view = newView;
  }

  writeUint8(value: number): void {
    this.ensureCapacity(1);
    this.view.setUint8(this.offset, value);
    this.offset += 1;
  }

  writeUint16(value: number): void {
    this.ensureCapacity(2);
    this.view.setUint16(this.offset, value, false); // big-endian
    this.offset += 2;
  }

  writeInt32(value: number): void {
    this.ensureCapacity(4);
    this.view.setInt32(this.offset, value, false); // big-endian
    this.offset += 4;
  }

  writeUint32(value: number): void {
    this.ensureCapacity(4);
    this.view.setUint32(this.offset, value, false); // big-endian
    this.offset += 4;
  }

  writeFloat32(value: number): void {
    this.ensureCapacity(4);
    this.view.setFloat32(this.offset, value, false); // big-endian
    this.offset += 4;
  }

  writeBoolean(value: boolean): void {
    this.writeUint8(value ? 1 : 0);
  }

  writePadding(bytes: number): void {
    this.ensureCapacity(bytes);
    for (let i = 0; i < bytes; i++) {
      this.view.setUint8(this.offset + i, 0);
    }
    this.offset += bytes;
  }

  writePoint3D(point: Point3D): void {
    this.writeFloat32(point.x);
    this.writeFloat32(point.y);
    this.writeFloat32(point.z);
  }

  writeVector3D(vec: Vector3D): void {
    this.writeFloat32(vec.x);
    this.writeFloat32(vec.y);
    this.writeFloat32(vec.z);
  }

  writeTextureCoord(coord: TextureCoord): void {
    this.writeFloat32(coord.u);
    this.writeFloat32(coord.v);
  }

  writeTriangleIndices(tri: TriangleIndices): void {
    this.writeUint32(tri.a);
    this.writeUint32(tri.b);
    this.writeUint32(tri.c);
  }

  writeBoundingBox(box: BoundingBox): void {
    this.writePoint3D(box.min);
    this.writePoint3D(box.max);
    this.writeBoolean(box.isEmpty);
    this.writePadding(3); // 3-byte padding to align to 4-byte boundaries (C struct alignment)
  }

  writeBytes(data: Uint8Array): void {
    this.ensureCapacity(data.length);
    const target = new Uint8Array(this.buffer, this.offset, data.length);
    target.set(data);
    this.offset += data.length;
  }

  getBuffer(): ArrayBuffer {
    return this.buffer.slice(0, this.offset);
  }
}

/**
 * Serialize a spline point
 */
function serializeSplinePoint(
  writer: BinaryWriter,
  point: TunnelSplinePoint,
): void {
  writer.writePoint3D(point.point);
  writer.writeVector3D(point.up);
}

/**
 * Serialize a texture
 */
function serializeTexture(writer: BinaryWriter, texture: TunnelTexture): void {
  writer.writeInt32(texture.width);
  writer.writeInt32(texture.height);
  writer.writeBytes(texture.data);
}

/**
 * Serialize a tunnel item
 */
function serializeItem(writer: BinaryWriter, item: TunnelItem): void {
  writer.writeInt32(item.type);
  writer.writeInt32(item.splineIndex);
  writer.writeInt32(item.sectionNum);
  writer.writeFloat32(item.scale);
  writer.writeVector3D(item.rot);
  writer.writeVector3D(item.positionOffset);
  writer.writeUint32(item.flags);
  writer.writeUint32(item.parms[0]);
  writer.writeUint32(item.parms[1]);
  writer.writeUint32(item.parms[2]);
}

/**
 * Serialize a section mesh
 */
function serializeSectionMesh(
  writer: BinaryWriter,
  mesh: TunnelSectionMesh,
  includeNormals: boolean,
): void {
  writer.writeBoundingBox(mesh.bBox);
  writer.writeInt32(mesh.numPoints);
  writer.writeInt32(mesh.numTriangles);

  for (const point of mesh.points) {
    writer.writePoint3D(point);
  }

  if (includeNormals && mesh.normals) {
    for (const normal of mesh.normals) {
      writer.writeVector3D(normal);
    }
  }

  for (const uv of mesh.uvs) {
    writer.writeTextureCoord(uv);
  }

  for (const tri of mesh.triangles) {
    writer.writeTriangleIndices(tri);
  }
}

/**
 * Serialize a section
 */
function serializeSection(writer: BinaryWriter, section: TunnelSection): void {
  serializeSectionMesh(writer, section.tunnelMesh, true);
  serializeSectionMesh(writer, section.waterMesh, false);
}

/**
 * Serialize TunnelData to binary format
 *
 * @param data - The tunnel data to serialize
 * @returns Result containing the binary ArrayBuffer or an error
 */
export function serializeTunnelFile(
  data: TunnelData,
): Result<ArrayBuffer, Error> {
  // Use tryFn to convert BinaryWriter throws to Result
  const serializeResult = tryFn(() => {
    const writer = new BinaryWriter();

    // Write header (88 bytes)
    writer.writeUint16(data.header.versionMajor);
    writer.writeUint16(data.header.versionMinor);
    writer.writeBoolean(data.header.fullPipe);
    writer.writePadding(3); // alignment padding
    writer.writeInt32(data.header.numNubs);
    writer.writeInt32(data.header.numSplinePoints);
    writer.writeInt32(data.header.numSections);
    writer.writeInt32(data.header.numItems);
    writer.writePadding(64); // reserved fields (16 * int32)

    // Write alias data (empty for modern use)
    writer.writeInt32(0); // alias size = 0

    // Write spline nubs
    for (const nub of data.nubs) {
      serializeSplinePoint(writer, nub);
    }

    // Write tunnel texture
    serializeTexture(writer, data.tunnelTexture);

    // Write water texture
    serializeTexture(writer, data.waterTexture);

    // Write items
    for (const item of data.items) {
      serializeItem(writer, item);
    }

    // Write spline points
    for (const point of data.splinePoints) {
      serializeSplinePoint(writer, point);
    }

    // Write sections
    for (const section of data.sections) {
      serializeSection(writer, section);
    }

    return writer.getBuffer();
  });

  if (serializeResult.isErr()) {
    return err(
      new Error(
        `Failed to serialize tunnel file: ${serializeResult.error.message}`,
      ),
    );
  }

  return ok(serializeResult.value);
}
