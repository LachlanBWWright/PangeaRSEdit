// parseBG3D.ts
// Full BG3D file parser for Otto Matic and related games

import type { SkeletonResource } from "../python/structSpecs/skeleton/skeletonInterface";
import { Result, ok, err } from "../types/result";

// Type guard helper
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

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
  BG3D_MATERIALFLAG_ALWAYSBLEND = 2, // set if always want to GL_BLEND this texture when drawn
  BG3D_MATERIALFLAG_CLAMP_U = 4, // Block horizontal texture tiling?
  BG3D_MATERIALFLAG_CLAMP_V = 8, // Block vertical texture tiling?
  BG3D_MATERIALFLAG_MULTITEXTURE = 16,
  BG3D_MATERIALFLAG_CLAMP_U_TRUE = 32, // Nanosaur 2 only, no idea what this does
  BG3D_MATERIALFLAG_CLAMP_V_TRUE = 64, // Nanosaur 2 only, no idea what this does
}
//Raw Data that gets parsed into BG3DParseResult

export interface BG3DMaterial {
  flags: number;
  diffuseColor: [number, number, number, number];
  textures: BG3DTexture[]; // Support for mipmaps
  // ...other material properties as needed
}

export interface BG3DTexture {
  width: number;
  height: number;
  srcPixelFormat: PixelFormatSrc | number; // number allows JPEG marker (-1)
  dstPixelFormat: PixelFormatDst | number; // number allows JPEG alpha marker (-2)
  bufferSize: number;
  pixels: Uint8Array;
  isJpeg?: boolean; // True if this is JPEG data (Nanosaur 2)
  jpegAlphaData?: Uint8Array; // Separate alpha channel for JPEG (Nanosaur 2)
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

// Skeleton data structures for BG3D
export interface BG3DBone {
  parentBone: number; // -1 if no parent, otherwise index of parent bone
  name: string;
  coordX: number;
  coordY: number;
  coordZ: number;
  numPointsAttachedToBone: number;
  numNormalsAttachedToBone: number;
  pointIndices?: number[]; // Indices of points attached to this bone
  normalIndices?: number[]; // Indices of normals attached to this bone
  // Reserved fields from Bone struct (8 uint32s = 32 bytes)
  reserved0?: number;
  reserved1?: number;
  reserved2?: number;
  reserved3?: number;
  reserved4?: number;
  reserved5?: number;
  reserved6?: number;
  reserved7?: number;
}

export interface BG3DKeyframe {
  tick: number;
  accelerationMode: number;
  coordX: number;
  coordY: number;
  coordZ: number;
  rotationX: number;
  rotationY: number;
  rotationZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

export interface BG3DAnimationEvent {
  time: number;
  type: number;
  value: number;
}

export interface BG3DAnimation {
  name: string;
  numAnimEvents: number;
  events: BG3DAnimationEvent[];
  keyframes: Record<number, BG3DKeyframe[]>; // Keyframes per bone
}

export interface BG3DSkeleton {
  version: number;
  numAnims: number;
  numJoints: number;
  num3DMFLimbs: number;
  bones: BG3DBone[];
  animations: BG3DAnimation[];
  // Relative point lists (RelP) parsed from SkeletonResource.RelP
  // Keyed by original resource id (e.g. "1000") with array of [x,y,z] points
  relPoints?: Record<string, [number, number, number][]>;
  // alis resource data for roundtrip preservation (not used in glTF but needed for binary export)
  alisData?: Record<string, unknown>;
  // Original skeleton resource metadata for roundtrip preservation
  metadata?: Record<string, unknown>;
}

export interface BG3DParseResult {
  materials: BG3DMaterial[];
  groups: BG3DGroup[];
  skeleton?: BG3DSkeleton;
}

/**
 * Parse a .bg3d file from an ArrayBuffer
 * @param buffer ArrayBuffer containing the .bg3d file
 * @param skeleton Optional skeleton data to include in the result
 * @returns Result<BG3DParseResult, Error>
 */
export function parseBG3D(
  buffer: ArrayBuffer,
  skeleton?: SkeletonResource,
): Result<BG3DParseResult, Error> {
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
    return err(new Error("Not a BG3D file"));
  }

  // Skip remainder of header (BG3DHeaderType is 20 bytes, 16 byte string, 4 byte version)
  offset += 16;

  // Main parse state
  // Material and group lists
  const materials: BG3DMaterial[] = [];
  const rootGroup: BG3DGroup = { children: [] };
  const groups: BG3DGroup[] = [rootGroup]; // Start with a top-level group
  let done = false;
  // Group stack for nested group support
  const groupStack: BG3DGroup[] = [rootGroup];
  // Track the current group for children insertion
  let currentGroup: BG3DGroup = rootGroup;
  // Track the current geometry for array tags
  let currentGeometry: BG3DGeometry | null = null;

  // Current material being built
  let currentMaterial: BG3DMaterial | null = null;

  // Tag-based parsing loop
  while (!done && offset < buffer.byteLength) {
    if (offset + 4 > buffer.byteLength) break;
    const tagValue = view.getUint32(offset, false);
    const tag = tagValue;
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
        };
        materials.push(currentMaterial);
        break;
      }
      case BG3DTagType.MATERIALDIFFUSECOLOR: {
        // 4 floats (RGBA)
        if (!currentMaterial) {
          return err(new Error("No current material for diffuse color"));
        }
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
        if (!currentMaterial) {
          return err(new Error("No current material for texture"));
        }
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
      case BG3DTagType.JPEGTEXTURE: {
        // JPEG texture (Nanosaur 2 only)
        // Header: width (4), height (4), bufferSize (4), hasAlphaChannel (4) = 16 bytes
        if (!currentMaterial) {
          return err(new Error("No current material for JPEG texture"));
        }
        const width = view.getUint32(offset, false);
        offset += 4;
        const height = view.getUint32(offset, false);
        offset += 4;
        const bufferSize = view.getUint32(offset, false);
        offset += 4;
        const hasAlphaChannel = view.getUint32(offset, false);
        offset += 4;

        // Read JPEG data
        const jpegData = new Uint8Array(buffer, offset, bufferSize);
        offset += bufferSize;

        // Read alpha channel if present
        let jpegAlphaData: Uint8Array | undefined = undefined;
        if (hasAlphaChannel) {
          const alphaSize = width * height;
          jpegAlphaData = new Uint8Array(buffer, offset, alphaSize);
          offset += alphaSize;
        }

        // Store as a special texture type with JPEG marker
        currentMaterial.textures.push({
          width,
          height,
          srcPixelFormat: -1, // Special marker for JPEG
          dstPixelFormat: hasAlphaChannel ? -2 : -1, // -2 indicates alpha channel present
          bufferSize,
          pixels: jpegData, // Store JPEG data
          isJpeg: true,
          jpegAlphaData,
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
        if (groupStack.length === 0) {
          return err(
            new Error(
              `GROUPEND tag found with no open group at offset ${tagOffset}`,
            ),
          );
        }
        if (groupStack.length > 0) {
          groupStack.pop();
          const lastGroup = groupStack[groupStack.length - 1];
          if (!lastGroup) {
            return err(new Error("GROUPEND tag found with no open group"));
          }
          currentGroup = lastGroup;
        } else {
          //There should be a base group not mentioned in open/closed tags
          return err(new Error("GROUPEND tag found with no open group"));
        }
        break;
      }

      case BG3DTagType.GEOMETRY: {
        // Geometry header: type (4), numMaterials (4), layerMaterialNum[4] (only 2 read by otto) (16), flags (4), numPoints (4), numTriangles (4)
        if (!currentGroup) {
          return err(
            new Error(
              `GEOMETRY tag found outside of a group at offset ${tagOffset}`,
            ),
          );
        }
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
          return err(new Error("No geometry for vertex array"));
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
          return err(new Error("No geometry for normal array"));
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
          return err(new Error("No geometry for uv array"));
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
          return err(new Error("No geometry for color array"));
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
          return err(new Error("No geometry for triangle array"));
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
        // Note: Do NOT reset currentGeometry here - BOUNDINGBOX may follow in later games
        break;
      }
      case BG3DTagType.BOUNDINGBOX: {
        // Bounding box: 6 floats (min x/y/z, max x/y/z) + 1 byte isEmpty + 3 bytes padding = 28 bytes total
        // Used by Bugdom 2, Billy Frontier, and Nanosaur 2
        if (!currentGeometry) {
          return err(new Error("No geometry for bounding box"));
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
        // isEmpty byte + 3 padding bytes
        offset += 4;
        currentGeometry.boundingBox = {
          min: [minX, minY, minZ],
          max: [maxX, maxY, maxZ],
        };
        break;
      }
      case BG3DTagType.ENDFILE: {
        done = true;
        break;
      }
      default: {
        return err(
          new Error(`Unknown BG3D tag: ${tag} at offset ${offset - 4}`),
        );
      }
    }
  }

  // Step 2: Validate that all groups are closed (groupStack should just have the base group)
  if (groupStack.length !== 1) {
    return err(
      new Error(
        `Unbalanced group tags: ${groupStack.length} group(s) at end of file`,
      ),
    );
  }

  // Step 3: Validate that all geometry objects reference valid material indices
  // Recursively check all groups and their children
  function validateGeometryMaterials(group: BG3DGroup): Result<void, Error> {
    for (const child of group.children) {
      if (isBG3DGroup(child) && Array.isArray(child.children)) {
        const result = validateGeometryMaterials(child);
        if (result.isErr()) return result;
      } else if (isBG3DGeometry(child)) {
        const geom = child;
        if (geom.layerMaterialNum) {
          for (let i = 0; i < geom.numMaterials; i++) {
            const matIdx = geom.layerMaterialNum[i];
            if (
              matIdx !== undefined &&
              (matIdx < 0 || matIdx >= materials.length)
            ) {
              return err(
                new Error(
                  `Geometry references invalid material index ${matIdx} (materials length: ${materials.length}) in group validation`,
                ),
              );
            }
          }
        }
      }
    }
    return ok(undefined);
  }
  for (const group of groups) {
    const validationResult = validateGeometryMaterials(group);
    if (validationResult.isErr()) {
      return err(validationResult.error);
    }
  }

  // Step 5: Ensure at least one group and one material exist
  if (groups.length === 0) {
    return err(new Error("No groups found in BG3D file"));
  }
  if (materials.length === 0) {
    return err(new Error("No materials found in BG3D file"));
  }

  return ok({
    materials,
    groups,
    skeleton: skeleton ? convertSkeletonResourceToBG3D(skeleton) : undefined,
  });
}

/**
 * Convert a SkeletonResource to BG3DSkeleton format
 */
function convertSkeletonResourceToBG3D(
  skeleton: SkeletonResource,
): BG3DSkeleton {
  // Get header information
  const headerEntries = Object.values(skeleton.Hedr);
  const header = headerEntries[0]?.obj || {
    version: 0,
    numAnims: 0,
    numJoints: 0,
    num3DMFLimbs: 0,
  };

  // Convert bones
  const bones: BG3DBone[] = [];
  const boneEntries = Object.entries(skeleton.Bone || {});

  // Sort by order to maintain correct indices
  boneEntries.sort(([, a], [, b]) => a.order - b.order);

  boneEntries.forEach(([boneId, boneEntry]) => {
    const boneObj = boneEntry.obj;

    // Get point indices for this bone
    const pointIndices: number[] = [];
    const bonePEntry = skeleton.BonP?.[boneId];
    if (bonePEntry) {
      pointIndices.push(...bonePEntry.obj.map((p) => p.pointIndex));
    }

    // Get normal indices for this bone
    const normalIndices: number[] = [];
    const boneNEntry = skeleton.BonN?.[boneId];
    if (boneNEntry) {
      normalIndices.push(...boneNEntry.obj.map((n) => n.normal));
    }

    bones.push({
      parentBone: boneObj.parentBone,
      name: boneObj.name || boneEntry.name, // Use obj.name (actual bone name), fallback to resource name
      coordX: boneObj.coordX,
      coordY: boneObj.coordY,
      coordZ: boneObj.coordZ,
      numPointsAttachedToBone: boneObj.numPointsAttachedToBone,
      numNormalsAttachedToBone: boneObj.numNormalsAttachedToBone,
      reserved0: boneObj.reserved0,
      reserved1: boneObj.reserved1,
      reserved2: boneObj.reserved2,
      reserved3: boneObj.reserved3,
      reserved4: boneObj.reserved4,
      reserved5: boneObj.reserved5,
      reserved6: boneObj.reserved6,
      reserved7: boneObj.reserved7,
      pointIndices,
      normalIndices,
    });
  });

  // Convert animations
  const animations: BG3DAnimation[] = [];
  const animHeaderEntries = Object.entries(skeleton.AnHd || {});

  // Sort animation headers by their resource ID to ensure correct order
  animHeaderEntries.sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10));

  animHeaderEntries.forEach(([animId, animEntry]) => {
    const animHeader = animEntry.obj;

    // Calculate the actual animation index from the resource ID
    // AnHd resource IDs are sequential: 1000, 1001, 1002, ..., 1034
    // But KeyF resource IDs follow pattern: 1000+(animIndex*100)+boneIndex
    // So animation 0 uses KeyF 1000-1015, animation 1 uses KeyF 1100-1115, etc.
    const animResourceId = parseInt(animId, 10);
    const animIndex = animResourceId - 1000; // This is correct for both AnHd and KeyF mapping

    // Get animation events
    const events: BG3DAnimationEvent[] = [];
    const eventEntry = skeleton.Evnt?.[animId];
    if (eventEntry) {
      eventEntry.obj.forEach((event) => {
        events.push({
          time: event.time,
          type: event.type,
          value: event.value,
        });
      });
    }

    // Get keyframes for all bones in this animation
    const keyframes: Record<number, BG3DKeyframe[]> = {};

    // Initialize keyframes arrays for all bones
    for (let boneIndex = 0; boneIndex < bones.length; boneIndex++) {
      keyframes[boneIndex] = [];
    }

    // Parse keyframes from individual KeyF resources
    // Each KeyF resource follows the pattern: 1000 + (animIndex * 100) + boneIndex
    // Where animIndex is the actual animation index (0-34), not the forEach index

    for (let boneIndex = 0; boneIndex < bones.length; boneIndex++) {
      // KeyF resource pattern: 1000 + (animIndex * 100) + boneIndex
      // Animation 0: 1000-1015, Animation 1: 1100-1115, etc.
      const keyframeResourceId = (
        1000 +
        animIndex * 100 +
        boneIndex
      ).toString();
      const keyframeEntry = skeleton.KeyF?.[keyframeResourceId];

      if (
        keyframeEntry &&
        keyframeEntry.obj &&
        Array.isArray(keyframeEntry.obj)
      ) {
        const boneKeyframes = keyframes[boneIndex];
        if (boneKeyframes) {
          keyframeEntry.obj.forEach((keyframe) => {
            boneKeyframes.push({
              tick: keyframe.tick,
              accelerationMode: keyframe.accelerationMode,
              coordX: keyframe.coordX,
              coordY: keyframe.coordY,
              coordZ: keyframe.coordZ,
              rotationX: keyframe.rotationX,
              rotationY: keyframe.rotationY,
              rotationZ: keyframe.rotationZ,
              scaleX: keyframe.scaleX,
              scaleY: keyframe.scaleY,
              scaleZ: keyframe.scaleZ,
            });
          });
        }
      }
    }

    animations.push({
      name: animHeader.animName,
      numAnimEvents: animHeader.numAnimEvents,
      events,
      keyframes,
    });
  });

  // Build RelP map from SkeletonResource (if present)
  const relPointsMap: Record<string, [number, number, number][]> = {};
  Object.entries(skeleton.RelP || {}).forEach(([rid, rentry]) => {
    const arr = rentry.obj;
    if (Array.isArray(arr)) {
      relPointsMap[rid] = arr.map((p: unknown) => {
        if (!isRecord(p)) return [0, 0, 0];
        const obj = p;
        const relOffsetX =
          typeof obj.relOffsetX === "number"
            ? obj.relOffsetX
            : typeof obj.x === "number"
            ? obj.x
            : 0;
        const relOffsetY =
          typeof obj.relOffsetY === "number"
            ? obj.relOffsetY
            : typeof obj.y === "number"
            ? obj.y
            : 0;
        const relOffsetZ =
          typeof obj.relOffsetZ === "number"
            ? obj.relOffsetZ
            : typeof obj.z === "number"
            ? obj.z
            : 0;
        return [relOffsetX, relOffsetY, relOffsetZ];
      });
    } else {
      relPointsMap[rid] = [];
    }
  });

  // Extract alis data from skeleton resource (stored at skeleton.alis = { "1000": {...} })
  // We want to preserve just the inner structure { "1000": { name: "alis", order: 1000, data: "..." } }
  let alisData: Record<string, unknown> | undefined = undefined;
  Object.keys(skeleton).forEach((key) => {
    if (key.toLowerCase() === "alis") {
      // Store the inner structure directly, not wrapped in another object
      const skelKey = skeleton[key as keyof typeof skeleton];
      if (isRecord(skelKey)) {
        alisData = skelKey;
      }
    }
  });

  return {
    version: header.version,
    numAnims: header.numAnims,
    numJoints: header.numJoints,
    num3DMFLimbs: header.num3DMFLimbs,
    bones,
    animations,
    relPoints: relPointsMap,
    alisData:
      alisData && Object.keys(alisData).length > 0 ? alisData : undefined,
    metadata: skeleton._metadata,
  };
}

/**
 * Serialize a BG3DParseResult back to a BG3D ArrayBuffer
 * This reverses the logic of parseBG3D.ts
 */
export function bg3dParsedToBG3D(parsed: BG3DParseResult): ArrayBuffer {
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

  // Write all materials
  for (const material of parsed.materials) {
    // MATERIALFLAGS
    view.setUint32(offset, BG3DTagType.MATERIALFLAGS, false);
    offset += 4;
    view.setUint32(offset, material.flags, false);
    offset += 4;
    // MATERIALDIFFUSECOLOR
    view.setUint32(offset, BG3DTagType.MATERIALDIFFUSECOLOR, false);
    offset += 4;
    for (let i = 0; i < 4; i++) {
      view.setFloat32(offset, material.diffuseColor[i] ?? 0, false);
      offset += 4;
    }
    // TEXTUREMAP(s) or JPEGTEXTURE(s)
    for (const tex of material.textures) {
      if (tex.isJpeg) {
        // Write JPEGTEXTURE (Nanosaur 2)
        view.setUint32(offset, BG3DTagType.JPEGTEXTURE, false);
        offset += 4;
        view.setUint32(offset, tex.width, false);
        offset += 4;
        view.setUint32(offset, tex.height, false);
        offset += 4;
        view.setUint32(offset, tex.bufferSize, false);
        offset += 4;
        view.setUint32(offset, tex.jpegAlphaData ? 1 : 0, false);
        offset += 4;
        // Write JPEG data
        new Uint8Array(buffer, offset, tex.bufferSize).set(tex.pixels);
        offset += tex.bufferSize;
        // Write alpha channel if present
        if (tex.jpegAlphaData) {
          new Uint8Array(buffer, offset, tex.jpegAlphaData.length).set(
            tex.jpegAlphaData,
          );
          offset += tex.jpegAlphaData.length;
        }
      } else {
        // Write standard TEXTUREMAP
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
    }
  }

  // Write groups and all group-specific data
  parsed.groups.forEach((group) => {
    offset = writeGroup(view, buffer, group, offset, true);
  });

  // ENDFILE
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
): number {
  let offset = startOffset;
  // GROUPSTART

  if (!isBaseGroup) {
    view.setUint32(offset, BG3DTagType.GROUPSTART, false);
    offset += 4;
  }

  // Ensure children is an array before iterating
  const children = Array.isArray(group.children) ? group.children : [];
  for (const child of children) {
    if (isBG3DGroup(child)) {
      offset = writeGroup(view, buffer, child, offset, false);
    } else {
      // GEOMETRY tag
      const geom = child;
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
      // Write bounding box if present (Bugdom 2, Billy Frontier, Nanosaur 2)
      if (geom.boundingBox) {
        view.setUint32(offset, BG3DTagType.BOUNDINGBOX, false);
        offset += 4;
        // min x, y, z
        view.setFloat32(offset, geom.boundingBox.min[0], false);
        offset += 4;
        view.setFloat32(offset, geom.boundingBox.min[1], false);
        offset += 4;
        view.setFloat32(offset, geom.boundingBox.min[2], false);
        offset += 4;
        // max x, y, z
        view.setFloat32(offset, geom.boundingBox.max[0], false);
        offset += 4;
        view.setFloat32(offset, geom.boundingBox.max[1], false);
        offset += 4;
        view.setFloat32(offset, geom.boundingBox.max[2], false);
        offset += 4;
        // isEmpty byte (0) + 3 padding bytes
        view.setUint32(offset, 0, false);
        offset += 4;
      }
    }
  }

  // GROUPEND
  if (!isBaseGroup) {
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

function isBG3DGeometry(obj: BG3DGeometry | BG3DGroup): obj is BG3DGeometry {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "layerMaterialNum" in obj
  );
}

/**
 * Convert BG3DSkeleton back to SkeletonResource format
 */
export function convertBG3DToSkeletonResource(
  skeleton: BG3DSkeleton,
): SkeletonResource {
  const skeletonResource: SkeletonResource = {
    Hedr: {},
    Bone: {},
    BonP: {},
    BonN: {},
    AnHd: {},
    Evnt: {},
    NumK: {},
    KeyF: {},
  };

  // Convert header
  skeletonResource.Hedr["1000"] = {
    name: "Header",
    order: 0,
    obj: {
      version: skeleton.version,
      numAnims: skeleton.numAnims,
      numJoints: skeleton.numJoints,
      num3DMFLimbs: skeleton.num3DMFLimbs,
    },
  };

  // Convert bones
  skeleton.bones.forEach((bone, index) => {
    const boneId = (1000 + index).toString();

    // Main bone entry
    skeletonResource.Bone[boneId] = {
      name: index === 0 ? "Bone" : "NewBone",
      order: index * 3 + 1, // Spacing for other entries
      obj: {
        parentBone: bone.parentBone,
        name: bone.name,
        coordX: bone.coordX,
        coordY: bone.coordY,
        coordZ: bone.coordZ,
        numPointsAttachedToBone: bone.numPointsAttachedToBone,
        numNormalsAttachedToBone: bone.numNormalsAttachedToBone,
      },
    };

    // Point indices
    if (bone.pointIndices && bone.pointIndices.length > 0) {
      skeletonResource.BonP[boneId] = {
        name: index === 0 ? "Bone" : "NewBone",
        order: index * 3 + 2,
        obj: bone.pointIndices.map((pointIndex) => ({ pointIndex })),
      };
    }

    // Normal indices
    if (bone.normalIndices && bone.normalIndices.length > 0) {
      skeletonResource.BonN[boneId] = {
        name: index === 0 ? "Bone" : "NewBone",
        order: index * 3 + 3,
        obj: bone.normalIndices.map((normal) => ({ normal })),
      };
    }
  });

  // Convert animations
  skeleton.animations.forEach((animation, index) => {
    const animId = (1000 + index).toString();

    // Animation header
    skeletonResource.AnHd[animId] = {
      name: animation.name,
      order: 100 + index * 3,
      obj: {
        animName: animation.name,
        numAnimEvents: animation.numAnimEvents,
      },
    };

    // Animation events
    if (animation.events.length > 0) {
      skeletonResource.Evnt[animId] = {
        name: animation.name,
        order: 100 + index * 3 + 1,
        obj: animation.events,
      };
    }

    // Number of keyframes (simplified - assuming all bones have same number)
    const firstBoneKeyframes = Object.values(animation.keyframes)[0];
    if (firstBoneKeyframes) {
      skeletonResource.NumK[animId] = {
        name: animation.name,
        order: 100 + index * 3 + 2,
        obj: [{ numKeyFrames: firstBoneKeyframes.length }],
      };
    }

    // Keyframes - create separate KeyF resource for each bone
    // Otto uses pattern: 1000 + (animIndex * 100) + boneIndex
    Object.entries(animation.keyframes).forEach(([boneIndexStr, keyframes]) => {
      const boneIndex = parseInt(boneIndexStr);
      if (keyframes.length > 0) {
        const keyFrameResourceId = (1000 + index * 100 + boneIndex).toString();
        skeletonResource.KeyF[keyFrameResourceId] = {
          name: skeleton.bones[boneIndex]?.name || `Bone_${boneIndex}`,
          order: 1000 + index * 100 + boneIndex,
          obj: keyframes,
        };
      }
    });
  });

  return skeletonResource;
}

/* function isBG3DGeometry(obj: BG3DGeometry | BG3DGroup): obj is BG3DGeometry {
  return !!obj && !Array.isArray((obj ).children);
}
 */
