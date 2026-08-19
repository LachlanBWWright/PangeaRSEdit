/**
 * Bugdom 2 Tunnel Level (.tun) Binary Parser
 *
 * Parses tunnel files stored as binary data fork (not resource fork).
 * Based on games/bugdom2/Source/System/File.c LoadTunnel function.
 */

import { mapErr } from "@/utils/mapErr";
import { Result, ok, err } from "neverthrow";
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

  remainingBytes(): number {
    return this.view.byteLength - this.offset;
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
    const min = this.readPoint3D();
    const max = this.readPoint3D();
    const isEmpty = this.readBoolean();
    this.skip(3); // 3-byte padding to align to 4-byte boundaries (C struct alignment)
    return { min, max, isEmpty };
  }

  readBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(
      this.view.buffer.slice(this.offset, this.offset + length),
    );
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

  if (width <= 0 || height <= 0) {
    return {
      width,
      height,
      data: new Uint8Array(0),
    };
  }

  if (width > 8192 || height > 8192) {
    return {
      width,
      height,
      data: new Uint8Array(0),
    };
  }

  const dataSize = width * height * 4;
  if (dataSize > reader.remainingBytes()) {
    return {
      width,
      height,
      data: new Uint8Array(0),
    };
  }
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

function validateTexture(
  texture: TunnelTexture,
  textureName: string,
): Result<null, string> {
  if (texture.width <= 0 || texture.height <= 0) {
    return err(
      `Invalid ${textureName} dimensions: ${texture.width}x${texture.height}`,
    );
  }

  if (texture.width > 8192 || texture.height > 8192) {
    return err(
      `Invalid ${textureName} dimensions: ${texture.width}x${texture.height} exceeds 8192`,
    );
  }

  const expectedSize = texture.width * texture.height * 4;
  if (texture.data.length !== expectedSize) {
    return err(
      `Invalid ${textureName} byte length: expected ${expectedSize}, got ${texture.data.length}`,
    );
  }

  return ok(null);
}

function validateSectionMesh(
  mesh: TunnelSectionMesh,
  includeNormals: boolean,
  sectionIndex: number,
  meshLabel: "tunnel" | "water",
): Result<null, string> {
  if (mesh.numPoints < 0 || mesh.numTriangles < 0) {
    return err(
      `Section ${sectionIndex} ${meshLabel} mesh has negative counts (points=${mesh.numPoints}, triangles=${mesh.numTriangles})`,
    );
  }

  if (mesh.points.length !== mesh.numPoints) {
    return err(
      `Section ${sectionIndex} ${meshLabel} point mismatch: expected ${mesh.numPoints}, got ${mesh.points.length}`,
    );
  }

  if (mesh.uvs.length !== mesh.numPoints) {
    return err(
      `Section ${sectionIndex} ${meshLabel} UV mismatch: expected ${mesh.numPoints}, got ${mesh.uvs.length}`,
    );
  }

  if (mesh.triangles.length !== mesh.numTriangles) {
    return err(
      `Section ${sectionIndex} ${meshLabel} triangle mismatch: expected ${mesh.numTriangles}, got ${mesh.triangles.length}`,
    );
  }

  const normalsLength = mesh.normals?.length ?? 0;
  if (includeNormals && normalsLength !== mesh.numPoints) {
    return err(
      `Section ${sectionIndex} ${meshLabel} normal mismatch: expected ${mesh.numPoints}, got ${normalsLength}`,
    );
  }

  for (
    let triangleIndex = 0;
    triangleIndex < mesh.triangles.length;
    triangleIndex++
  ) {
    const triangle = mesh.triangles[triangleIndex];
    if (!triangle) {
      return err(
        `Section ${sectionIndex} ${meshLabel} triangle ${triangleIndex} missing`,
      );
    }

    if (triangle.a >= mesh.numPoints) {
      return err(
        `Section ${sectionIndex} ${meshLabel} triangle ${triangleIndex} has out-of-range index ${triangle.a} for ${mesh.numPoints} points`,
      );
    }

    if (triangle.b >= mesh.numPoints) {
      return err(
        `Section ${sectionIndex} ${meshLabel} triangle ${triangleIndex} has out-of-range index ${triangle.b} for ${mesh.numPoints} points`,
      );
    }

    if (triangle.c >= mesh.numPoints) {
      return err(
        `Section ${sectionIndex} ${meshLabel} triangle ${triangleIndex} has out-of-range index ${triangle.c} for ${mesh.numPoints} points`,
      );
    }
  }

  return ok(null);
}

/**
 * Parse a Bugdom 2 tunnel file (.tun)
 *
 * @param buffer - The raw binary data from the .tun file
 * @returns Result containing the parsed TunnelData or an error
 */
export function parseTunnelFile(
  buffer: ArrayBuffer,
): Result<TunnelData, string> {
  if (buffer.byteLength < 92) {
    return err(
      `File too small: ${buffer.byteLength} bytes (minimum 92 bytes required for header)`,
    );
  }

  const reader = new BinaryReader(buffer);

  const headerResult = Result.fromThrowable(
    () => parseHeader(reader),
    mapErr,
  )();
  if (headerResult.isErr()) {
    return err(`Failed to parse tunnel file header: ${headerResult.error}`);
  }
  const header = headerResult.value;

  const aliasSizeResult = Result.fromThrowable(
    () => reader.readInt32(),
    mapErr,
  )();
  if (aliasSizeResult.isErr()) {
    return err(`Failed to parse alias size: ${aliasSizeResult.error}`);
  }
  const aliasSize = aliasSizeResult.value;

  if (aliasSize < 0) {
    return err(`Invalid alias size: ${aliasSize}`);
  }

  if (aliasSize > reader.remainingBytes()) {
    return err(
      `Invalid alias size: ${aliasSize} exceeds remaining bytes ${reader.remainingBytes()}`,
    );
  }

  const aliasDataResult = Result.fromThrowable(
    () => reader.readBytes(aliasSize),
    mapErr,
  )();
  if (aliasDataResult.isErr()) {
    return err(`Failed to parse alias data: ${aliasDataResult.error}`);
  }
  const aliasData = aliasDataResult.value;

  const nubs: TunnelSplinePoint[] = [];
  for (let i = 0; i < header.numNubs; i++) {
    const nubResult = Result.fromThrowable(
      () => parseSplinePoint(reader),
      mapErr,
    )();
    if (nubResult.isErr()) {
      return err(`Failed to parse nub ${i}: ${nubResult.error}`);
    }
    nubs.push(nubResult.value);
  }

  const tunnelTextureResult = Result.fromThrowable(
    () => parseTexture(reader),
    mapErr,
  )();
  if (tunnelTextureResult.isErr()) {
    return err(`Failed to parse tunnel texture: ${tunnelTextureResult.error}`);
  }
  const tunnelTexture = tunnelTextureResult.value;

  const waterTextureResult = Result.fromThrowable(
    () => parseTexture(reader),
    mapErr,
  )();
  if (waterTextureResult.isErr()) {
    return err(`Failed to parse water texture: ${waterTextureResult.error}`);
  }
  const waterTexture = waterTextureResult.value;

  const items: TunnelItem[] = [];
  for (let i = 0; i < header.numItems; i++) {
    const itemResult = Result.fromThrowable(() => parseItem(reader), mapErr)();
    if (itemResult.isErr()) {
      return err(`Failed to parse item ${i}: ${itemResult.error}`);
    }
    items.push(itemResult.value);
  }

  const splinePoints: TunnelSplinePoint[] = [];
  for (let i = 0; i < header.numSplinePoints; i++) {
    const splinePointResult = Result.fromThrowable(
      () => parseSplinePoint(reader),
      mapErr,
    )();
    if (splinePointResult.isErr()) {
      return err(
        `Failed to parse spline point ${i}: ${splinePointResult.error}`,
      );
    }
    splinePoints.push(splinePointResult.value);
  }

  const sections: TunnelSection[] = [];
  for (let i = 0; i < header.numSections; i++) {
    const sectionResult = Result.fromThrowable(
      () => parseSection(reader),
      mapErr,
    )();
    if (sectionResult.isErr()) {
      return err(`Failed to parse section ${i}: ${sectionResult.error}`);
    }
    sections.push(sectionResult.value);
  }

  const tunnelData: TunnelData = {
    header,
    aliasData,
    nubs,
    tunnelTexture,
    waterTexture,
    items,
    splinePoints,
    sections,
  };

  // Validate header values
  if (
    tunnelData.header.numNubs < 0 ||
    tunnelData.header.numSplinePoints < 0 ||
    tunnelData.header.numSections < 0 ||
    tunnelData.header.numItems < 0
  ) {
    return err(
      `Invalid header: negative counts (nubs=${tunnelData.header.numNubs}, splinePoints=${tunnelData.header.numSplinePoints}, sections=${tunnelData.header.numSections}, items=${tunnelData.header.numItems})`,
    );
  }

  if (tunnelData.nubs.length !== tunnelData.header.numNubs) {
    return err(
      `Invalid nub count: expected ${tunnelData.header.numNubs}, got ${tunnelData.nubs.length}`,
    );
  }

  if (tunnelData.splinePoints.length !== tunnelData.header.numSplinePoints) {
    return err(
      `Invalid spline point count: expected ${tunnelData.header.numSplinePoints}, got ${tunnelData.splinePoints.length}`,
    );
  }

  if (tunnelData.sections.length !== tunnelData.header.numSections) {
    return err(
      `Invalid section count: expected ${tunnelData.header.numSections}, got ${tunnelData.sections.length}`,
    );
  }

  if (tunnelData.items.length !== tunnelData.header.numItems) {
    return err(
      `Invalid item count: expected ${tunnelData.header.numItems}, got ${tunnelData.items.length}`,
    );
  }

  const tunnelTextureValidation = validateTexture(
    tunnelData.tunnelTexture,
    "tunnel texture",
  );
  if (tunnelTextureValidation.isErr()) {
    return err(tunnelTextureValidation.error);
  }

  const waterTextureValidation = validateTexture(
    tunnelData.waterTexture,
    "water texture",
  );
  if (waterTextureValidation.isErr()) {
    return err(waterTextureValidation.error);
  }

  for (
    let sectionIndex = 0;
    sectionIndex < tunnelData.sections.length;
    sectionIndex++
  ) {
    const section = tunnelData.sections[sectionIndex];
    if (!section) {
      return err(`Missing section at index ${sectionIndex}`);
    }

    const tunnelMeshValidation = validateSectionMesh(
      section.tunnelMesh,
      true,
      sectionIndex,
      "tunnel",
    );
    if (tunnelMeshValidation.isErr()) {
      return err(tunnelMeshValidation.error);
    }

    const waterMeshValidation = validateSectionMesh(
      section.waterMesh,
      false,
      sectionIndex,
      "water",
    );
    if (waterMeshValidation.isErr()) {
      return err(waterMeshValidation.error);
    }
  }

  for (let itemIndex = 0; itemIndex < tunnelData.items.length; itemIndex++) {
    const item = tunnelData.items[itemIndex];
    if (!item) {
      return err(`Missing item at index ${itemIndex}`);
    }

    if (
      item.splineIndex < 0 ||
      item.splineIndex >= tunnelData.splinePoints.length
    ) {
      return err(
        `Item ${itemIndex} has invalid splineIndex ${item.splineIndex} (spline points=${tunnelData.splinePoints.length})`,
      );
    }

    if (item.sectionNum < -1 || item.sectionNum >= tunnelData.sections.length) {
      return err(
        `Item ${itemIndex} has invalid sectionNum ${item.sectionNum} (valid range -1..${Math.max(-1, tunnelData.sections.length - 1)})`,
      );
    }
  }

  return ok(tunnelData);
}
