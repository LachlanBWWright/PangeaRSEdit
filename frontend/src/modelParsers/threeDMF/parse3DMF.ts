/**
 * 3DMF Parser - parses Apple QuickDraw 3D MetaFile format
 * Based on Pomme's 3DMFParser.cpp implementation
 * https://github.com/jorio/Pomme/blob/master/src/QD3D/3DMFParser.cpp
 */

import { Result, ok, err } from "neverthrow";
import { BigEndianReader } from "./binaryUtils";
import {
  TQ3MetaFile,
  TQ3TriMeshData,
  TQ3TriMeshFlatGroup,
  TQ3TextureShader,
  TQ3Pixmap,
  TQ3TriMeshTriangleData,
  TOCEntry,
  AttributeType,
  AttributeArrayPosition,
  PixelType,
  Endian,
  ShaderUVBoundary,
  TexturingMode,
  TQ3Boolean,
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
  CHUNK_RFRN,
  CHUNK_TOC,
  fourCCToString,
} from "./types";

function isShaderUVBoundary(value: number): value is ShaderUVBoundary {
  return value === ShaderUVBoundary.Wrap || value === ShaderUVBoundary.Clamp;
}

/**
 * Parser state for 3DMF files
 */
interface ParserState {
  reader: BigEndianReader;
  metaFile: TQ3MetaFile;
  currentDepth: number;
  currentMesh: TQ3TriMeshData | null;
  referenceTOC: Map<number, TOCEntry>;
  knownTextures: Map<number, number>;
}

/**
 * Create a new TriMesh data structure
 */
function createTriMeshData(numTriangles: number, numPoints: number): TQ3TriMeshData {
  return {
    numTriangles,
    triangles: new Array(numTriangles).fill(null).map(() => ({ pointIndices: [0, 0, 0] })),
    numPoints,
    points: new Array(numPoints).fill(null).map(() => ({ x: 0, y: 0, z: 0 })),
    vertexNormals: null,
    vertexUVs: null,
    vertexColors: null,
    bBox: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
      isEmpty: TQ3Boolean.False,
    },
    texturingMode: TexturingMode.Off,
    internalTextureID: -1,
    hasVertexNormals: false,
    hasVertexColors: false,
    diffuseColor: { r: 1, g: 1, b: 1, a: 1 },
  };
}

/**
 * Create an empty TQ3MetaFile structure
 */
function createMetaFile(): TQ3MetaFile {
  return {
    numTextures: 0,
    textures: [],
    numMeshes: 0,
    meshes: [],
    numTopLevelGroups: 0,
    topLevelGroups: [],
  };
}

/**
 * Create an empty TQ3TextureShader
 */
function createTextureShader(): TQ3TextureShader {
  return {
    pixmap: null,
    boundaryU: ShaderUVBoundary.Wrap,
    boundaryV: ShaderUVBoundary.Wrap,
  };
}

/**
 * Read triangle vertex indices based on the vertex count
 */
function readTriangleVertexIndices(
  reader: BigEndianReader,
  numTriangles: number,
  numVertices: number,
  triangles: TQ3TriMeshTriangleData[]
): Result<void, string> {
  for (let i = 0; i < numTriangles; i++) {
    let v0: number, v1: number, v2: number;
    
    if (numVertices <= 0xff) {
      // uint8 indices
      const r0 = reader.readUint8();
      const r1 = reader.readUint8();
      const r2 = reader.readUint8();
      if (r0.isErr()) return err(r0.error);
      if (r1.isErr()) return err(r1.error);
      if (r2.isErr()) return err(r2.error);
      v0 = r0.value;
      v1 = r1.value;
      v2 = r2.value;
    } else if (numVertices <= 0xffff) {
      // uint16 indices
      const r0 = reader.readUint16();
      const r1 = reader.readUint16();
      const r2 = reader.readUint16();
      if (r0.isErr()) return err(r0.error);
      if (r1.isErr()) return err(r1.error);
      if (r2.isErr()) return err(r2.error);
      v0 = r0.value;
      v1 = r1.value;
      v2 = r2.value;
    } else {
      // uint32 indices
      const r0 = reader.readUint32();
      const r1 = reader.readUint32();
      const r2 = reader.readUint32();
      if (r0.isErr()) return err(r0.error);
      if (r1.isErr()) return err(r1.error);
      if (r2.isErr()) return err(r2.error);
      v0 = r0.value;
      v1 = r1.value;
      v2 = r2.value;
    }

    const tri = triangles[i];
    if (tri) {
      tri.pointIndices = [v0, v1, v2];
    }
  }
  return ok(undefined);
}

/**
 * Parse a tmsh (TriMesh) chunk
 */
function parseTmsh(
  state: ParserState,
  chunkSize: number
): Result<void, string> {
  const { reader } = state;

  if (chunkSize < 52) {
    return err("Illegal tmsh size");
  }
  if (state.currentMesh !== null) {
    return err("Current mesh already set");
  }

  // Read header
  const numTrianglesResult = reader.readUint32();
  if (numTrianglesResult.isErr()) return err(numTrianglesResult.error);
  const numTriangles = numTrianglesResult.value;

  reader.skip(4); // numTriangleAttributes - we'll read them as we go

  const numEdgesResult = reader.readUint32();
  if (numEdgesResult.isErr()) return err(numEdgesResult.error);
  const numEdges = numEdgesResult.value;

  const numEdgeAttributesResult = reader.readUint32();
  if (numEdgeAttributesResult.isErr()) return err(numEdgeAttributesResult.error);
  const numEdgeAttributes = numEdgeAttributesResult.value;

  const numVerticesResult = reader.readUint32();
  if (numVerticesResult.isErr()) return err(numVerticesResult.error);
  const numVertices = numVerticesResult.value;

  reader.skip(4); // numVertexAttributes

  if (numEdges !== 0) {
    return err("Edges are not supported");
  }
  if (numEdgeAttributes !== 0) {
    return err("Edge attributes are not supported");
  }

  // Create mesh
  const mesh = createTriMeshData(numTriangles, numVertices);
  state.currentMesh = mesh;

  // Add to metafile mesh list
  state.metaFile.meshes.push(mesh);
  state.metaFile.numMeshes++;

  // Read triangles
  const triResult = readTriangleVertexIndices(
    reader,
    numTriangles,
    numVertices,
    mesh.triangles
  );
  if (triResult.isErr()) return err(triResult.error);

  // Validate vertex indices
  for (let i = 0; i < numTriangles; i++) {
    const tri = mesh.triangles[i];
    if (tri) {
      for (const index of tri.pointIndices) {
        if (index >= numVertices) {
          return err(`Vertex index ${index} out of range`);
        }
      }
    }
  }

  // Read vertices
  for (let i = 0; i < numVertices; i++) {
    const xResult = reader.readFloat32();
    const yResult = reader.readFloat32();
    const zResult = reader.readFloat32();
    if (xResult.isErr()) return err(xResult.error);
    if (yResult.isErr()) return err(yResult.error);
    if (zResult.isErr()) return err(zResult.error);
    
    const point = mesh.points[i];
    if (point) {
      point.x = xResult.value;
      point.y = yResult.value;
      point.z = zResult.value;
    }
  }

  // Read bounding box
  const minXResult = reader.readFloat32();
  const minYResult = reader.readFloat32();
  const minZResult = reader.readFloat32();
  const maxXResult = reader.readFloat32();
  const maxYResult = reader.readFloat32();
  const maxZResult = reader.readFloat32();
  const emptyFlagResult = reader.readUint32();

  if (minXResult.isErr()) return err(minXResult.error);
  if (minYResult.isErr()) return err(minYResult.error);
  if (minZResult.isErr()) return err(minZResult.error);
  if (maxXResult.isErr()) return err(maxXResult.error);
  if (maxYResult.isErr()) return err(maxYResult.error);
  if (maxZResult.isErr()) return err(maxZResult.error);
  if (emptyFlagResult.isErr()) return err(emptyFlagResult.error);

  mesh.bBox = {
    min: { x: minXResult.value, y: minYResult.value, z: minZResult.value },
    max: { x: maxXResult.value, y: maxYResult.value, z: maxZResult.value },
    isEmpty: emptyFlagResult.value ? TQ3Boolean.True : TQ3Boolean.False,
  };

  return ok(undefined);
}

/**
 * Parse an atar (AttributeArray) chunk
 */
function parseAtar(
  state: ParserState,
  chunkSize: number
): Result<void, string> {
  const { reader } = state;

  if (chunkSize < 20) {
    return err("Illegal atar size");
  }
  if (!state.currentMesh) {
    return err("No current mesh for atar");
  }

  const mesh = state.currentMesh;

  const attributeTypeResult = reader.readUint32();
  if (attributeTypeResult.isErr()) return err(attributeTypeResult.error);
  const attributeType = attributeTypeResult.value;

  const zeroResult = reader.readUint32();
  if (zeroResult.isErr()) return err(zeroResult.error);
  if (zeroResult.value !== 0) {
    return err(new Error("Expected zero in atar header"));
  }

  const positionOfArrayResult = reader.readUint32();
  if (positionOfArrayResult.isErr()) return err(positionOfArrayResult.error);
  const positionOfArray = positionOfArrayResult.value;

  const positionInArrayResult = reader.readUint32();
  if (positionInArrayResult.isErr()) return err(positionInArrayResult.error);
  // positionInArray is not always used

  const attributeUseFlagResult = reader.readUint32();
  if (attributeUseFlagResult.isErr()) return err(attributeUseFlagResult.error);
  // attributeUseFlag is usually 0 or 1

  if (attributeType < 1 || attributeType >= AttributeType.NumTypes) {
    return err(new Error(`Illegal attribute type: ${attributeType}`));
  }
  if (positionOfArray > 2) {
    return err(new Error(`Illegal position of array: ${positionOfArray}`));
  }

  const isTriangleAttribute = positionOfArray === AttributeArrayPosition.TriangleAttribute;
  const isVertexAttribute = positionOfArray === AttributeArrayPosition.VertexAttribute;

  if (!isTriangleAttribute && !isVertexAttribute) {
    return err(new Error("Only face or vertex attributes are supported"));
  }

  // Handle vertex UVs
  if (isVertexAttribute && 
      (attributeType === AttributeType.ShadingUV || attributeType === AttributeType.SurfaceUV)) {
    if (mesh.vertexUVs !== null) {
      return err(new Error("Current mesh already has vertex UVs"));
    }

    mesh.vertexUVs = new Array(mesh.numPoints);
    for (let i = 0; i < mesh.numPoints; i++) {
      const uResult = reader.readFloat32();
      const vResult = reader.readFloat32();
      if (uResult.isErr()) return err(uResult.error);
      if (vResult.isErr()) return err(vResult.error);
      // Flip V coordinate: 3DMF uses bottom-left UV origin (like OpenGL),
      // but many 3D formats use top-left origin. Flip V for compatibility.
      mesh.vertexUVs[i] = { u: uResult.value, v: 1 - vResult.value };
    }
  }
  // Handle vertex normals
  else if (isVertexAttribute && attributeType === AttributeType.Normal) {
    if (mesh.vertexNormals !== null) {
      return err(new Error("Current mesh already has vertex normals"));
    }

    mesh.vertexNormals = new Array(mesh.numPoints);
    mesh.hasVertexNormals = true;

    for (let i = 0; i < mesh.numPoints; i++) {
      const xResult = reader.readFloat32();
      const yResult = reader.readFloat32();
      const zResult = reader.readFloat32();
      if (xResult.isErr()) return err(xResult.error);
      if (yResult.isErr()) return err(yResult.error);
      if (zResult.isErr()) return err(zResult.error);
      mesh.vertexNormals[i] = { 
        x: xResult.value, 
        y: yResult.value, 
        z: zResult.value 
      };
    }
  }
  // Handle vertex colors
  else if (isVertexAttribute && attributeType === AttributeType.DiffuseColor) {
    if (mesh.vertexColors !== null) {
      return err(new Error("Current mesh already has vertex colors"));
    }

    mesh.vertexColors = new Array(mesh.numPoints);
    mesh.hasVertexColors = true;

    for (let i = 0; i < mesh.numPoints; i++) {
      const rResult = reader.readFloat32();
      const gResult = reader.readFloat32();
      const bResult = reader.readFloat32();
      if (rResult.isErr()) return err(rResult.error);
      if (gResult.isErr()) return err(gResult.error);
      if (bResult.isErr()) return err(bResult.error);
      mesh.vertexColors[i] = { 
        r: rResult.value, 
        g: gResult.value, 
        b: bResult.value, 
        a: 1.0 
      };
    }
  }
  // Handle face normals (skip them)
  else if (isTriangleAttribute && attributeType === AttributeType.Normal) {
    reader.skip(mesh.numTriangles * 3 * 4);
  }
  else {
    return err(new Error(`Unsupported attribute combination: type=${attributeType}, position=${positionOfArray}`));
  }

  return ok(undefined);
}

/**
 * Parse a pixmap (txmm or txpm) chunk
 */
function parsePixmap(
  state: ParserState,
  chunkType: number,
  chunkSize: number
): Result<TQ3Pixmap, string> {
  const { reader } = state;

  const isMipmap = chunkType === CHUNK_TXMM;
  const chunkHeaderSize = isMipmap ? 8 * 4 : 7 * 4;

  if (chunkSize < chunkHeaderSize) {
    return err("Incorrect chunk header size for pixmap");
  }

  let pixelType: number;
  let bitOrder: number;
  let byteOrder: number;
  let width: number;
  let height: number;
  let rowBytes: number;

  if (isMipmap) {
    // txmm format
    const useMipmappingResult = reader.readUint32();
    if (useMipmappingResult.isErr()) return err(useMipmappingResult.error);
    if (useMipmappingResult.value !== 0) {
      return err(new Error("Mipmapping not supported"));
    }

    const pixelTypeResult = reader.readUint32();
    const bitOrderResult = reader.readUint32();
    const byteOrderResult = reader.readUint32();
    const widthResult = reader.readUint32();
    const heightResult = reader.readUint32();
    const rowBytesResult = reader.readUint32();
    const offsetResult = reader.readUint32();

    if (pixelTypeResult.isErr()) return err(pixelTypeResult.error);
    if (bitOrderResult.isErr()) return err(bitOrderResult.error);
    if (byteOrderResult.isErr()) return err(byteOrderResult.error);
    if (widthResult.isErr()) return err(widthResult.error);
    if (heightResult.isErr()) return err(heightResult.error);
    if (rowBytesResult.isErr()) return err(rowBytesResult.error);
    if (offsetResult.isErr()) return err(offsetResult.error);

    if (offsetResult.value !== 0) {
      return err(new Error("Unsupported texture offset"));
    }

    pixelType = pixelTypeResult.value;
    bitOrder = bitOrderResult.value;
    byteOrder = byteOrderResult.value;
    width = widthResult.value;
    height = heightResult.value;
    rowBytes = rowBytesResult.value;
  } else {
    // txpm format
    const widthResult = reader.readUint32();
    const heightResult = reader.readUint32();
    const rowBytesResult = reader.readUint32();
    reader.skip(4); // pixelSize
    const pixelTypeResult = reader.readUint32();
    const bitOrderResult = reader.readUint32();
    const byteOrderResult = reader.readUint32();

    if (widthResult.isErr()) return err(widthResult.error);
    if (heightResult.isErr()) return err(heightResult.error);
    if (rowBytesResult.isErr()) return err(rowBytesResult.error);
    if (pixelTypeResult.isErr()) return err(pixelTypeResult.error);
    if (bitOrderResult.isErr()) return err(bitOrderResult.error);
    if (byteOrderResult.isErr()) return err(byteOrderResult.error);

    pixelType = pixelTypeResult.value;
    bitOrder = bitOrderResult.value;
    byteOrder = byteOrderResult.value;
    width = widthResult.value;
    height = heightResult.value;
    rowBytes = rowBytesResult.value;
  }

  // Calculate image size
  let imageSize = rowBytes * height;
  if ((imageSize & 3) !== 0) {
    imageSize = (imageSize & 0xfffffffc) + 4;
  }

  if (chunkSize !== chunkHeaderSize + imageSize) {
    return err(new Error(`Incorrect chunk size: expected ${chunkHeaderSize + imageSize}, got ${chunkSize}`));
  }

  if (bitOrder !== Endian.Big) {
    return err(new Error("Unsupported bit order"));
  }

  // Find bytes per pixel
  let bytesPerPixel = 0;
  if (pixelType === PixelType.RGB16 || pixelType === PixelType.ARGB16) {
    bytesPerPixel = 2;
  } else if (pixelType === PixelType.RGB32 || pixelType === PixelType.ARGB32) {
    bytesPerPixel = 4;
  } else {
    return err(new Error(`Unrecognized pixel type: ${pixelType}`));
  }

  const trimmedRowBytes = bytesPerPixel * width;

  // Read image data, trimming padding at end of rows
  const imageData = new Uint8Array(trimmedRowBytes * height);
  for (let y = 0; y < height; y++) {
    const rowResult = reader.readBytes(trimmedRowBytes);
    if (rowResult.isErr()) return err(rowResult.error);
    imageData.set(rowResult.value, y * trimmedRowBytes);
    reader.skip(rowBytes - width * bytesPerPixel);
  }

  // Byteswap if needed (convert from big-endian to native)
  // Note: In JavaScript we typically work in native endianness
  // For now we store the original byteOrder and let the consumer handle it
  const pixmap: TQ3Pixmap = {
    image: imageData,
    width,
    height,
    rowBytes: trimmedRowBytes,
    pixelSize: bytesPerPixel * 8,
    pixelType,
    bitOrder,
    byteOrder,
  };

  return ok(pixmap);
}

/**
 * Get the current texture shader being built
 */
function getCurrentTextureShader(state: ParserState): Result<TQ3TextureShader, string> {
  if (state.metaFile.numTextures === 0) {
    return err("No texture shader opened");
  }
  const shader = state.metaFile.textures[state.metaFile.numTextures - 1];
  if (!shader) {
    return err("Texture shader is undefined");
  }
  return ok(shader);
}

/**
 * Parse a single chunk
 * Returns the chunk type that was parsed
 */
function parseOneChunk(state: ParserState): Result<number, string> {
  const { reader } = state;

  if (state.currentDepth < 0) {
    return err("Depth underflow");
  }

  // Read chunk type and size
  const chunkOffset = reader.tell();
  const chunkTypeResult = reader.readUint32();
  const chunkSizeResult = reader.readUint32();

  if (chunkTypeResult.isErr()) return err(chunkTypeResult.error);
  if (chunkSizeResult.isErr()) return err(chunkSizeResult.error);

  const chunkType = chunkTypeResult.value;
  const chunkSize = chunkSizeResult.value;

  // Process chunk based on type
  switch (chunkType) {
    case 0: {
      // Early EOF indicator (signals end of file or corruption)
      return err(new Error("Early EOF in 3DMF"));
    }

    case CHUNK_CNTR: {
      // Container chunk
      if (state.currentDepth === 1) {
        // Add new top-level group
        const group: TQ3TriMeshFlatGroup = { numMeshes: 0, meshes: [] };
        state.metaFile.topLevelGroups.push(group);
        state.metaFile.numTopLevelGroups++;
      }

      state.currentDepth++;
      const limit = reader.tell() + chunkSize;
      while (reader.tell() < limit) {
        const result = parseOneChunk(state);
        if (result.isErr()) return result;
      }
      state.currentDepth--;
      state.currentMesh = null;
      break;
    }

    case CHUNK_BGNG: {
      // Begin group
      if (state.currentDepth === 1) {
        const group: TQ3TriMeshFlatGroup = { numMeshes: 0, meshes: [] };
        state.metaFile.topLevelGroups.push(group);
        state.metaFile.numTopLevelGroups++;
      }
      state.currentDepth++;
      reader.skip(chunkSize); // Skip bgng data (typically contains dspg, dgst)
      
      // Parse until endg
      let endgFound = false;
      while (!endgFound) {
        const result = parseOneChunk(state);
        if (result.isErr()) return result;
        if (result.value === CHUNK_ENDG) {
          endgFound = true;
        }
      }
      state.currentDepth--;
      state.currentMesh = null;
      break;
    }

    case CHUNK_ENDG: {
      if (chunkSize !== 0) {
        return err(new Error("Illegal endg size"));
      }
      break;
    }

    case CHUNK_TMSH: {
      // TriMesh
      if (state.currentMesh !== null) {
        return err("Nested meshes not supported");
      }

      const result = parseTmsh(state, chunkSize);
      if (result.isErr()) return err(result.error);

      if (!state.currentMesh) {
        return err("currentMesh wasn't set by parseTmsh");
      }

      // Add to current group if available
      if (state.metaFile.numTopLevelGroups === 0) {
        const group: TQ3TriMeshFlatGroup = { numMeshes: 0, meshes: [] };
        state.metaFile.topLevelGroups.push(group);
        state.metaFile.numTopLevelGroups++;
      }

      const currentGroup = state.metaFile.topLevelGroups[state.metaFile.numTopLevelGroups - 1];
      if (currentGroup) {
        currentGroup.meshes.push(state.currentMesh);
        currentGroup.numMeshes++;
      }
      break;
    }

    case CHUNK_ATAR: {
      const result = parseAtar(state, chunkSize);
      if (result.isErr()) return err(result.error);
      break;
    }

    case CHUNK_ATTR: {
      if (chunkSize !== 0) {
        return err(new Error("Illegal attr size"));
      }
      break;
    }

    case CHUNK_KDIF: {
      // Diffuse color
      if (chunkSize !== 12) {
        return err(new Error("Illegal kdif size"));
      }
      if (!state.currentMesh) {
        return err(new Error("Stray kdif chunk"));
      }

      const rResult = reader.readFloat32();
      const gResult = reader.readFloat32();
      const bResult = reader.readFloat32();
      if (rResult.isErr()) return err(rResult.error);
      if (gResult.isErr()) return err(gResult.error);
      if (bResult.isErr()) return err(bResult.error);

      state.currentMesh.diffuseColor.r = rResult.value;
      state.currentMesh.diffuseColor.g = gResult.value;
      state.currentMesh.diffuseColor.b = bResult.value;
      break;
    }

    case CHUNK_KXPR: {
      // Transparency color
      if (chunkSize !== 12) {
        return err(new Error("Illegal kxpr size"));
      }
      if (!state.currentMesh) {
        return err(new Error("Stray kxpr chunk"));
      }

      const rResult = reader.readFloat32();
      const gResult = reader.readFloat32();
      const bResult = reader.readFloat32();
      if (rResult.isErr()) return err(rResult.error);
      if (gResult.isErr()) return err(gResult.error);
      if (bResult.isErr()) return err(bResult.error);

      // Note: Original parser asserts r == g == b
      state.currentMesh.diffuseColor.a = rResult.value;
      break;
    }

    case CHUNK_TXSU: {
      // Texture shader
      let internalTextureID: number;

      if (chunkSize !== 0) {
        return err(new Error("Illegal txsu size"));
      }

      const existingTexture = state.knownTextures.get(chunkOffset);
      if (existingTexture !== undefined) {
        // Already seen this txsu (via reference)
        internalTextureID = existingTexture;
      } else {
        // New texture
        internalTextureID = state.metaFile.numTextures;
        state.metaFile.textures.push(createTextureShader());
        state.metaFile.numTextures++;
        state.knownTextures.set(chunkOffset, internalTextureID);
      }

      if (state.currentMesh) {
        if (state.currentMesh.internalTextureID >= 0) {
          return err(new Error("Current mesh already has a texture"));
        }
        state.currentMesh.internalTextureID = internalTextureID;
        state.currentMesh.texturingMode = TexturingMode.Invalid; // Will be determined later
      }
      break;
    }

    case CHUNK_TXMM:
    case CHUNK_TXPM: {
      // Mipmap or pixmap texture
      const shaderResult = getCurrentTextureShader(state);
      if (shaderResult.isErr()) return err(shaderResult.error);

      if (shaderResult.value.pixmap !== null) {
        // Pixmap already set, skip this one
        reader.skip(chunkSize);
      } else {
        const pixmapResult = parsePixmap(state, chunkType, chunkSize);
        if (pixmapResult.isErr()) return err(pixmapResult.error);
        shaderResult.value.pixmap = pixmapResult.value;
      }
      break;
    }

    case CHUNK_SHDR: {
      // Shader UV boundary
      if (chunkSize !== 8) {
        return err(new Error("Illegal shdr size"));
      }

      const shaderResult = getCurrentTextureShader(state);
      if (shaderResult.isErr()) return err(shaderResult.error);

      const boundaryUResult = reader.readUint32();
      const boundaryVResult = reader.readUint32();
      if (boundaryUResult.isErr()) return err(boundaryUResult.error);
      if (boundaryVResult.isErr()) return err(boundaryVResult.error);

      if (!isShaderUVBoundary(boundaryUResult.value)) {
        return err(new Error(`Invalid shader U boundary ${boundaryUResult.value}`));
      }
      if (!isShaderUVBoundary(boundaryVResult.value)) {
        return err(new Error(`Invalid shader V boundary ${boundaryVResult.value}`));
      }
      shaderResult.value.boundaryU = boundaryUResult.value;
      shaderResult.value.boundaryV = boundaryVResult.value;
      break;
    }

    case CHUNK_RFRN: {
      // Reference (into TOC)
      if (chunkSize !== 4) {
        return err(new Error("Illegal rfrn size"));
      }

      const targetResult = reader.readUint32();
      if (targetResult.isErr()) return err(targetResult.error);
      const target = targetResult.value;

      const tocEntry = state.referenceTOC.get(target);
      if (!tocEntry) {
        return err(new Error(`Reference target ${target} not found in TOC`));
      }

      // Save position and jump to referenced chunk
      const jumpBackTo = reader.tell();
      reader.goto(tocEntry.offset);
      const result = parseOneChunk(state);
      if (result.isErr()) return result;
      reader.goto(jumpBackTo);
      break;
    }

    case CHUNK_TOC: {
      // Already read TOC at beginning, skip it
      reader.skip(chunkSize);
      break;
    }

    default: {
      // Unknown chunk - skip it
      // In production we might want to log this, but for strict parsing:
      // return err(new Error(`Unrecognized 3DMF chunk: ${fourCCToString(chunkType)} (0x${chunkType.toString(16)})`));
      reader.skip(chunkSize);
      break;
    }
  }

  return ok(chunkType);
}

/**
 * Read the 3DMF file header and TOC
 */
function readHeaderAndTOC(state: ParserState): Result<void, string> {
  const { reader } = state;

  // Read magic number
  const magicResult = reader.readUint32();
  if (magicResult.isErr()) return err(magicResult.error);
  if (magicResult.value !== CHUNK_3DMF) {
    return err(`Not a 3DMF file (got ${fourCCToString(magicResult.value)})`);
  }

  // Read header length
  const headerLenResult = reader.readUint32();
  if (headerLenResult.isErr()) return err(headerLenResult.error);
  if (headerLenResult.value !== 16) {
    return err(`Bad 3DMF header length: ${headerLenResult.value}`);
  }

  // Read version
  const versionMajorResult = reader.readUint16();
  const versionMinorResult = reader.readUint16();
  if (versionMajorResult.isErr()) return err(versionMajorResult.error);
  if (versionMinorResult.isErr()) return err(versionMinorResult.error);

  const versionMajor = versionMajorResult.value;
  const versionMinor = versionMinorResult.value;

  if (versionMajor !== 1 || (versionMinor !== 5 && versionMinor !== 6)) {
    return err(`Unsupported 3DMF version: ${versionMajor}.${versionMinor}`);
  }

  // Read flags
  const flagsResult = reader.readUint32();
  if (flagsResult.isErr()) return err(flagsResult.error);
  if (flagsResult.value !== 0) {
    return err("Database or Stream modes aren't supported");
  }

  // Read TOC offset
  const tocOffsetResult = reader.readUint64();
  if (tocOffsetResult.isErr()) return err(tocOffsetResult.error);
  const tocOffset = tocOffsetResult.value;

  // Read TOC if present
  if (tocOffset !== 0) {
    const savedPos = reader.tell();
    reader.goto(tocOffset);

    // Read TOC header
    const tocMagicResult = reader.readUint32();
    if (tocMagicResult.isErr()) return err(tocMagicResult.error);
    if (tocMagicResult.value !== CHUNK_TOC) {
      return err("Expecting toc magic");
    }

    reader.skip(4);  // tocSize
    reader.skip(8);  // nextToc
    reader.skip(4);  // refSeed
    reader.skip(4);  // typeSeed

    const tocEntryTypeResult = reader.readUint32();
    const tocEntrySizeResult = reader.readUint32();
    const nEntriesResult = reader.readUint32();

    if (tocEntryTypeResult.isErr()) return err(tocEntryTypeResult.error);
    if (tocEntrySizeResult.isErr()) return err(tocEntrySizeResult.error);
    if (nEntriesResult.isErr()) return err(nEntriesResult.error);

    if (tocEntryTypeResult.value !== 1) {
      return err("Only QD3D 1.5 3DMF TOCs are recognized");
    }
    if (tocEntrySizeResult.value !== 16) {
      return err("Incorrect tocEntrySize");
    }

    // Read TOC entries
    for (let i = 0; i < nEntriesResult.value; i++) {
      const refIDResult = reader.readUint32();
      const objLocationResult = reader.readUint64();
      const objTypeResult = reader.readUint32();

      if (refIDResult.isErr()) return err(refIDResult.error);
      if (objLocationResult.isErr()) return err(objLocationResult.error);
      if (objTypeResult.isErr()) return err(objTypeResult.error);

      state.referenceTOC.set(refIDResult.value, {
        offset: objLocationResult.value,
        chunkType: objTypeResult.value,
      });
    }

    reader.goto(savedPos);
  }

  return ok(undefined);
}

/**
 * Parse a 3DMF file
 * @param buffer ArrayBuffer containing the 3DMF file
 * @returns Result<TQ3MetaFile, Error>
 */
export function parse3DMFToMetaFile(buffer: ArrayBuffer): Result<TQ3MetaFile, string> {
  const reader = new BigEndianReader(buffer);
  const state: ParserState = {
    reader,
    metaFile: createMetaFile(),
    currentDepth: 0,
    currentMesh: null,
    referenceTOC: new Map(),
    knownTextures: new Map(),
  };

  // Read header and TOC
  const headerResult = readHeaderAndTOC(state);
  if (headerResult.isErr()) return err(headerResult.error);

  // Parse chunks until EOF
  const fileLength = reader.length();
  while (reader.tell() < fileLength) {
    const result = parseOneChunk(state);
    if (result.isErr()) {
      // Check if it's an early EOF error (which is acceptable at end of some files)
      if (result.error === "Early EOF in 3DMF") {
        break;
      }
      return err(result.error);
    }
  }

  return ok(state.metaFile);
}
