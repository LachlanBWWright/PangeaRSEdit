import { Game } from "../data/globals/globals";

// parseBG3D.ts
// Full BG3D file parser for Otto Matic and related games

//https://registry.khronos.org/OpenGL-Refpages/gl4/html/glTexImage2D.xhtml
export enum PixelFormatSrc {
  GL_UNSIGNED_SHORT_1_5_5_5_REV = 33638, // 1a 5r 5g 5b 0x8366 33638
  GL_RGB = 6407, // 8r 8g 8b 0x1907 6407
  GL_RGBA = 6408, // 8r 8g 8b 8a 0x1908 6408
}

export enum PixelFormatDst {
  //outputs
  GL_UNSIGNED_SHORT_5_5_5_1 = 32855, // 0x8363, 32855
}

/**
 * Get a descriptive PixelFormatSrc enum name from a number value
 * @param value number
 * @returns string (e.g. "GL_RGB (6407)") or "Unknown (value)"
 */
export function getPixelFormatSrcName(value: number): string {
  switch (value) {
    case 33686:
      return "GL_UNSIGNED_SHORT_1_5_5_5_REV (33686)";
    case 6407:
      return "GL_RGB (6407)";
    default:
      return `Unknown (${value})`;
  }
}

/**
 * Get a descriptive PixelFormatDst enum name from a number value
 * @param value number
 * @returns string (e.g. "GL_UNSIGNED_SHORT_5_5_5_1 (32855)") or "Unknown (value)"
 */
export function getPixelFormatDstName(value: number): string {
  switch (value) {
    case 32855:
      return "GL_UNSIGNED_SHORT_5_5_5_1 (32855)";
    default:
      return `Unknown (${value})`;
  }
}

// BG3D tag constants (from C headers and extractbg3d.py)
export enum BG3DTagType {
  MATERIALFLAGS = 0,
  MATERIALDIFFUSECOLOR = 1,
  TEXTUREMAP = 2,
  GROUPSTART = 3,
  GROUPEND = 4,
  GEOMETRY = 5,
  VERTEXARRAY = 6,
  NORMALARRAY = 7,
  UVARRAY = 8,
  COLORARRAY = 9,
  TRIANGLEARRAY = 10,
  ENDFILE = 11,
  BOUNDINGBOX = 12, //LATER Games only
  JPEGTEXTURE = 13, // Nanosaur 2 only
}

export enum BG3DMaterialFlags {
  BG3D_MATERIALFLAG_TEXTURED = 1,
  BG3D_MATERIALFLAG_ALWAYSBLEND = 1 << 1, // set if always want to GL_BLEND this texture when drawn
  BG3D_MATERIALFLAG_CLAMP_U = 1 << 2, // Block horizontal texture tiling?
  BG3D_MATERIALFLAG_CLAMP_V = 1 << 3, // Block vertical texture tiling?
  BG3D_MATERIALFLAG_MULTITEXTURE = 1 << 4,
  BG3D_MATERIALFLAG_CLAMP_U_TRUE = 1 << 5, // Nanosaur 2 only, no idea what this does
  BG3D_MATERIALFLAG_CLAMP_V_TRUE = 1 << 6, // Nanosaur 2 only, no idea what this does
}
//Raw Data that gets parsed into BG3DParseResult

export interface BG3DMaterial {
  flags: number;
  diffuseColor: [number, number, number, number];
  textures: BG3DTexture[]; // Support for mipmaps
  jpegTextures: BG3DJpegTexture[]; // JPEG textures for Nanosaur 2+
  // ...other material properties as needed
}

export interface BG3DTexture {
  width: number;
  height: number;
  srcPixelFormat: PixelFormatSrc;
  dstPixelFormat: PixelFormatDst;
  bufferSize: number;
  pixels: Uint8Array;
}

export interface BG3DJpegTexture {
  width: number;
  height: number;
  bufferSize: number;
  jpegData: Uint8Array;
}

export interface BG3DGeometry {
  type: number;
  numMaterials: number;
  layerMaterialNum: number[]; // Indices into the materials array
  flags: number;
  numPoints: number;
  numTriangles: number;
  // ...geometry arrays (points, normals, uvs, etc.)
  vertices?: [number, number, number][];
  normals?: [number, number, number][];
  uvs?: [number, number][];
  colors?: [number, number, number, number][];
  triangles?: [number, number, number][];
  boundingBox?: {
    min: [number, number, number];
    max: [number, number, number];
  };
}

export interface BG3DGroup {
  children: (BG3DGeometry | BG3DGroup)[];
}

export interface BG3DParseResult {
  materials: BG3DMaterial[];
  groups: BG3DGroup[];
  // ...other global properties as needed
}

/**
 * Parse a .bg3d file from an ArrayBuffer
 * @param buffer ArrayBuffer containing the .bg3d file
 * @param gameType Which game this BG3D is from (Game enum)
 * @returns BG3DParseResult
 */
export function parseBG3D(buffer: ArrayBuffer): BG3DParseResult {
  const view = new DataView(buffer);
  let offset = 0;
  // Read header (first 4 bytes should be 'BG3D')
  const headerString = String.fromCharCode(
    view.getUint8(offset++),
    view.getUint8(offset++),
    view.getUint8(offset++),
    view.getUint8(offset++),
  );
  if (headerString !== "BG3D") {
    throw new Error("Not a BG3D file");
  }

  // Skip remainder of header (BG3DHeaderType is 20 bytes, 16 byte string, 4 byte version)
  offset += 16;

  // Main parse state
  // Material and group lists
  const materials: BG3DMaterial[] = [];
  const groups: BG3DGroup[] = [{ children: [] }]; // Start with a top-level group
  let done = false;
  // Group stack for nested group support
  const groupStack: BG3DGroup[] = [groups[0]];
  // Track the current group for children insertion
  let currentGroup: BG3DGroup = groups[0];
  // Track the current geometry for array tags
  let currentGeometry: BG3DGeometry | null = null;

  // Current material being built
  let currentMaterial: BG3DMaterial | null = null;

  // Tag-based parsing loop
  while (!done && offset < buffer.byteLength) {
    if (offset + 4 > buffer.byteLength) break;
    
    // Look for the next valid tag by scanning forward if necessary
    let tagOffset = offset;
    let tag = view.getUint32(tagOffset, false);
    
    // If we encounter an invalid tag, scan forward to find the next valid one
    if (tag < 0 || tag > 13) {
      console.log(`[parseBG3D] Invalid tag ${tag} at offset ${tagOffset}, scanning for next valid tag...`);
      let foundValidTag = false;
      
      // Scan forward up to 100KB to find the next valid tag
      for (let scanOffset = tagOffset + 4; scanOffset < Math.min(buffer.byteLength - 4, tagOffset + 100000); scanOffset += 4) {
        const candidateTag = view.getUint32(scanOffset, false);
        if (candidateTag >= 0 && candidateTag <= 13) {
          // Additional validation: check if this looks like a real tag by examining context
          let isValidContext = true;
          
          // For some tags, we can validate the next few bytes
          if (candidateTag === 0) { // MATERIALFLAGS - next should be reasonable flags
            const nextValue = view.getUint32(scanOffset + 4, false);
            if (nextValue > 1000000) isValidContext = false;
          } else if (candidateTag === 3 || candidateTag === 4 || candidateTag === 11) {
            // GROUPSTART, GROUPEND, ENDFILE - these have no immediate data, just validate alignment
            isValidContext = true;
          } else if (candidateTag === 13) { // JPEGTEXTURE - next should be width/height
            if (scanOffset + 12 <= buffer.byteLength) {
              const width = view.getUint32(scanOffset + 4, false);
              const height = view.getUint32(scanOffset + 8, false);
              if (width < 1 || width > 4096 || height < 1 || height > 4096) {
                isValidContext = false;
              }
            }
          }
          
          if (isValidContext) {
            console.log(`[parseBG3D] Found valid tag ${candidateTag} at offset ${scanOffset} (skipped ${scanOffset - tagOffset} bytes)`);
            tagOffset = scanOffset;
            tag = candidateTag;
            foundValidTag = true;
            break;
          }
        }
      }
      
      if (!foundValidTag) {
        // If we're near the end of the file (less than 32 bytes), just finish parsing
        if (buffer.byteLength - offset < 32) {
          console.log(`[parseBG3D] Near end of file (${buffer.byteLength - offset} bytes remaining), finishing parsing`);
          done = true;
          break;
        }
        throw new Error(`No valid tag found after offset ${offset}, giving up`);
      }
    }
    
    offset = tagOffset;
    
    // Debug: log tag info
    console.log(
      `[parseBG3D] Read tag ${
        BG3DTagType[tag] ?? tag
      } (value: ${tag}) at offset ${tagOffset}`,
    );
    
    offset += 4;

    // Main tag switch
    switch (tag) {
      case BG3DTagType.MATERIALFLAGS: {
        // 4 bytes: flags

        const flags = view.getUint32(offset, false);
        offset += 4;
        currentMaterial = {
          flags,
          diffuseColor: [1, 1, 1, 1],
          textures: [],
          jpegTextures: [],
        };
        materials.push(currentMaterial);
        break;
      }
      case BG3DTagType.MATERIALDIFFUSECOLOR: {
        // 4 floats (RGBA)
        if (!currentMaterial)
          throw new Error("No current material for diffuse color");
        const r = view.getFloat32(offset, false);
        offset += 4;
        const g = view.getFloat32(offset, false);
        offset += 4;
        const b = view.getFloat32(offset, false);
        offset += 4;
        const a = view.getFloat32(offset, false);
        offset += 4;
        currentMaterial.diffuseColor = [r, g, b, a];
        break;
      }
      case BG3DTagType.TEXTUREMAP: {
        // Texture header: 4 bytes each: width, height, srcPixelFormat, dstPixelFormat, bufferSize, 4 unused
        if (!currentMaterial)
          throw new Error("No current material for texture");
        const width = view.getUint32(offset, false);
        offset += 4;
        const height = view.getUint32(offset, false);
        offset += 4;
        const srcPixelFormat = view.getUint32(offset, false);
        offset += 4;
        const dstPixelFormat = view.getUint32(offset, false);
        offset += 4;
        const bufferSize = view.getUint32(offset, false);
        offset += 4;
        offset += 16; // skip 4 unused uint32s
        // Texture pixels
        const pixels = new Uint8Array(buffer, offset, bufferSize);
        offset += bufferSize;

        console.log(
          `SrcFormat: ${srcPixelFormat}, DstFormat: ${dstPixelFormat}`,
        );
        console.log(
          `Texture src format: ${getPixelFormatSrcName(
            srcPixelFormat,
          )}, dst format: ${getPixelFormatDstName(dstPixelFormat)}`,
        );
        currentMaterial.textures.push({
          width,
          height,
          srcPixelFormat,
          dstPixelFormat,
          bufferSize,
          pixels,
        });
        break;
      }
      case BG3DTagType.GROUPSTART: {
        // Start a new group and push to stack
        const group: BG3DGroup = { children: [] };

        currentGroup.children.push(group);
        groupStack.push(group);
        currentGroup = group;
        break;
      }
      case BG3DTagType.GROUPEND: {
        // End current group and pop from stack
        if (groupStack.length <= 1) {
          console.warn(`[parseBG3D] GROUPEND tag found but only base group remaining at offset ${tagOffset}, ignoring`);
          break;
        }
        groupStack.pop();
        currentGroup = groupStack[groupStack.length - 1]; //Get last group
        break;
      }

      case BG3DTagType.GEOMETRY: {
        // Geometry header: type (4), numMaterials (4), layerMaterialNum[4] (only 2 read by otto) (16), flags (4), numPoints (4), numTriangles (4)
        if (!currentGroup)
          throw new Error(
            `GEOMETRY tag found outside of a group at offset ${tagOffset}`,
          );
        const type = view.getUint32(offset, false);
        offset += 4;
        const numMaterials = view.getUint32(offset, false);
        offset += 4;
        const layerMaterialNum = [
          view.getUint32(offset, false),
          view.getUint32(offset + 4, false),
          view.getUint32(offset + 8, false),
          view.getUint32(offset + 12, false),
        ];
        offset += 16;
        const geoFlags = view.getUint32(offset, false);
        offset += 4;
        const numPoints = view.getUint32(offset, false);
        offset += 4;
        const numTriangles = view.getUint32(offset, false);
        offset += 4;
        const geom: BG3DGeometry = {
          type,
          numMaterials,
          layerMaterialNum,
          flags: geoFlags,
          numPoints,
          numTriangles,
        };

        currentGroup.children.push(geom);
        currentGeometry = geom;

        //Reserved header offset increase
        //uint32_t	reserved[4];						// for future use in BG3DGeometryHeader
        offset += 16; // Skip reserved header space (4 bytes)

        break;
      }
      case BG3DTagType.VERTEXARRAY: {
        // Vertex array: numPoints * 3 floats
        if (!currentGeometry) {
          console.warn(`[parseBG3D] VERTEXARRAY found without geometry context at offset ${tagOffset}, skipping`);
          // Skip this tag - we need to determine how much data to skip
          // This is tricky without knowing the number of points, so let's try to find the next valid tag
          break;
        }
        const numPoints = currentGeometry.numPoints;
        const vertices: [number, number, number][] = [];
        for (let i = 0; i < numPoints; i++) {
          const x = view.getFloat32(offset, false);
          offset += 4;
          const y = view.getFloat32(offset, false);
          offset += 4;
          const z = view.getFloat32(offset, false);
          offset += 4;
          vertices.push([x, y, z]);
        }
        currentGeometry.vertices = vertices;
        break;
      }
      case BG3DTagType.NORMALARRAY: {
        // Normal array: numPoints * 3 floats
        if (!currentGeometry) {
          console.warn(`[parseBG3D] NORMALARRAY found without geometry context at offset ${tagOffset}, skipping`);
          break;
        }
        const numPoints = currentGeometry.numPoints;
        const normals: [number, number, number][] = [];
        for (let i = 0; i < numPoints; i++) {
          const x = view.getFloat32(offset, false);
          offset += 4;
          const y = view.getFloat32(offset, false);
          offset += 4;
          const z = view.getFloat32(offset, false);
          offset += 4;
          normals.push([x, y, z]);
        }
        currentGeometry.normals = normals;
        break;
      }
      case BG3DTagType.UVARRAY: {
        // UV array: numPoints * 2 floats
        if (!currentGeometry) {
          console.warn(`[parseBG3D] UVARRAY found without geometry context at offset ${tagOffset}, skipping`);
          break;
        }
        const numPoints = currentGeometry.numPoints;
        const uvs: [number, number][] = [];
        for (let i = 0; i < numPoints; i++) {
          const u = view.getFloat32(offset, false);
          offset += 4;
          const v = view.getFloat32(offset, false);
          offset += 4;
          uvs.push([u, v]);
        }
        currentGeometry.uvs = uvs;
        break;
      }
      case BG3DTagType.COLORARRAY: {
        // Color array: numPoints * 4 bytes (RGBA)
        if (!currentGeometry) {
          console.warn(`[parseBG3D] COLORARRAY found without geometry context at offset ${tagOffset}, skipping`);
          break;
        }
        const numPoints = currentGeometry.numPoints;
        const colors: [number, number, number, number][] = [];
        for (let i = 0; i < numPoints; i++) {
          const r = view.getUint8(offset++);
          const g = view.getUint8(offset++);
          const b = view.getUint8(offset++);
          const a = view.getUint8(offset++);
          colors.push([r, g, b, a]);
        }
        currentGeometry.colors = colors;
        break;
      }
      case BG3DTagType.TRIANGLEARRAY: {
        // Triangle array: numTriangles * 3 uint32
        if (!currentGeometry) {
          console.warn(`[parseBG3D] TRIANGLEARRAY found without geometry context at offset ${tagOffset}, skipping`);
          break;
        }
        const numTriangles = currentGeometry.numTriangles;
        const triangles: [number, number, number][] = [];
        for (let i = 0; i < numTriangles; i++) {
          const a = view.getUint32(offset, false);
          offset += 4;
          const b = view.getUint32(offset, false);
          offset += 4;
          const c = view.getUint32(offset, false);
          offset += 4;
          triangles.push([a, b, c]);
        }
        currentGeometry.triangles = triangles;
        // Keep currentGeometry for potential BOUNDINGBOX tag that may follow
        break;
      }
      case BG3DTagType.BOUNDINGBOX: {
        // Bounding box: 6 floats (min x/y/z, max x/y/z)
        if (!currentGeometry) {
          console.warn(`[parseBG3D] BOUNDINGBOX found without geometry context at offset ${tagOffset}, skipping`);
          break;
        }
        const minX = view.getFloat32(offset, false);
        offset += 4;
        const minY = view.getFloat32(offset, false);
        offset += 4;
        const minZ = view.getFloat32(offset, false);
        offset += 4;
        const maxX = view.getFloat32(offset, false);
        offset += 4;
        const maxY = view.getFloat32(offset, false);
        offset += 4;
        const maxZ = view.getFloat32(offset, false);
        offset += 4;
        currentGeometry.boundingBox = {
          min: [minX, minY, minZ],
          max: [maxX, maxY, maxZ],
        };
        break;
      }
      case BG3DTagType.JPEGTEXTURE: {
        // JPEG Texture: similar to TEXTUREMAP but with JPEG compressed data
        // There are two formats: pure JPEG data, or JPEG + embedded diffuse color
        if (!currentMaterial)
          throw new Error("No current material for JPEG texture");
        console.log(`[JPEGTEXTURE] Starting parse at offset ${offset}`);
        const width = view.getUint32(offset, false);
        offset += 4;
        const height = view.getUint32(offset, false);
        offset += 4;
        const bufferSize = view.getUint32(offset, false);
        offset += 4;
        offset += 20; // skip 5 unused uint32s (20 bytes)
        console.log(`[JPEGTEXTURE] Dimensions: ${width}x${height}, buffer: ${bufferSize} bytes, data starts at: ${offset}`);
        
        // Validate that the dimensions are reasonable (1x1 to 4096x4096)
        if (width < 1 || width > 4096 || height < 1 || height > 4096) {
          throw new Error(`Invalid JPEGTEXTURE dimensions: ${width}x${height} at offset ${offset - 32}`);
        }
        
        // Validate that buffer size is reasonable
        const remainingBytes = buffer.byteLength - offset;
        if (bufferSize < 1 || bufferSize > remainingBytes) {
          throw new Error(`Invalid JPEGTEXTURE buffer size: ${bufferSize} bytes (remaining: ${remainingBytes}) at offset ${offset - 32}`);
        }
        
        // Find the actual JPEG end by looking for FF D9 marker
        const bufferData = new Uint8Array(buffer, offset, bufferSize);
        let jpegSize = bufferSize; // Default fallback
        for (let i = 0; i < bufferSize - 1; i++) {
          if (bufferData[i] === 0xFF && bufferData[i + 1] === 0xD9) {
            jpegSize = i + 2; // Include the end marker
            break;
          }
        }
        
        // Determine format by checking if there are 1.0 floats at expected diffuse locations
        const dataAfterJpeg = bufferSize - jpegSize;
        let hasEmbeddedDiffuse = false;
        
        if (dataAfterJpeg >= 4 && offset + bufferSize + 12 <= buffer.byteLength) {
          // Check if the last 4 bytes of buffer contain a 1.0 float
          const potentialR = view.getFloat32(offset + bufferSize - 4, false);
          // Check if the next 3 values after buffer are also 1.0 floats
          const potentialG = view.getFloat32(offset + bufferSize, false);
          const potentialB = view.getFloat32(offset + bufferSize + 4, false);
          const potentialA = view.getFloat32(offset + bufferSize + 8, false);
          
          // If we have 4 consecutive 1.0 values, it's likely diffuse color
          if (Math.abs(potentialR - 1.0) < 0.001 && 
              Math.abs(potentialG - 1.0) < 0.001 && 
              Math.abs(potentialB - 1.0) < 0.001 && 
              Math.abs(potentialA - 1.0) < 0.001) {
            hasEmbeddedDiffuse = true;
          }
        }
        
        if (hasEmbeddedDiffuse) {
          // Format 1: JPEG + embedded diffuse color (first float in buffer, rest after)
          console.log(`[JPEGTEXTURE] Format: embedded diffuse (${dataAfterJpeg} bytes after JPEG)`);
          const jpegData = new Uint8Array(buffer, offset, jpegSize);
          
          // First diffuse float is the last 4 bytes of the buffer
          const r = view.getFloat32(offset + bufferSize - 4, false);
          
          // Skip the buffer and read the remaining 3 diffuse floats
          offset += bufferSize;
          if (offset + 12 <= buffer.byteLength) {
            const g = view.getFloat32(offset, false);
            offset += 4;
            const b = view.getFloat32(offset, false);
            offset += 4;
            const a = view.getFloat32(offset, false);
            offset += 4;
            
            currentMaterial.diffuseColor = [r, g, b, a];
            console.log(`[JPEGTEXTURE] JPEG size: ${jpegSize}, diffuse: [${r}, ${g}, ${b}, ${a}], offset now: ${offset}`);
          } else {
            // Not enough data for full diffuse color, treat as pure JPEG
            console.log(`[JPEGTEXTURE] Not enough data for diffuse color, treating as pure JPEG`);
            offset += bufferSize;
            console.log(`[JPEGTEXTURE] JPEG size: ${jpegSize}, offset now: ${offset}`);
          }
          
          currentMaterial.jpegTextures.push({
            width,
            height,
            bufferSize: jpegSize,
            jpegData,
          });
        } else {
          // Format 2: Pure JPEG data - check if there might be diffuse color after buffer
          console.log(`[JPEGTEXTURE] Format: pure JPEG (${dataAfterJpeg} bytes after JPEG)`);
          const jpegData = new Uint8Array(buffer, offset, jpegSize);
          offset += bufferSize;
          
          // Check if the next 16 bytes might be diffuse color data
          if (offset + 16 <= buffer.byteLength) {
            const potentialR = view.getFloat32(offset, false);
            const potentialG = view.getFloat32(offset + 4, false);
            const potentialB = view.getFloat32(offset + 8, false);
            const potentialA = view.getFloat32(offset + 12, false);
            
            // If we have reasonable float values (not too large), treat as diffuse color
            if (Math.abs(potentialR) <= 2.0 && Math.abs(potentialG) <= 2.0 && 
                Math.abs(potentialB) <= 2.0 && Math.abs(potentialA) <= 2.0) {
              currentMaterial.diffuseColor = [potentialR, potentialG, potentialB, potentialA];
              offset += 16; // Skip the diffuse color data
              console.log(`[JPEGTEXTURE] JPEG size: ${jpegSize}, diffuse: [${potentialR}, ${potentialG}, ${potentialB}, ${potentialA}], offset now: ${offset}`);
            } else {
              console.log(`[JPEGTEXTURE] JPEG size: ${jpegSize}, no diffuse color detected, offset now: ${offset}`);
            }
          } else {
            console.log(`[JPEGTEXTURE] JPEG size: ${jpegSize}, offset now: ${offset}`);
          }
          
          currentMaterial.jpegTextures.push({
            width,
            height,
            bufferSize: jpegSize,
            jpegData,
          });
        }
        break;
      }
      case BG3DTagType.ENDFILE: {
        done = true;
        break;
      }
      default: {
        throw new Error(`Unknown BG3D tag: ${tag} at offset ${offset - 4}`);
      }
    }
  }

  // Step 2: Validate that all groups are closed (groupStack should just have the base group)
  if (groupStack.length < 1) {
    console.warn(`[parseBG3D] Warning: Group stack empty at end of file, this may indicate malformed data`);
  } else if (groupStack.length > 1) {
    console.warn(`[parseBG3D] Warning: ${groupStack.length - 1} unclosed group(s) at end of file`);
  }

  // Step 3: Validate that all geometry objects reference valid material indices
  // Recursively check all groups and their children
  function validateGeometryMaterials(group: BG3DGroup) {
    for (const child of group.children) {
      if (isBG3DGroup(child) && Array.isArray(child.children)) {
        validateGeometryMaterials(child);
      } else {
        const geom = child as BG3DGeometry;
        if (geom.layerMaterialNum) {
          for (let i = 0; i < geom.numMaterials; i++) {
            const matIdx = geom.layerMaterialNum[i];
            if (matIdx < 0 || matIdx >= materials.length) {
              throw new Error(
                `Geometry references invalid material index ${matIdx} (materials length: ${materials.length}) in group validation`,
              );
            }
          }
        }
      }
    }
  }
  for (const group of groups) {
    validateGeometryMaterials(group);
  }

  // Step 5: Ensure at least one group and one material exist
  if (groups.length === 0) {
    throw new Error("No groups found in BG3D file");
  }
  if (materials.length === 0) {
    throw new Error("No materials found in BG3D file");
  }

  return {
    materials,
    groups,
  };
}

/**
 * Serialize a BG3DParseResult back to a BG3D ArrayBuffer
 * This reverses the logic of parseBG3D.ts
 * @param parsed BG3DParseResult to serialize
 * @param gameType Game type to determine which features to include
 */
export function bg3dParsedToBG3D(parsed: BG3DParseResult, gameType: Game = Game.NANOSAUR_2): ArrayBuffer {
  // Static property to track offset
  let offset = 0;

  // Estimate buffer size (over-allocate, then slice)
  const size = 1024 * 1024 * 10; // 1MB default, grow if needed
  const buffer = new ArrayBuffer(size);
  const view = new DataView(buffer);

  // Write header: use original if provided, else default

  view.setUint8(offset++, "B".charCodeAt(0));
  view.setUint8(offset++, "G".charCodeAt(0));
  view.setUint8(offset++, "3".charCodeAt(0));
  view.setUint8(offset++, "D".charCodeAt(0));
  for (let i = 0; i < 16; i++) view.setUint8(offset++, 0);

  console.log("Writing header at offset", offset);

  // Write all materials
  for (const material of parsed.materials) {
    // MATERIALFLAGS
    console.log(`[bg3dParsedToBG3D] Write MATERIALFLAGS at offset ${offset}`);
    view.setUint32(offset, BG3DTagType.MATERIALFLAGS, false);
    offset += 4;
    view.setUint32(offset, material.flags, false);
    offset += 4;
    // MATERIALDIFFUSECOLOR
    console.log(
      `[bg3dParsedToBG3D] Write MATERIALDIFFUSECOLOR at offset ${offset}`,
    );
    view.setUint32(offset, BG3DTagType.MATERIALDIFFUSECOLOR, false);
    offset += 4;
    for (let i = 0; i < 4; i++) {
      view.setFloat32(offset, material.diffuseColor[i], false);
      offset += 4;
    }
    // TEXTUREMAP(s)
    for (const tex of material.textures) {
      console.log(`[bg3dParsedToBG3D] Write TEXTUREMAP at offset ${offset}`);
      view.setUint32(offset, BG3DTagType.TEXTUREMAP, false);
      offset += 4;
      view.setUint32(offset, tex.width, false);
      offset += 4;
      view.setUint32(offset, tex.height, false);
      offset += 4;
      view.setUint32(offset, tex.srcPixelFormat, false);
      offset += 4;
      view.setUint32(offset, tex.dstPixelFormat, false);
      offset += 4;
      view.setUint32(offset, tex.bufferSize, false);
      offset += 4;
      for (let i = 0; i < 4; i++) {
        view.setUint32(offset, 0, false);
        offset += 4;
      } // reserved
      // Write pixel data

      new Uint8Array(buffer, offset, tex.bufferSize).set(tex.pixels);
      offset += tex.bufferSize;
    }
    // JPEGTEXTURE(s) - only for Nanosaur 2
    if (gameType === Game.NANOSAUR_2) {
      for (const jpegTex of material.jpegTextures) {
        console.log(`[bg3dParsedToBG3D] Write JPEGTEXTURE at offset ${offset}`);
        view.setUint32(offset, BG3DTagType.JPEGTEXTURE, false);
        offset += 4;
        view.setUint32(offset, jpegTex.width, false);
        offset += 4;
        view.setUint32(offset, jpegTex.height, false);
        offset += 4;
        view.setUint32(offset, jpegTex.bufferSize, false);
        offset += 4;
        for (let i = 0; i < 5; i++) {
          view.setUint32(offset, 0, false);
          offset += 4;
        } // reserved (20 bytes)
        // Write JPEG data
        new Uint8Array(buffer, offset, jpegTex.bufferSize).set(jpegTex.jpegData);
        offset += jpegTex.bufferSize;
      }
    }
  }

  console.log("NUM PARSED GROUPS:", parsed.groups.length);
  // Write groups and all group-specific data
  parsed.groups.forEach((group) => {
    offset = writeGroup(view, buffer, group, offset, true, gameType);
  });

  // ENDFILE
  console.log("Writing ENDFILE at offset", offset);
  view.setUint32(offset, BG3DTagType.ENDFILE, false);
  offset += 4;

  // Return the used slice
  return buffer.slice(0, offset);
}

// Helper to write a group and its children recursively, preserving order
function writeGroup(
  view: DataView,
  buffer: ArrayBuffer,
  group: BG3DGroup,
  startOffset: number,
  isBaseGroup: boolean,
  gameType: Game = Game.NANOSAUR_2,
): number {
  let offset = startOffset;
  // GROUPSTART

  if (!isBaseGroup) {
    console.log(`[bg3dParsedToBG3D] Write GROUPSTART at offset ${offset}`);
    view.setUint32(offset, BG3DTagType.GROUPSTART, false);
    offset += 4;
  }

  for (const child of group.children) {
    if (isBG3DGroup(child)) {
      offset = writeGroup(view, buffer, child, offset, false, gameType);
    } else {
      // GEOMETRY tag
      const geom = child;
      console.log(`[bg3dParsedToBG3D] Write GEOMETRY at offset ${offset}`);
      view.setUint32(offset, BG3DTagType.GEOMETRY, false);
      offset += 4;
      view.setUint32(offset, geom.type, false);
      offset += 4;
      view.setInt32(offset, geom.numMaterials, false);
      offset += 4;
      for (let i = 0; i < 4; i++) {
        view.setUint32(offset, geom.layerMaterialNum?.[i] ?? 0, false);
        offset += 4;
      }
      //
      console.log("numMaterials:", geom.numMaterials);
      console.log("layerMaterialNum:", geom.layerMaterialNum);
      view.setUint32(offset, geom.flags, false);
      offset += 4;
      view.setUint32(offset, geom.numPoints, false);
      offset += 4;
      view.setUint32(offset, geom.numTriangles, false);
      offset += 4;
      // Write reserved[4] (16 bytes, all zeros)
      for (let i = 0; i < 4; i++) {
        view.setUint32(offset, 0, false);
        offset += 4;
      }

      // Write arrays if present
      if (geom.vertices) {
        console.log(`[bg3dParsedToBG3D] Write VERTEXARRAY at offset ${offset}`);
        view.setUint32(offset, BG3DTagType.VERTEXARRAY, false);
        offset += 4;
        for (const [x, y, z] of geom.vertices) {
          view.setFloat32(offset, x, false);
          offset += 4;
          view.setFloat32(offset, y, false);
          offset += 4;
          view.setFloat32(offset, z, false);
          offset += 4;
        }
      }
      if (geom.normals) {
        console.log(`[bg3dParsedToBG3D] Write NORMALARRAY at offset ${offset}`);
        view.setUint32(offset, BG3DTagType.NORMALARRAY, false);
        offset += 4;
        for (const [x, y, z] of geom.normals) {
          view.setFloat32(offset, x, false);
          offset += 4;
          view.setFloat32(offset, y, false);
          offset += 4;
          view.setFloat32(offset, z, false);
          offset += 4;
        }
      }
      if (geom.uvs) {
        console.log(`[bg3dParsedToBG3D] Write UVARRAY at offset ${offset}`);
        view.setUint32(offset, BG3DTagType.UVARRAY, false);
        offset += 4;
        for (const [u, v] of geom.uvs) {
          view.setFloat32(offset, u, false);
          offset += 4;
          view.setFloat32(offset, v, false);
          offset += 4;
        }
      }
      if (geom.colors) {
        console.log(`[bg3dParsedToBG3D] Write COLORARRAY at offset ${offset}`);
        view.setUint32(offset, BG3DTagType.COLORARRAY, false);
        offset += 4;
        for (const [r, g, b, a] of geom.colors) {
          view.setUint8(offset++, r);
          view.setUint8(offset++, g);
          view.setUint8(offset++, b);
          view.setUint8(offset++, a);
        }
      }
      if (geom.triangles) {
        console.log(
          `[bg3dParsedToBG3D] Write TRIANGLEARRAY at offset ${offset}`,
        );
        view.setUint32(offset, BG3DTagType.TRIANGLEARRAY, false);
        offset += 4;
        for (const [a, b, c] of geom.triangles) {
          view.setUint32(offset, a, false);
          offset += 4;
          view.setUint32(offset, b, false);
          offset += 4;
          view.setUint32(offset, c, false);
          offset += 4;
        }
      }
      // BOUNDINGBOX - disabled for Cro Mag and Otto Matic
      if (geom.boundingBox && gameType !== Game.CRO_MAG && gameType !== Game.OTTO_MATIC) {
        console.log(`[bg3dParsedToBG3D] Write BOUNDINGBOX at offset ${offset}`);
        view.setUint32(offset, BG3DTagType.BOUNDINGBOX, false);
        offset += 4;
        // Write min and max coordinates
        view.setFloat32(offset, geom.boundingBox.min[0], false);
        offset += 4;
        view.setFloat32(offset, geom.boundingBox.min[1], false);
        offset += 4;
        view.setFloat32(offset, geom.boundingBox.min[2], false);
        offset += 4;
        view.setFloat32(offset, geom.boundingBox.max[0], false);
        offset += 4;
        view.setFloat32(offset, geom.boundingBox.max[1], false);
        offset += 4;
        view.setFloat32(offset, geom.boundingBox.max[2], false);
        offset += 4;
      }
    }
  }

  // GROUPEND
  if (!isBaseGroup) {
    console.log(`[bg3dParsedToBG3D] Write GROUPEND at offset ${offset}`);
    view.setUint32(offset, BG3DTagType.GROUPEND, false);
    offset += 4;
  }
  return offset;
}

function isBG3DGroup(obj: BG3DGeometry | BG3DGroup): obj is BG3DGroup {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "children" in obj &&
    Array.isArray(obj.children)
  );
}

/* function isBG3DGeometry(obj: BG3DGeometry | BG3DGroup): obj is BG3DGeometry {
  return !!obj && !Array.isArray((obj as any).children);
}
 */
