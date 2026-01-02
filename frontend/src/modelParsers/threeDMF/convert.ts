/**
 * Conversion utilities between TQ3MetaFile (3DMF format) and BG3DParseResult (BG3D format)
 * This enables interoperability between the older 3DMF format and the newer BG3D format
 */

import { Result, ok } from "../../types/result";
import {
  TQ3MetaFile,
  TQ3TriMeshData,
  TQ3TriMeshFlatGroup,
  TQ3TextureShader,
  TQ3Pixmap,
  PixelType,
  Endian,
  ShaderUVBoundary,
  TexturingMode,
  TQ3Boolean,
} from "./types";
import {
  BG3DParseResult,
  BG3DMaterial,
  BG3DTexture,
  BG3DGeometry,
  BG3DGroup,
  BG3DMaterialFlags,
  PixelFormatSrc,
  PixelFormatDst,
} from "../parseBG3D";

/**
 * Convert a TQ3Pixmap to BG3DTexture format
 */
function pixmapToBG3DTexture(pixmap: TQ3Pixmap): BG3DTexture {
  // Map pixel types
  let srcPixelFormat: number;
  let dstPixelFormat: number;

  switch (pixmap.pixelType) {
    case PixelType.RGB32:
      srcPixelFormat = PixelFormatSrc.GL_RGB;
      dstPixelFormat = PixelFormatDst.GL_UNSIGNED_SHORT_5_5_5_1;
      break;
    case PixelType.ARGB32:
      srcPixelFormat = PixelFormatSrc.GL_RGBA;
      dstPixelFormat = PixelFormatDst.GL_UNSIGNED_SHORT_5_5_5_1;
      break;
    case PixelType.RGB16:
      srcPixelFormat = PixelFormatSrc.GL_UNSIGNED_SHORT_1_5_5_5_REV;
      dstPixelFormat = PixelFormatDst.GL_UNSIGNED_SHORT_5_5_5_1;
      break;
    case PixelType.ARGB16:
      srcPixelFormat = PixelFormatSrc.GL_UNSIGNED_SHORT_1_5_5_5_REV;
      dstPixelFormat = PixelFormatDst.GL_UNSIGNED_SHORT_5_5_5_1;
      break;
    default:
      srcPixelFormat = PixelFormatSrc.GL_RGB;
      dstPixelFormat = PixelFormatDst.GL_UNSIGNED_SHORT_5_5_5_1;
  }

  return {
    width: pixmap.width,
    height: pixmap.height,
    srcPixelFormat,
    dstPixelFormat,
    bufferSize: pixmap.image.length,
    pixels: new Uint8Array(pixmap.image),
  };
}

/**
 * Convert a TQ3TextureShader to BG3DMaterial format
 */
function textureShaderToBG3DMaterial(
  shader: TQ3TextureShader,
  mesh: TQ3TriMeshData | null
): BG3DMaterial {
  let flags = 0;

  // Set texture flag if shader has a pixmap
  if (shader.pixmap) {
    flags |= BG3DMaterialFlags.BG3D_MATERIALFLAG_TEXTURED;
  }

  // Set clamp flags based on shader boundary
  if (shader.boundaryU === ShaderUVBoundary.Clamp) {
    flags |= BG3DMaterialFlags.BG3D_MATERIALFLAG_CLAMP_U;
  }
  if (shader.boundaryV === ShaderUVBoundary.Clamp) {
    flags |= BG3DMaterialFlags.BG3D_MATERIALFLAG_CLAMP_V;
  }

  // Get diffuse color from mesh or use defaults
  const diffuseColor: [number, number, number, number] = mesh
    ? [mesh.diffuseColor.r, mesh.diffuseColor.g, mesh.diffuseColor.b, mesh.diffuseColor.a]
    : [1, 1, 1, 1];

  // Convert textures
  const textures: BG3DTexture[] = [];
  if (shader.pixmap) {
    textures.push(pixmapToBG3DTexture(shader.pixmap));
  }

  return {
    flags,
    diffuseColor,
    textures,
  };
}

/**
 * Convert a TQ3TriMeshData to BG3DGeometry format
 */
function triMeshToBG3DGeometry(mesh: TQ3TriMeshData): BG3DGeometry {
  // Convert vertices
  const vertices: [number, number, number][] = mesh.points.map((p) => [p.x, p.y, p.z]);

  // Convert normals
  let normals: [number, number, number][] | undefined;
  if (mesh.vertexNormals) {
    normals = mesh.vertexNormals.map((n) => [n.x, n.y, n.z]);
  }

  // Convert UVs (note: UV V was flipped during parsing, so these are already correct)
  let uvs: [number, number][] | undefined;
  if (mesh.vertexUVs) {
    uvs = mesh.vertexUVs.map((uv) => [uv.u, uv.v]);
  }

  // Convert colors
  let colors: [number, number, number, number][] | undefined;
  if (mesh.vertexColors) {
    colors = mesh.vertexColors.map((c) => [
      Math.round(c.r * 255),
      Math.round(c.g * 255),
      Math.round(c.b * 255),
      Math.round(c.a * 255),
    ]);
  }

  // Convert triangles
  const triangles: [number, number, number][] = mesh.triangles.map((t) => [
    t.pointIndices[0],
    t.pointIndices[1],
    t.pointIndices[2],
  ]);

  // Convert bounding box
  const boundingBox = {
    min: [mesh.bBox.min.x, mesh.bBox.min.y, mesh.bBox.min.z] as [number, number, number],
    max: [mesh.bBox.max.x, mesh.bBox.max.y, mesh.bBox.max.z] as [number, number, number],
  };

  return {
    type: 0,
    numMaterials: mesh.internalTextureID >= 0 ? 1 : 0,
    layerMaterialNum: [mesh.internalTextureID >= 0 ? mesh.internalTextureID : 0, 0, 0, 0],
    flags: 0,
    numPoints: mesh.numPoints,
    numTriangles: mesh.numTriangles,
    vertices,
    normals,
    uvs,
    colors,
    triangles,
    boundingBox,
  };
}

/**
 * Convert TQ3MetaFile to BG3DParseResult format
 * @param metaFile The parsed 3DMF data
 * @returns Result<BG3DParseResult, Error>
 */
export function metaFileToBG3DParseResult(
  metaFile: TQ3MetaFile
): Result<BG3DParseResult, Error> {
  // Build materials from textures
  // Each unique texture becomes a material
  const materials: BG3DMaterial[] = [];
  
  // Map from internal texture ID to material index
  const textureToMaterialMap = new Map<number, number>();

  // First, create a default material for meshes without textures
  materials.push({
    flags: 0,
    diffuseColor: [1, 1, 1, 1],
    textures: [],
  });

  // Then create materials for each texture
  for (let i = 0; i < metaFile.numTextures; i++) {
    const shader = metaFile.textures[i];
    if (!shader) continue;

    // Find a mesh using this texture to get its diffuse color
    let meshWithTexture: TQ3TriMeshData | null = null;
    for (const mesh of metaFile.meshes) {
      if (mesh && mesh.internalTextureID === i) {
        meshWithTexture = mesh;
        break;
      }
    }

    const material = textureShaderToBG3DMaterial(shader, meshWithTexture);
    textureToMaterialMap.set(i, materials.length);
    materials.push(material);
  }

  // Build groups from top-level groups
  const groups: BG3DGroup[] = [];
  const rootGroup: BG3DGroup = { children: [] };
  groups.push(rootGroup);

  // Process each top-level group
  for (let groupIdx = 0; groupIdx < metaFile.numTopLevelGroups; groupIdx++) {
    const group = metaFile.topLevelGroups[groupIdx];
    if (!group) continue;

    const bg3dGroup: BG3DGroup = { children: [] };

    for (let meshIdx = 0; meshIdx < group.numMeshes; meshIdx++) {
      const mesh = group.meshes[meshIdx];
      if (!mesh) continue;

      const geometry = triMeshToBG3DGeometry(mesh);

      // Update material reference
      if (mesh.internalTextureID >= 0) {
        const materialIdx = textureToMaterialMap.get(mesh.internalTextureID);
        if (materialIdx !== undefined) {
          geometry.layerMaterialNum[0] = materialIdx;
        }
      }

      bg3dGroup.children.push(geometry);
    }

    rootGroup.children.push(bg3dGroup);
  }

  // If no groups but we have meshes, add them to root group
  if (metaFile.numTopLevelGroups === 0 && metaFile.numMeshes > 0) {
    for (const mesh of metaFile.meshes) {
      if (!mesh) continue;

      const geometry = triMeshToBG3DGeometry(mesh);

      if (mesh.internalTextureID >= 0) {
        const materialIdx = textureToMaterialMap.get(mesh.internalTextureID);
        if (materialIdx !== undefined) {
          geometry.layerMaterialNum[0] = materialIdx;
        }
      }

      rootGroup.children.push(geometry);
    }
  }

  return ok({
    materials,
    groups,
  });
}

/**
 * Convert BG3DTexture to TQ3Pixmap format
 */
function bg3dTextureToPixmap(texture: BG3DTexture): TQ3Pixmap {
  // Determine pixel type from source format
  let pixelType: PixelType;
  let bytesPerPixel: number;

  switch (texture.srcPixelFormat) {
    case PixelFormatSrc.GL_UNSIGNED_SHORT_1_5_5_5_REV:
      pixelType = PixelType.ARGB16;
      bytesPerPixel = 2;
      break;
    case PixelFormatSrc.GL_RGB:
      pixelType = PixelType.RGB32;
      bytesPerPixel = 4;
      break;
    case PixelFormatSrc.GL_RGBA:
      pixelType = PixelType.ARGB32;
      bytesPerPixel = 4;
      break;
    default:
      pixelType = PixelType.RGB32;
      bytesPerPixel = 4;
  }

  const rowBytes = texture.width * bytesPerPixel;

  return {
    image: new Uint8Array(texture.pixels),
    width: texture.width,
    height: texture.height,
    rowBytes,
    pixelSize: bytesPerPixel * 8,
    pixelType,
    bitOrder: Endian.Big,
    byteOrder: Endian.Big,
  };
}

/**
 * Convert BG3DGeometry to TQ3TriMeshData format
 */
function bg3dGeometryToTriMesh(
  geometry: BG3DGeometry,
  materialIndex: number
): TQ3TriMeshData {
  const mesh: TQ3TriMeshData = {
    numTriangles: geometry.numTriangles,
    triangles: [],
    numPoints: geometry.numPoints,
    points: [],
    vertexNormals: null,
    vertexUVs: null,
    vertexColors: null,
    bBox: {
      min: { x: 0, y: 0, z: 0 },
      max: { x: 0, y: 0, z: 0 },
      isEmpty: TQ3Boolean.False,
    },
    texturingMode: TexturingMode.Off,
    internalTextureID: materialIndex,
    hasVertexNormals: false,
    hasVertexColors: false,
    diffuseColor: { r: 1, g: 1, b: 1, a: 1 },
  };

  // Convert vertices
  if (geometry.vertices) {
    mesh.points = geometry.vertices.map(([x, y, z]) => ({ x, y, z }));
  }

  // Convert normals
  if (geometry.normals) {
    mesh.vertexNormals = geometry.normals.map(([x, y, z]) => ({ x, y, z }));
    mesh.hasVertexNormals = true;
  }

  // Convert UVs
  if (geometry.uvs) {
    mesh.vertexUVs = geometry.uvs.map(([u, v]) => ({ u, v }));
  }

  // Convert colors
  if (geometry.colors) {
    mesh.vertexColors = geometry.colors.map(([r, g, b, a]) => ({
      r: r / 255,
      g: g / 255,
      b: b / 255,
      a: a / 255,
    }));
    mesh.hasVertexColors = true;
  }

  // Convert triangles
  if (geometry.triangles) {
    mesh.triangles = geometry.triangles.map(([a, b, c]) => ({
      pointIndices: [a, b, c],
    }));
  }

  // Convert bounding box
  if (geometry.boundingBox) {
    mesh.bBox = {
      min: {
        x: geometry.boundingBox.min[0],
        y: geometry.boundingBox.min[1],
        z: geometry.boundingBox.min[2],
      },
      max: {
        x: geometry.boundingBox.max[0],
        y: geometry.boundingBox.max[1],
        z: geometry.boundingBox.max[2],
      },
      isEmpty: TQ3Boolean.False,
    };
  } else if (geometry.vertices && geometry.vertices.length > 0) {
    // Calculate bounding box from vertices
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    for (const [x, y, z] of geometry.vertices) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      minZ = Math.min(minZ, z);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
      maxZ = Math.max(maxZ, z);
    }

    mesh.bBox = {
      min: { x: minX, y: minY, z: minZ },
      max: { x: maxX, y: maxY, z: maxZ },
      isEmpty: TQ3Boolean.False,
    };
  }

  return mesh;
}

/**
 * Helper to check if an object is a BG3DGroup
 */
function isBG3DGroup(obj: BG3DGeometry | BG3DGroup): obj is BG3DGroup {
  return "children" in obj && Array.isArray(obj.children);
}

/**
 * Extract all geometries from a BG3DGroup recursively
 */
function extractGeometries(group: BG3DGroup): BG3DGeometry[] {
  const geometries: BG3DGeometry[] = [];

  // Ensure children is actually an array before iterating
  if (!Array.isArray(group.children)) {
    console.warn("extractGeometries: group.children is not an array", group);
    return geometries;
  }

  for (const child of group.children) {
    if (isBG3DGroup(child)) {
      geometries.push(...extractGeometries(child));
    } else {
      geometries.push(child);
    }
  }

  return geometries;
}

/**
 * Convert BG3DParseResult to TQ3MetaFile format
 * @param parsed The BG3D parsed data
 * @returns Result<TQ3MetaFile, Error>
 */
export function bg3dParseResultToMetaFile(
  parsed: BG3DParseResult
): Result<TQ3MetaFile, Error> {
  const metaFile: TQ3MetaFile = {
    numTextures: 0,
    textures: [],
    numMeshes: 0,
    meshes: [],
    numTopLevelGroups: 0,
    topLevelGroups: [],
  };

  // Map from BG3D material index to 3DMF texture index
  const materialToTextureMap = new Map<number, number>();

  // Convert materials to texture shaders
  for (let i = 0; i < parsed.materials.length; i++) {
    const material = parsed.materials[i];
    if (!material) continue;

    // Skip materials without textures
    if (material.textures.length === 0) {
      continue;
    }

    // Create texture shader from first texture
    const texture = material.textures[0];
    if (!texture) continue;

    const shader: TQ3TextureShader = {
      pixmap: bg3dTextureToPixmap(texture),
      boundaryU: (material.flags & BG3DMaterialFlags.BG3D_MATERIALFLAG_CLAMP_U)
        ? ShaderUVBoundary.Clamp
        : ShaderUVBoundary.Wrap,
      boundaryV: (material.flags & BG3DMaterialFlags.BG3D_MATERIALFLAG_CLAMP_V)
        ? ShaderUVBoundary.Clamp
        : ShaderUVBoundary.Wrap,
    };

    materialToTextureMap.set(i, metaFile.numTextures);
    metaFile.textures.push(shader);
    metaFile.numTextures++;
  }

  // Process groups
  for (const group of parsed.groups) {
    if (!group) continue;

    const flatGroup: TQ3TriMeshFlatGroup = {
      numMeshes: 0,
      meshes: [],
    };

    // Extract all geometries from the group
    // Check if this is actually a group with children, or just a single geometry
    const geometries: BG3DGeometry[] = isBG3DGroup(group)
      ? extractGeometries(group)
      : [group];

    for (const geometry of geometries) {
      // Get material/texture index
      const materialIdx = geometry.layerMaterialNum?.[0] ?? 0;
      const textureIdx = materialToTextureMap.get(materialIdx) ?? -1;

      const mesh = bg3dGeometryToTriMesh(geometry, textureIdx);

      // Get diffuse color from material
      const material = parsed.materials[materialIdx];
      if (material) {
        mesh.diffuseColor = {
          r: material.diffuseColor[0],
          g: material.diffuseColor[1],
          b: material.diffuseColor[2],
          a: material.diffuseColor[3],
        };
      }

      flatGroup.meshes.push(mesh);
      flatGroup.numMeshes++;

      metaFile.meshes.push(mesh);
      metaFile.numMeshes++;
    }

    if (flatGroup.numMeshes > 0) {
      metaFile.topLevelGroups.push(flatGroup);
      metaFile.numTopLevelGroups++;
    }
  }

  return ok(metaFile);
}
