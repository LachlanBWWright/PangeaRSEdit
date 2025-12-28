/**
 * 3DMF Writer - writes Apple QuickDraw 3D MetaFile format
 * Creates byte-accurate 3DMF files for roundtrip conversion
 */

import { Result, ok } from "../../types/result";
import { BigEndianWriter } from "./binaryUtils";
import {
  TQ3MetaFile,
  TQ3TriMeshData,
  TQ3TextureShader,
  ShaderUVBoundary,
  AttributeType,
  AttributeArrayPosition,
  CHUNK_3DMF,
  CHUNK_CNTR,
  CHUNK_BGNG,
  CHUNK_ENDG,
  CHUNK_TMSH,
  CHUNK_ATAR,
  CHUNK_ATTR,
  CHUNK_KDIF,
  CHUNK_KXPR,
  CHUNK_TXSU,
  CHUNK_TXMM,
  CHUNK_TXPM,
  CHUNK_SHDR,
} from "./types";

/**
 * Calculate the size of triangle indices based on vertex count
 */
function getTriangleIndicesSize(numVertices: number, numTriangles: number): number {
  if (numVertices <= 0xff) {
    return numTriangles * 3; // uint8
  } else if (numVertices <= 0xffff) {
    return numTriangles * 3 * 2; // uint16
  } else {
    return numTriangles * 3 * 4; // uint32
  }
}

/**
 * Write triangle vertex indices based on vertex count
 */
function writeTriangleVertexIndices(
  writer: BigEndianWriter,
  mesh: TQ3TriMeshData
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
    } else if (numVertices <= 0xffff) {
      writer.writeUint16(v0);
      writer.writeUint16(v1);
      writer.writeUint16(v2);
    } else {
      writer.writeUint32(v0);
      writer.writeUint32(v1);
      writer.writeUint32(v2);
    }
  }
}

/**
 * Calculate the size of a tmsh chunk's data (excluding chunk header)
 */
function calculateTmshSize(mesh: TQ3TriMeshData): number {
  // Header: 6 uint32s = 24 bytes
  // Triangles: variable based on vertex count
  // Vertices: numPoints * 3 floats = numPoints * 12 bytes
  // BBox: 6 floats + 1 uint32 = 28 bytes
  
  const triangleSize = getTriangleIndicesSize(mesh.numPoints, mesh.numTriangles);
  const vertexSize = mesh.numPoints * 12;
  const bboxSize = 28;
  
  return 24 + triangleSize + vertexSize + bboxSize;
}

/**
 * Calculate the size of an atar chunk's data (excluding chunk header)
 */
function calculateAtarSize(numElements: number, elementsPerItem: number): number {
  // Header: 5 uint32s = 20 bytes
  // Data: numElements * elementsPerItem * 4 bytes (float)
  return 20 + numElements * elementsPerItem * 4;
}

/**
 * Write a tmsh (TriMesh) chunk
 */
function writeTmshChunk(writer: BigEndianWriter, mesh: TQ3TriMeshData): void {
  const chunkSize = calculateTmshSize(mesh);
  
  // Write chunk header
  writer.writeUint32(CHUNK_TMSH);
  writer.writeUint32(chunkSize);
  
  // Write mesh header
  writer.writeUint32(mesh.numTriangles);
  
  // Count triangle attributes (face normals if present)
  const numTriangleAttributes = 0; // We don't write face normals
  writer.writeUint32(numTriangleAttributes);
  
  writer.writeUint32(0); // numEdges
  writer.writeUint32(0); // numEdgeAttributes
  writer.writeUint32(mesh.numPoints);
  
  // Count vertex attributes
  let numVertexAttributes = 0;
  if (mesh.vertexUVs) numVertexAttributes++;
  if (mesh.vertexNormals) numVertexAttributes++;
  if (mesh.vertexColors) numVertexAttributes++;
  writer.writeUint32(numVertexAttributes);
  
  // Write triangle indices
  writeTriangleVertexIndices(writer, mesh);
  
  // Write vertices
  for (let i = 0; i < mesh.numPoints; i++) {
    const point = mesh.points[i];
    if (point) {
      writer.writeFloat32(point.x);
      writer.writeFloat32(point.y);
      writer.writeFloat32(point.z);
    } else {
      writer.writeFloat32(0);
      writer.writeFloat32(0);
      writer.writeFloat32(0);
    }
  }
  
  // Write bounding box
  writer.writeFloat32(mesh.bBox.min.x);
  writer.writeFloat32(mesh.bBox.min.y);
  writer.writeFloat32(mesh.bBox.min.z);
  writer.writeFloat32(mesh.bBox.max.x);
  writer.writeFloat32(mesh.bBox.max.y);
  writer.writeFloat32(mesh.bBox.max.z);
  writer.writeUint32(mesh.bBox.isEmpty);
}

/**
 * Write an atar (AttributeArray) chunk for vertex UVs
 */
function writeAtarUVChunk(writer: BigEndianWriter, mesh: TQ3TriMeshData): void {
  if (!mesh.vertexUVs) return;
  
  const chunkSize = calculateAtarSize(mesh.numPoints, 2);
  
  writer.writeUint32(CHUNK_ATAR);
  writer.writeUint32(chunkSize);
  
  // Attribute header
  writer.writeUint32(AttributeType.ShadingUV);
  writer.writeUint32(0); // expected zero
  writer.writeUint32(AttributeArrayPosition.VertexAttribute);
  writer.writeUint32(0); // positionInArray
  writer.writeUint32(0); // attributeUseFlag
  
  // Write UVs - flip V coordinate back to 3DMF's bottom-left origin
  // (we flipped it during parsing for compatibility with other formats)
  for (let i = 0; i < mesh.numPoints; i++) {
    const uv = mesh.vertexUVs[i];
    if (uv) {
      writer.writeFloat32(uv.u);
      writer.writeFloat32(1 - uv.v);
    } else {
      writer.writeFloat32(0);
      writer.writeFloat32(0);
    }
  }
}

/**
 * Write an atar (AttributeArray) chunk for vertex normals
 */
function writeAtarNormalChunk(writer: BigEndianWriter, mesh: TQ3TriMeshData): void {
  if (!mesh.vertexNormals) return;
  
  const chunkSize = calculateAtarSize(mesh.numPoints, 3);
  
  writer.writeUint32(CHUNK_ATAR);
  writer.writeUint32(chunkSize);
  
  // Attribute header
  writer.writeUint32(AttributeType.Normal);
  writer.writeUint32(0); // expected zero
  writer.writeUint32(AttributeArrayPosition.VertexAttribute);
  writer.writeUint32(0); // positionInArray
  writer.writeUint32(0); // attributeUseFlag
  
  // Write normals
  for (let i = 0; i < mesh.numPoints; i++) {
    const normal = mesh.vertexNormals[i];
    if (normal) {
      writer.writeFloat32(normal.x);
      writer.writeFloat32(normal.y);
      writer.writeFloat32(normal.z);
    } else {
      writer.writeFloat32(0);
      writer.writeFloat32(0);
      writer.writeFloat32(1);
    }
  }
}

/**
 * Write an atar (AttributeArray) chunk for vertex colors
 */
function writeAtarColorChunk(writer: BigEndianWriter, mesh: TQ3TriMeshData): void {
  if (!mesh.vertexColors) return;
  
  const chunkSize = calculateAtarSize(mesh.numPoints, 3);
  
  writer.writeUint32(CHUNK_ATAR);
  writer.writeUint32(chunkSize);
  
  // Attribute header
  writer.writeUint32(AttributeType.DiffuseColor);
  writer.writeUint32(0); // expected zero
  writer.writeUint32(AttributeArrayPosition.VertexAttribute);
  writer.writeUint32(0); // positionInArray
  writer.writeUint32(0); // attributeUseFlag
  
  // Write colors (RGB only, alpha is handled by kxpr)
  for (let i = 0; i < mesh.numPoints; i++) {
    const color = mesh.vertexColors[i];
    if (color) {
      writer.writeFloat32(color.r);
      writer.writeFloat32(color.g);
      writer.writeFloat32(color.b);
    } else {
      writer.writeFloat32(1);
      writer.writeFloat32(1);
      writer.writeFloat32(1);
    }
  }
}

/**
 * Write a kdif (diffuse color) chunk
 */
function writeKdifChunk(writer: BigEndianWriter, mesh: TQ3TriMeshData): void {
  writer.writeUint32(CHUNK_KDIF);
  writer.writeUint32(12);
  
  writer.writeFloat32(mesh.diffuseColor.r);
  writer.writeFloat32(mesh.diffuseColor.g);
  writer.writeFloat32(mesh.diffuseColor.b);
}

/**
 * Write a kxpr (transparency color) chunk
 */
function writeKxprChunk(writer: BigEndianWriter, mesh: TQ3TriMeshData): void {
  // Only write if alpha is not 1.0
  if (mesh.diffuseColor.a === 1.0) return;
  
  writer.writeUint32(CHUNK_KXPR);
  writer.writeUint32(12);
  
  // 3DMF stores transparency as RGB (all same value)
  writer.writeFloat32(mesh.diffuseColor.a);
  writer.writeFloat32(mesh.diffuseColor.a);
  writer.writeFloat32(mesh.diffuseColor.a);
}

/**
 * Write texture chunks (txsu, txmm/txpm, shdr)
 */
function writeTextureChunks(
  writer: BigEndianWriter,
  shader: TQ3TextureShader,
  textureOffsets: Map<number, number>,
  textureIndex: number
): void {
  // Record offset for potential references
  textureOffsets.set(textureIndex, writer.tell());
  
  // txsu chunk (empty - just a marker)
  writer.writeUint32(CHUNK_TXSU);
  writer.writeUint32(0);
  
  // Write pixmap if present
  if (shader.pixmap) {
    const pixmap = shader.pixmap;
    
    // Determine if we should write txmm or txpm
    // For simplicity, always write txmm format
    const isMipmap = true;
    
    // Calculate the actual bytes per pixel from pixelSize
    const bytesPerPixel = pixmap.pixelSize / 8;
    
    // Calculate trimmed row bytes (actual data per row without padding)
    const trimmedRowBytes = pixmap.width * bytesPerPixel;
    
    // Calculate padded row bytes (4-byte aligned)
    const paddedRowBytes = (trimmedRowBytes + 3) & ~3;
    
    // Calculate image size (aligned to 4 bytes)
    let imageSize = paddedRowBytes * pixmap.height;
    if ((imageSize & 3) !== 0) {
      imageSize = (imageSize & 0xfffffffc) + 4;
    }
    
    // txmm header size is 8 uint32s = 32 bytes
    const chunkHeaderSize = isMipmap ? 32 : 28;
    const chunkSize = chunkHeaderSize + imageSize;
    
    if (isMipmap) {
      writer.writeUint32(CHUNK_TXMM);
      writer.writeUint32(chunkSize);
      
      writer.writeUint32(0); // useMipmapping
      writer.writeUint32(pixmap.pixelType);
      writer.writeUint32(pixmap.bitOrder);
      writer.writeUint32(pixmap.byteOrder);
      writer.writeUint32(pixmap.width);
      writer.writeUint32(pixmap.height);
      writer.writeUint32(paddedRowBytes); // Use the padded row bytes
      writer.writeUint32(0); // offset
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
    
    // Write image data with padding
    // The image data in pixmap.image might have been stored with a different row layout,
    // so we need to handle both the stored rowBytes and the output rowBytes
    const srcRowBytes = pixmap.rowBytes || trimmedRowBytes;
    const rowPadding = new Uint8Array(paddedRowBytes - trimmedRowBytes);
    
    let totalBytesWritten = 0;
    for (let y = 0; y < pixmap.height; y++) {
      // Get the source row from the image data
      const srcRowStart = y * srcRowBytes;
      const srcRowEnd = srcRowStart + Math.min(trimmedRowBytes, srcRowBytes);
      
      // Check bounds
      if (srcRowEnd <= pixmap.image.length) {
        const rowData = pixmap.image.slice(srcRowStart, srcRowEnd);
        writer.writeBytes(rowData);
        totalBytesWritten += rowData.length;
        
        // Add padding if trimmedRowBytes < srcRowBytes
        if (rowData.length < trimmedRowBytes) {
          const extraBytes = new Uint8Array(trimmedRowBytes - rowData.length);
          writer.writeBytes(extraBytes);
          totalBytesWritten += extraBytes.length;
        }
      } else {
        // Source image doesn't have this row, write zeros
        writer.writeBytes(new Uint8Array(trimmedRowBytes));
        totalBytesWritten += trimmedRowBytes;
      }
      
      // Add row padding for 4-byte alignment
      if (rowPadding.length > 0) {
        writer.writeBytes(rowPadding);
        totalBytesWritten += rowPadding.length;
      }
    }
    
    // Ensure imageSize is met with padding
    if (totalBytesWritten < imageSize) {
      writer.writeBytes(new Uint8Array(imageSize - totalBytesWritten));
    }
  }
  
  // Write shader UV boundary if not default
  if (shader.boundaryU !== ShaderUVBoundary.Wrap || 
      shader.boundaryV !== ShaderUVBoundary.Wrap) {
    writer.writeUint32(CHUNK_SHDR);
    writer.writeUint32(8);
    writer.writeUint32(shader.boundaryU);
    writer.writeUint32(shader.boundaryV);
  }
}

/**
 * Write a complete mesh with all its attributes as a container
 */
function writeMeshContainer(
  writer: BigEndianWriter,
  mesh: TQ3TriMeshData,
  textures: TQ3TextureShader[],
  textureOffsets: Map<number, number>
): void {
  // Calculate container size
  // This is complex because we need to know the size before writing
  // We'll write to a temporary buffer first
  
  const tempWriter = new BigEndianWriter();
  
  // Write tmsh
  writeTmshChunk(tempWriter, mesh);
  
  // Write attribute containers
  if (mesh.vertexUVs || mesh.vertexNormals || mesh.vertexColors) {
    // attr chunk (marker)
    tempWriter.writeUint32(CHUNK_ATTR);
    tempWriter.writeUint32(0);
    
    // Write attribute arrays
    writeAtarUVChunk(tempWriter, mesh);
    writeAtarNormalChunk(tempWriter, mesh);
    writeAtarColorChunk(tempWriter, mesh);
  }
  
  // Write diffuse color
  writeKdifChunk(tempWriter, mesh);
  
  // Write transparency if needed
  writeKxprChunk(tempWriter, mesh);
  
  // Write texture reference if mesh has texture
  if (mesh.internalTextureID >= 0 && mesh.internalTextureID < textures.length) {
    // For simplicity, write texture inline
    const shader = textures[mesh.internalTextureID];
    if (shader) {
      writeTextureChunks(tempWriter, shader, textureOffsets, mesh.internalTextureID);
    }
  }
  
  const containerData = tempWriter.getBuffer();
  
  // Now write the actual container
  writer.writeUint32(CHUNK_CNTR);
  writer.writeUint32(containerData.byteLength);
  writer.writeBytes(new Uint8Array(containerData));
}

/**
 * Write a 3DMF file from a TQ3MetaFile structure
 * @param metaFile The parsed 3DMF data structure
 * @returns Result<ArrayBuffer, Error> The 3DMF file as an ArrayBuffer
 */
export function write3DMFFromMetaFile(metaFile: TQ3MetaFile): Result<ArrayBuffer, Error> {
  const writer = new BigEndianWriter(1024 * 1024); // 1MB initial capacity (grows dynamically)
  const textureOffsets = new Map<number, number>();
  
  // Write 3DMF header
  writer.writeUint32(CHUNK_3DMF);
  writer.writeUint32(16); // header length
  writer.writeUint16(1);  // version major
  writer.writeUint16(5);  // version minor (using 1.5)
  writer.writeUint32(0);  // flags
  writer.writeUint64(0);  // TOC offset (no TOC for simple files)
  
  // Write all groups
  for (let groupIdx = 0; groupIdx < metaFile.numTopLevelGroups; groupIdx++) {
    const group = metaFile.topLevelGroups[groupIdx];
    if (!group) continue;
    
    // Use bgng/endg for groups
    writer.writeUint32(CHUNK_BGNG);
    
    // Calculate group size (we need to write placeholder and come back)
    const groupSizePos = writer.tell();
    writer.writeUint32(0); // placeholder for size
    
    // Skip the bgng internal data (dspg, dgst)
    // For simplicity, write minimal bgng data
    
    // Write each mesh in the group
    for (let meshIdx = 0; meshIdx < group.numMeshes; meshIdx++) {
      const mesh = group.meshes[meshIdx];
      if (!mesh) continue;
      
      writeMeshContainer(writer, mesh, metaFile.textures, textureOffsets);
    }
    
    // Write endg
    writer.writeUint32(CHUNK_ENDG);
    writer.writeUint32(0);
    
    // Note: bgng size typically just covers internal metadata, not children
    // For strict compatibility, we'd need to match the original file's structure
    // For now, use 0 as Pomme does for simple groups
    const savedPos = writer.tell();
    writer.goto(groupSizePos);
    writer.writeUint32(0); // bgng internal data size is 0
    writer.goto(savedPos);
  }
  
  // If no groups but we have meshes, write them directly
  if (metaFile.numTopLevelGroups === 0 && metaFile.numMeshes > 0) {
    for (let meshIdx = 0; meshIdx < metaFile.numMeshes; meshIdx++) {
      const mesh = metaFile.meshes[meshIdx];
      if (!mesh) continue;
      
      writeMeshContainer(writer, mesh, metaFile.textures, textureOffsets);
    }
  }
  
  return ok(writer.getBuffer());
}
