import { BigEndianWriter } from "./binaryUtils";
import {
  AttributeArrayPosition,
  AttributeType,
  CHUNK_ATAR,
  CHUNK_ATTR,
  CHUNK_CNTR,
  CHUNK_KDIF,
  CHUNK_KXPR,
  CHUNK_SHDR,
  CHUNK_TMSH,
  CHUNK_TXMM,
  CHUNK_TXPM,
  CHUNK_TXSU,
  ShaderUVBoundary,
  TQ3TextureShader,
  TQ3TriMeshData,
} from "./types";

function getTriangleIndicesSize(
  numVertices: number,
  numTriangles: number,
): number {
  if (numVertices <= 0xff) return numTriangles * 3;
  if (numVertices <= 0xffff) return numTriangles * 6;
  return numTriangles * 12;
}

function writeTriangleVertexIndices(
  writer: BigEndianWriter,
  mesh: TQ3TriMeshData,
): void {
  const numVertices = mesh.numPoints;
  for (let i = 0; i < mesh.numTriangles; i++) {
    const tri = mesh.triangles[i];
    if (!tri) continue;
    const [v0, v1, v2] = tri.pointIndices;
    if (numVertices <= 0xff) {
      writer.writeUint8(v0);
      writer.writeUint8(v1);
      writer.writeUint8(v2);
      continue;
    }
    if (numVertices <= 0xffff) {
      writer.writeUint16(v0);
      writer.writeUint16(v1);
      writer.writeUint16(v2);
      continue;
    }
    writer.writeUint32(v0);
    writer.writeUint32(v1);
    writer.writeUint32(v2);
  }
}

function calculateTmshSize(mesh: TQ3TriMeshData): number {
  const triangleSize = getTriangleIndicesSize(
    mesh.numPoints,
    mesh.numTriangles,
  );
  const vertexSize = mesh.numPoints * 12;
  const bboxSize = 28;
  return 24 + triangleSize + vertexSize + bboxSize;
}

function calculateAtarSize(
  numElements: number,
  elementsPerItem: number,
): number {
  return 20 + numElements * elementsPerItem * 4;
}

function writeTmshChunk(writer: BigEndianWriter, mesh: TQ3TriMeshData): void {
  writer.writeUint32(CHUNK_TMSH);
  writer.writeUint32(calculateTmshSize(mesh));
  writer.writeUint32(mesh.numTriangles);
  writer.writeUint32(0);
  writer.writeUint32(0);
  writer.writeUint32(0);
  writer.writeUint32(mesh.numPoints);

  let numVertexAttributes = 0;
  if (mesh.vertexUVs) numVertexAttributes++;
  if (mesh.vertexNormals) numVertexAttributes++;
  if (mesh.vertexColors) numVertexAttributes++;
  writer.writeUint32(numVertexAttributes);

  writeTriangleVertexIndices(writer, mesh);

  for (let i = 0; i < mesh.numPoints; i++) {
    const point = mesh.points[i];
    if (!point) {
      writer.writeFloat32(0);
      writer.writeFloat32(0);
      writer.writeFloat32(0);
      continue;
    }
    writer.writeFloat32(point.x);
    writer.writeFloat32(point.y);
    writer.writeFloat32(point.z);
  }

  writer.writeFloat32(mesh.bBox.min.x);
  writer.writeFloat32(mesh.bBox.min.y);
  writer.writeFloat32(mesh.bBox.min.z);
  writer.writeFloat32(mesh.bBox.max.x);
  writer.writeFloat32(mesh.bBox.max.y);
  writer.writeFloat32(mesh.bBox.max.z);
  writer.writeUint32(mesh.bBox.isEmpty);
}

function writeAtarUVChunk(writer: BigEndianWriter, mesh: TQ3TriMeshData): void {
  if (!mesh.vertexUVs) return;
  writer.writeUint32(CHUNK_ATAR);
  writer.writeUint32(calculateAtarSize(mesh.numPoints, 2));
  writer.writeUint32(AttributeType.ShadingUV);
  writer.writeUint32(0);
  writer.writeUint32(AttributeArrayPosition.VertexAttribute);
  writer.writeUint32(0);
  writer.writeUint32(0);

  for (let i = 0; i < mesh.numPoints; i++) {
    const uv = mesh.vertexUVs[i];
    if (!uv) {
      writer.writeFloat32(0);
      writer.writeFloat32(0);
      continue;
    }
    writer.writeFloat32(uv.u);
    writer.writeFloat32(1 - uv.v);
  }
}

function writeAtarNormalChunk(
  writer: BigEndianWriter,
  mesh: TQ3TriMeshData,
): void {
  if (!mesh.vertexNormals) return;
  writer.writeUint32(CHUNK_ATAR);
  writer.writeUint32(calculateAtarSize(mesh.numPoints, 3));
  writer.writeUint32(AttributeType.Normal);
  writer.writeUint32(0);
  writer.writeUint32(AttributeArrayPosition.VertexAttribute);
  writer.writeUint32(0);
  writer.writeUint32(0);

  for (let i = 0; i < mesh.numPoints; i++) {
    const normal = mesh.vertexNormals[i];
    if (!normal) {
      writer.writeFloat32(0);
      writer.writeFloat32(0);
      writer.writeFloat32(1);
      continue;
    }
    writer.writeFloat32(normal.x);
    writer.writeFloat32(normal.y);
    writer.writeFloat32(normal.z);
  }
}

function writeAtarColorChunk(
  writer: BigEndianWriter,
  mesh: TQ3TriMeshData,
): void {
  if (!mesh.vertexColors) return;
  writer.writeUint32(CHUNK_ATAR);
  writer.writeUint32(calculateAtarSize(mesh.numPoints, 3));
  writer.writeUint32(AttributeType.DiffuseColor);
  writer.writeUint32(0);
  writer.writeUint32(AttributeArrayPosition.VertexAttribute);
  writer.writeUint32(0);
  writer.writeUint32(0);

  for (let i = 0; i < mesh.numPoints; i++) {
    const color = mesh.vertexColors[i];
    if (!color) {
      writer.writeFloat32(1);
      writer.writeFloat32(1);
      writer.writeFloat32(1);
      continue;
    }
    writer.writeFloat32(color.r);
    writer.writeFloat32(color.g);
    writer.writeFloat32(color.b);
  }
}

function writeKdifChunk(writer: BigEndianWriter, mesh: TQ3TriMeshData): void {
  writer.writeUint32(CHUNK_KDIF);
  writer.writeUint32(12);
  writer.writeFloat32(mesh.diffuseColor.r);
  writer.writeFloat32(mesh.diffuseColor.g);
  writer.writeFloat32(mesh.diffuseColor.b);
}

function writeKxprChunk(writer: BigEndianWriter, mesh: TQ3TriMeshData): void {
  if (mesh.diffuseColor.a === 1.0) return;
  writer.writeUint32(CHUNK_KXPR);
  writer.writeUint32(12);
  writer.writeFloat32(mesh.diffuseColor.a);
  writer.writeFloat32(mesh.diffuseColor.a);
  writer.writeFloat32(mesh.diffuseColor.a);
}

function writeTextureChunks(
  writer: BigEndianWriter,
  shader: TQ3TextureShader,
  textureOffsets: Map<number, number>,
  textureIndex: number,
): void {
  textureOffsets.set(textureIndex, writer.tell());
  writer.writeUint32(CHUNK_TXSU);
  writer.writeUint32(0);

  if (shader.pixmap) {
    const pixmap = shader.pixmap;
    const isMipmap = true;
    const bytesPerPixel = pixmap.pixelSize / 8;
    const trimmedRowBytes = pixmap.width * bytesPerPixel;
    const paddedRowBytes = (trimmedRowBytes + 3) & ~3;

    let imageSize = paddedRowBytes * pixmap.height;
    if ((imageSize & 3) !== 0) imageSize = (imageSize & 0xfffffffc) + 4;

    const chunkHeaderSize = isMipmap ? 32 : 28;
    const chunkSize = chunkHeaderSize + imageSize;

    if (isMipmap) {
      writer.writeUint32(CHUNK_TXMM);
      writer.writeUint32(chunkSize);
      writer.writeUint32(0);
      writer.writeUint32(pixmap.pixelType);
      writer.writeUint32(pixmap.bitOrder);
      writer.writeUint32(pixmap.byteOrder);
      writer.writeUint32(pixmap.width);
      writer.writeUint32(pixmap.height);
      writer.writeUint32(paddedRowBytes);
      writer.writeUint32(0);
    } else {
      writer.writeUint32(CHUNK_TXPM);
      writer.writeUint32(chunkSize);
      writer.writeUint32(pixmap.width);
      writer.writeUint32(pixmap.height);
      writer.writeUint32(paddedRowBytes);
      writer.writeUint32(pixmap.pixelSize);
      writer.writeUint32(pixmap.pixelType);
      writer.writeUint32(pixmap.bitOrder);
      writer.writeUint32(pixmap.byteOrder);
    }

    const srcRowBytes = pixmap.rowBytes || trimmedRowBytes;
    const rowPadding = new Uint8Array(paddedRowBytes - trimmedRowBytes);

    let totalBytesWritten = 0;
    for (let y = 0; y < pixmap.height; y++) {
      const srcRowStart = y * srcRowBytes;
      const srcRowEnd = srcRowStart + Math.min(trimmedRowBytes, srcRowBytes);

      if (srcRowEnd <= pixmap.image.length) {
        const rowData = pixmap.image.slice(srcRowStart, srcRowEnd);
        writer.writeBytes(rowData);
        totalBytesWritten += rowData.length;

        if (rowData.length < trimmedRowBytes) {
          const extraBytes = new Uint8Array(trimmedRowBytes - rowData.length);
          writer.writeBytes(extraBytes);
          totalBytesWritten += extraBytes.length;
        }
      } else {
        writer.writeBytes(new Uint8Array(trimmedRowBytes));
        totalBytesWritten += trimmedRowBytes;
      }

      if (rowPadding.length > 0) {
        writer.writeBytes(rowPadding);
        totalBytesWritten += rowPadding.length;
      }
    }

    if (totalBytesWritten < imageSize) {
      writer.writeBytes(new Uint8Array(imageSize - totalBytesWritten));
    }
  }

  if (
    shader.boundaryU !== ShaderUVBoundary.Wrap ||
    shader.boundaryV !== ShaderUVBoundary.Wrap
  ) {
    writer.writeUint32(CHUNK_SHDR);
    writer.writeUint32(8);
    writer.writeUint32(shader.boundaryU);
    writer.writeUint32(shader.boundaryV);
  }
}

export function writeMeshContainer(
  writer: BigEndianWriter,
  mesh: TQ3TriMeshData,
  textures: TQ3TextureShader[],
  textureOffsets: Map<number, number>,
): void {
  const tempWriter = new BigEndianWriter();
  writeTmshChunk(tempWriter, mesh);

  if (mesh.vertexUVs || mesh.vertexNormals || mesh.vertexColors) {
    tempWriter.writeUint32(CHUNK_ATTR);
    tempWriter.writeUint32(0);
    writeAtarUVChunk(tempWriter, mesh);
    writeAtarNormalChunk(tempWriter, mesh);
    writeAtarColorChunk(tempWriter, mesh);
  }

  writeKdifChunk(tempWriter, mesh);
  writeKxprChunk(tempWriter, mesh);

  if (mesh.internalTextureID >= 0 && mesh.internalTextureID < textures.length) {
    const shader = textures[mesh.internalTextureID];
    if (shader) {
      writeTextureChunks(
        tempWriter,
        shader,
        textureOffsets,
        mesh.internalTextureID,
      );
    }
  }

  const containerData = tempWriter.getBuffer();
  writer.writeUint32(CHUNK_CNTR);
  writer.writeUint32(containerData.byteLength);
  writer.writeBytes(new Uint8Array(containerData));
}
