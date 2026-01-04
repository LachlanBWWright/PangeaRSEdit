/**
 * Bugdom 2 Tunnel Level (.tun) Binary Parser
 *
 * Parses tunnel files stored as binary data fork (not resource fork).
 * Based on games/bugdom2/Source/System/File.c LoadTunnel function.
 */

import type { Result } from "@/types/result";
import { ok, err } from "@/types/result";
import type {
  TunnelData,
  TunnelHeader,
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
 * Binary reader helper for big-endian data
 */
class BinaryReader {
  private view: DataView;
  private offset: number;

  constructor(buffer: ArrayBuffer) {
    this.view = new DataView(buffer);
    this.offset = 0;
  }

  getOffset(): number {
    return this.offset;
  }

  setOffset(offset: number): void {
    this.offset = offset;
  }

  skip(bytes: number): void {
    this.offset += bytes;
  }

  readUint8(): number {
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  readUint16(): number {
    const value = this.view.getUint16(this.offset, false); // big-endian
    this.offset += 2;
    return value;
  }

  readInt32(): number {
    const value = this.view.getInt32(this.offset, false); // big-endian
    this.offset += 4;
    return value;
  }

  readUint32(): number {
    const value = this.view.getUint32(this.offset, false); // big-endian
    this.offset += 4;
    return value;
  }

  readFloat32(): number {
    const value = this.view.getFloat32(this.offset, false); // big-endian
    this.offset += 4;
    return value;
  }

  readBoolean(): boolean {
    return this.readUint8() !== 0;
  }

  readPoint3D(): Point3D {
    return {
      x: this.readFloat32(),
      y: this.readFloat32(),
      z: this.readFloat32(),
    };
  }

  readVector3D(): Vector3D {
    return {
      x: this.readFloat32(),
      y: this.readFloat32(),
      z: this.readFloat32(),
    };
  }

  readTextureCoord(): TextureCoord {
    return {
      u: this.readFloat32(),
      v: this.readFloat32(),
    };
  }

  readTriangleIndices(): TriangleIndices {
    return {
      a: this.readUint32(),
      b: this.readUint32(),
      c: this.readUint32(),
    };
  }

  readBoundingBox(): BoundingBox {
    return {
      min: this.readPoint3D(),
      max: this.readPoint3D(),
    };
  }

  readBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(this.view.buffer.slice(this.offset, this.offset + length));
    this.offset += length;
    return bytes;
  }

  hasRemaining(): boolean {
    return this.offset < this.view.byteLength;
  }
}

/**
 * Parse tunnel file header
 */
function parseHeader(reader: BinaryReader): TunnelHeader {
  const versionMajor = reader.readUint16();
  const versionMinor = reader.readUint16();
  const fullPipe = reader.readBoolean();
  reader.skip(3); // alignment padding
  const numNubs = reader.readInt32();
  const numSplinePoints = reader.readInt32();
  const numSections = reader.readInt32();
  const numItems = reader.readInt32();
  reader.skip(64); // reserved fields (16 * int32)

  return {
    versionMajor,
    versionMinor,
    fullPipe,
    numNubs,
    numSplinePoints,
    numSections,
    numItems,
  };
}

/**
 * Parse a spline point (nub or interpolated)
 */
function parseSplinePoint(reader: BinaryReader): TunnelSplinePoint {
  return {
    point: reader.readPoint3D(),
    up: reader.readVector3D(),
  };
}

/**
 * Parse embedded RGBA texture
 */
function parseTexture(reader: BinaryReader): TunnelTexture {
  const width = reader.readInt32();
  const height = reader.readInt32();
  const dataSize = width * height * 4;
  const data = reader.readBytes(dataSize);

  return {
    width,
    height,
    data: new Uint8Array(data),
  };
}

/**
 * Parse a tunnel item
 */
function parseItem(reader: BinaryReader): TunnelItem {
  const type = reader.readInt32();
  const splineIndex = reader.readInt32();
  const sectionNum = reader.readInt32();
  const scale = reader.readFloat32();
  const rot = reader.readVector3D();
  const positionOffset = reader.readVector3D();
  const flags = reader.readUint32();
  const parms: [number, number, number] = [
    reader.readUint32(),
    reader.readUint32(),
    reader.readUint32(),
  ];

  return {
    type,
    splineIndex,
    sectionNum,
    scale,
    rot,
    positionOffset,
    flags,
    parms,
  };
}

/**
 * Parse a section mesh (tunnel or water)
 */
function parseSectionMesh(
  reader: BinaryReader,
  includeNormals: boolean,
): TunnelSectionMesh {
  const bBox = reader.readBoundingBox();
  const numPoints = reader.readInt32();
  const numTriangles = reader.readInt32();

  const points: Point3D[] = [];
  for (let i = 0; i < numPoints; i++) {
    points.push(reader.readPoint3D());
  }

  let normals: Vector3D[] | undefined;
  if (includeNormals) {
    normals = [];
    for (let i = 0; i < numPoints; i++) {
      normals.push(reader.readVector3D());
    }
  }

  const uvs: TextureCoord[] = [];
  for (let i = 0; i < numPoints; i++) {
    uvs.push(reader.readTextureCoord());
  }

  const triangles: TriangleIndices[] = [];
  for (let i = 0; i < numTriangles; i++) {
    triangles.push(reader.readTriangleIndices());
  }

  return {
    bBox,
    numPoints,
    numTriangles,
    points,
    normals,
    uvs,
    triangles,
  };
}

/**
 * Parse a complete tunnel section (tunnel mesh + water mesh)
 */
function parseSection(reader: BinaryReader): TunnelSection {
  const tunnelMesh = parseSectionMesh(reader, true);
  const waterMesh = parseSectionMesh(reader, false);

  return {
    tunnelMesh,
    waterMesh,
  };
}

/**
 * Parse a Bugdom 2 tunnel file (.tun)
 *
 * @param buffer - The raw binary data from the .tun file
 * @returns Result containing the parsed TunnelData or an error
 */
export function parseTunnelFile(buffer: ArrayBuffer): Result<TunnelData, Error> {
  try {
    const reader = new BinaryReader(buffer);

    // Parse header (88 bytes)
    const header = parseHeader(reader);

    // Skip alias data (legacy Mac file alias)
    const aliasSize = reader.readInt32();
    reader.skip(aliasSize);

    // Parse spline nubs (control points)
    const nubs: TunnelSplinePoint[] = [];
    for (let i = 0; i < header.numNubs; i++) {
      nubs.push(parseSplinePoint(reader));
    }

    // Parse tunnel texture
    const tunnelTexture = parseTexture(reader);

    // Parse water texture (currently not used but must be read)
    const waterTexture = parseTexture(reader);

    // Parse items
    const items: TunnelItem[] = [];
    for (let i = 0; i < header.numItems; i++) {
      items.push(parseItem(reader));
    }

    // Parse spline points
    const splinePoints: TunnelSplinePoint[] = [];
    for (let i = 0; i < header.numSplinePoints; i++) {
      splinePoints.push(parseSplinePoint(reader));
    }

    // Parse section geometry
    const sections: TunnelSection[] = [];
    for (let i = 0; i < header.numSections; i++) {
      sections.push(parseSection(reader));
    }

    return ok({
      header,
      nubs,
      tunnelTexture,
      waterTexture,
      items,
      splinePoints,
      sections,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return err(new Error(`Failed to parse tunnel file: ${message}`));
  }
}
