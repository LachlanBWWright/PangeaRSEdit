import { BG3DParseResult, BG3DMaterial, BG3DGroup, BG3DGeometry } from "./parseBG3D";

// 3DMF (3D Metafile) format constants
// Based on Apple's QuickDraw 3D specification and Pangea Software usage

export enum ThreeDMFObjectType {
  // Container objects  
  kQ3ObjectTypeDisplayGroup = 0x64737067,     // 'dspg'
  kQ3ObjectTypeGroup = 0x67727570,            // 'grup'
  
  // Geometry objects
  kQ3ObjectTypeTriMesh = 0x746d7368,          // 'tmsh'
  kQ3ObjectTypePolyhedron = 0x706c7964,       // 'plyd'
  kQ3ObjectTypePoint = 0x706e7420,            // 'pnt '
  kQ3ObjectTypeLine = 0x6c696e65,             // 'line'
  
  // Attribute objects
  kQ3ObjectTypeAttributeSet = 0x61747374,     // 'atst'
  kQ3ObjectTypeSurfaceShader = 0x73687372,    // 'shsr'
  kQ3ObjectTypeTexture = 0x74787472,          // 'txtr'
  kQ3ObjectTypePixmapTexture = 0x78646d70,    // 'xdmp'
  
  // Transform objects
  kQ3ObjectTypeMatrix = 0x6d747278,           // 'mtrx'
  kQ3ObjectTypeTranslate = 0x74726e73,        // 'trns'
  kQ3ObjectTypeRotate = 0x726f7461,           // 'rota'
  kQ3ObjectTypeScale = 0x7363616c,            // 'scal'
  
  // File structure
  kQ3ObjectTypeTableOfContents = 0x746f6320,  // 'toc '
  kQ3ObjectTypeReference = 0x72666572,        // 'rfer'
  kQ3ObjectTypeContainer = 0x636e7472,        // 'cntr'
}

export interface ThreeDMFHeader {
  majorVersion: number;
  minorVersion: number;
  flags: number;
}

export interface ThreeDMFChunk {
  objectType: number;
  size: number;
  data: Uint8Array;
}

/**
 * Parse a 3DMF (3D Metafile) file and convert it to BG3DParseResult format
 * @param buffer ArrayBuffer containing the 3DMF file
 * @returns BG3DParseResult compatible structure
 */
export function parse3DMF(buffer: ArrayBuffer): BG3DParseResult {
  const view = new DataView(buffer);
  let offset = 0;
  
  // Read 3DMF header
  // 3DMF files start with a header containing version info
  if (buffer.byteLength < 16) {
    throw new Error("File too small to be a valid 3DMF file");
  }
  
  // Check for 3DMF signature - typically starts with specific bytes
  // Many 3DMF files start with a 4-byte identifier
  const signature = view.getUint32(offset, false);
  console.log(`[parse3DMF] Signature: 0x${signature.toString(16)}`);
  
  // Try to parse as QuickDraw 3D 3DMF format
  const materials: BG3DMaterial[] = [];
  const groups: BG3DGroup[] = [{ children: [] }];
  let currentGroup = groups[0];
  
  // 3DMF files are chunk-based, similar to IFF format
  // Each chunk has: [4-byte type][4-byte size][data]
  offset = 0; // Start from beginning and parse chunks
  
  while (offset < buffer.byteLength - 8) {
    try {
      // Read chunk header
      const chunkType = view.getUint32(offset, false);
      offset += 4;
      const chunkSize = view.getUint32(offset, false);
      offset += 4;
      
      console.log(`[parse3DMF] Chunk type: 0x${chunkType.toString(16)} (${String.fromCharCode(
        (chunkType >> 24) & 0xFF,
        (chunkType >> 16) & 0xFF, 
        (chunkType >> 8) & 0xFF,
        chunkType & 0xFF
      )}), size: ${chunkSize}`);
      
      // Validate chunk size
      if (chunkSize > buffer.byteLength - offset || chunkSize < 0) {
        console.warn(`[parse3DMF] Invalid chunk size ${chunkSize} at offset ${offset - 4}, skipping to next potential chunk`);
        offset += 4; // Skip and try next position
        continue;
      }
      
      // Extract chunk data
      const chunkData = new Uint8Array(buffer, offset, chunkSize);
      
      // Parse chunk based on type
      switch (chunkType) {
        case ThreeDMFObjectType.kQ3ObjectTypeTriMesh:
          parseTriMeshChunk(chunkData, currentGroup, materials);
          break;
          
        case ThreeDMFObjectType.kQ3ObjectTypeDisplayGroup:
        case ThreeDMFObjectType.kQ3ObjectTypeGroup:
          // Create new group
          const newGroup: BG3DGroup = { children: [] };
          currentGroup.children.push(newGroup);
          currentGroup = newGroup;
          break;
          
        case ThreeDMFObjectType.kQ3ObjectTypePixmapTexture:
          parseTextureChunk(chunkData, materials);
          break;
          
        case ThreeDMFObjectType.kQ3ObjectTypeAttributeSet:
          parseAttributeSetChunk(chunkData, materials);
          break;
          
        default:
          // Unknown chunk type, skip
          console.log(`[parse3DMF] Unknown chunk type 0x${chunkType.toString(16)}, skipping`);
          break;
      }
      
      // Move to next chunk
      offset += chunkSize;
      
      // Ensure 4-byte alignment (common in chunk formats)
      if (offset % 4 !== 0) {
        offset += 4 - (offset % 4);
      }
      
    } catch (error) {
      console.error(`[parse3DMF] Error parsing chunk at offset ${offset}:`, error);
      // Try to recover by advancing and looking for next valid chunk
      offset += 4;
      
      // Look for next potential chunk signature
      while (offset < buffer.byteLength - 8) {
        const potentialType = view.getUint32(offset, false);
        if (Object.values(ThreeDMFObjectType).includes(potentialType)) {
          console.log(`[parse3DMF] Found potential chunk at offset ${offset}`);
          break;
        }
        offset += 4;
      }
    }
  }
  
  // If no materials were parsed, create a default one
  if (materials.length === 0) {
    materials.push({
      flags: 1,
      diffuseColor: [0.7, 0.7, 0.7, 1.0],
      textures: [],
      jpegTextures: []
    });
  }
  
  console.log(`[parse3DMF] Parsed ${materials.length} materials and ${groups.length} groups`);
  
  return {
    materials,
    groups
  };
}

/**
 * Parse a TriMesh chunk (triangle mesh geometry)
 */
function parseTriMeshChunk(data: Uint8Array, group: BG3DGroup, materials: BG3DMaterial[]) {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let offset = 0;
  
  try {
    // TriMesh typically contains:
    // - Number of vertices
    // - Vertex array (3D points)
    // - Number of triangles  
    // - Triangle indices
    
    if (data.length < 16) {
      console.warn("[parse3DMF] TriMesh chunk too small");
      return;
    }
    
    const numVertices = view.getUint32(offset, false);
    offset += 4;
    const numTriangles = view.getUint32(offset, false);
    offset += 4;
    
    console.log(`[parse3DMF] TriMesh: ${numVertices} vertices, ${numTriangles} triangles`);
    
    // Validate sizes
    if (numVertices > 100000 || numTriangles > 100000 || numVertices < 0 || numTriangles < 0) {
      console.warn(`[parse3DMF] Invalid TriMesh sizes: ${numVertices} vertices, ${numTriangles} triangles`);
      return;
    }
    
    // Read vertices (assuming 3 floats per vertex)
    const vertices: [number, number, number][] = [];
    const bytesNeeded = numVertices * 12; // 3 floats * 4 bytes each
    if (offset + bytesNeeded > data.length) {
      console.warn("[parse3DMF] Not enough data for vertices");
      return;
    }
    
    for (let i = 0; i < numVertices; i++) {
      const x = view.getFloat32(offset, false);
      offset += 4;
      const y = view.getFloat32(offset, false);  
      offset += 4;
      const z = view.getFloat32(offset, false);
      offset += 4;
      vertices.push([x, y, z]);
    }
    
    // Read triangles (assuming 3 uint32 indices per triangle)
    const triangles: [number, number, number][] = [];
    const triangleBytesNeeded = numTriangles * 12; // 3 uint32 * 4 bytes each
    if (offset + triangleBytesNeeded > data.length) {
      console.warn("[parse3DMF] Not enough data for triangles");
      return;
    }
    
    for (let i = 0; i < numTriangles; i++) {
      const a = view.getUint32(offset, false);
      offset += 4;
      const b = view.getUint32(offset, false);
      offset += 4;
      const c = view.getUint32(offset, false);
      offset += 4;
      triangles.push([a, b, c]);
    }
    
    // Create geometry object
    const geometry: BG3DGeometry = {
      type: 0,
      numMaterials: 1,
      layerMaterialNum: [0, 0, 0, 0],
      flags: 0,
      numPoints: numVertices,
      numTriangles: numTriangles,
      vertices,
      triangles
    };
    
    group.children.push(geometry);
    
  } catch (error) {
    console.error("[parse3DMF] Error parsing TriMesh:", error);
  }
}

/**
 * Parse a texture chunk
 */
function parseTextureChunk(data: Uint8Array, materials: BG3DMaterial[]) {
  console.log(`[parse3DMF] Parsing texture chunk (${data.length} bytes)`);
  
  // Create a basic material if none exists
  if (materials.length === 0) {
    materials.push({
      flags: 1,
      diffuseColor: [1, 1, 1, 1],
      textures: [],
      jpegTextures: []
    });
  }
  
  // For now, just log that we found a texture
  // TODO: Implement actual texture parsing when we have sample files
}

/**
 * Parse an attribute set chunk (material properties)
 */
function parseAttributeSetChunk(data: Uint8Array, materials: BG3DMaterial[]) {
  console.log(`[parse3DMF] Parsing attribute set chunk (${data.length} bytes)`);
  
  // Create a basic material
  const material: BG3DMaterial = {
    flags: 1,
    diffuseColor: [0.8, 0.8, 0.8, 1.0],
    textures: [],
    jpegTextures: []
  };
  
  materials.push(material);
}

/**
 * Serialize a BG3DParseResult back to a 3DMF ArrayBuffer
 * @param parsed BG3DParseResult to serialize
 * @returns ArrayBuffer containing 3DMF data
 */
export function bg3dParsedTo3DMF(parsed: BG3DParseResult): ArrayBuffer {
  // Estimate buffer size
  const size = 1024 * 1024; // 1MB initial size
  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);
  let offset = 0;
  
  console.log("[bg3dParsedTo3DMF] Starting 3DMF serialization");
  
  // Write groups and their geometries as 3DMF chunks
  for (const group of parsed.groups) {
    offset = writeGroupAs3DMF(view, buffer, group, offset);
  }
  
  // Write materials as attribute chunks
  for (const material of parsed.materials) {
    offset = writeMaterialAs3DMF(view, buffer, material, offset);
  }
  
  console.log(`[bg3dParsedTo3DMF] Generated 3DMF file with ${offset} bytes`);
  
  return buffer.slice(0, offset);
}

function writeGroupAs3DMF(view: DataView, buffer: ArrayBuffer, group: BG3DGroup, startOffset: number): number {
  let offset = startOffset;
  
  // Write display group chunk header
  view.setUint32(offset, ThreeDMFObjectType.kQ3ObjectTypeDisplayGroup, false);
  offset += 4;
  
  // Placeholder for size - we'll fill this in later
  const sizeOffset = offset;
  offset += 4;
  const dataStart = offset;
  
  // Write group children
  for (const child of group.children) {
    if ('vertices' in child) {
      // It's a geometry object - write as TriMesh
      const geom = child as BG3DGeometry;
      offset = writeGeometryAs3DMF(view, buffer, geom, offset);
    } else {
      // It's a sub-group
      offset = writeGroupAs3DMF(view, buffer, child as BG3DGroup, offset);
    }
  }
  
  // Fill in the actual size
  const actualSize = offset - dataStart;
  view.setUint32(sizeOffset, actualSize, false);
  
  return offset;
}

function writeGeometryAs3DMF(view: DataView, buffer: ArrayBuffer, geom: BG3DGeometry, startOffset: number): number {
  let offset = startOffset;
  
  // Write TriMesh chunk header
  view.setUint32(offset, ThreeDMFObjectType.kQ3ObjectTypeTriMesh, false);
  offset += 4;
  
  // Calculate and write size
  const dataSize = 8 + (geom.numPoints * 12) + (geom.numTriangles * 12);
  view.setUint32(offset, dataSize, false);
  offset += 4;
  
  // Write vertex count and triangle count
  view.setUint32(offset, geom.numPoints, false);
  offset += 4;
  view.setUint32(offset, geom.numTriangles, false);
  offset += 4;
  
  // Write vertices
  if (geom.vertices) {
    for (const [x, y, z] of geom.vertices) {
      view.setFloat32(offset, x, false);
      offset += 4;
      view.setFloat32(offset, y, false);
      offset += 4;
      view.setFloat32(offset, z, false);
      offset += 4;
    }
  }
  
  // Write triangles
  if (geom.triangles) {
    for (const [a, b, c] of geom.triangles) {
      view.setUint32(offset, a, false);
      offset += 4;
      view.setUint32(offset, b, false);
      offset += 4;
      view.setUint32(offset, c, false);
      offset += 4;
    }
  }
  
  return offset;
}

function writeMaterialAs3DMF(view: DataView, buffer: ArrayBuffer, material: BG3DMaterial, startOffset: number): number {
  let offset = startOffset;
  
  // Write attribute set chunk header
  view.setUint32(offset, ThreeDMFObjectType.kQ3ObjectTypeAttributeSet, false);
  offset += 4;
  
  // Write size (16 bytes for RGBA color)
  view.setUint32(offset, 16, false);
  offset += 4;
  
  // Write diffuse color
  view.setFloat32(offset, material.diffuseColor[0], false);
  offset += 4;
  view.setFloat32(offset, material.diffuseColor[1], false);
  offset += 4;
  view.setFloat32(offset, material.diffuseColor[2], false);
  offset += 4;
  view.setFloat32(offset, material.diffuseColor[3], false);
  offset += 4;
  
  return offset;
}
