import {
  Endian,
  PixelType,
  ShaderUVBoundary,
  TQ3Boolean,
  TQ3Pixmap,
  TQ3TextureShader,
  TQ3TriMeshData,
  TexturingMode,
} from "./types";
import {
  BG3DGeometry,
  BG3DGroup,
  BG3DMaterial,
  BG3DMaterialFlags,
  BG3DTexture,
  PixelFormatDst,
  PixelFormatSrc,
} from "../parseBG3D";

function pixmapToBG3DTexture(pixmap: TQ3Pixmap): BG3DTexture {
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
    case PixelType.ARGB16:
      srcPixelFormat = PixelFormatSrc.GL_UNSIGNED_SHORT_1_5_5_5_REV;
      dstPixelFormat = PixelFormatDst.GL_UNSIGNED_SHORT_5_5_5_1;
      break;
    default:
      srcPixelFormat = PixelFormatSrc.GL_RGB;
      dstPixelFormat = PixelFormatDst.GL_UNSIGNED_SHORT_5_5_5_1;
  }

  let pixels: Uint8Array;
  if (pixmap.pixelType === PixelType.RGB32) {
    const numPixels = pixmap.width * pixmap.height;
    pixels = new Uint8Array(numPixels * 3);
    for (let i = 0; i < numPixels; i++) {
      pixels[i * 3 + 0] = pixmap.image[i * 4 + 1] ?? 0;
      pixels[i * 3 + 1] = pixmap.image[i * 4 + 2] ?? 0;
      pixels[i * 3 + 2] = pixmap.image[i * 4 + 3] ?? 0;
    }
  } else if (pixmap.pixelType === PixelType.ARGB32) {
    const numPixels = pixmap.width * pixmap.height;
    pixels = new Uint8Array(numPixels * 4);
    for (let i = 0; i < numPixels; i++) {
      pixels[i * 4 + 0] = pixmap.image[i * 4 + 1] ?? 0;
      pixels[i * 4 + 1] = pixmap.image[i * 4 + 2] ?? 0;
      pixels[i * 4 + 2] = pixmap.image[i * 4 + 3] ?? 0;
      pixels[i * 4 + 3] = pixmap.image[i * 4 + 0] ?? 255;
    }
  } else if (pixmap.pixelType === PixelType.RGB16) {
    pixels = new Uint8Array(pixmap.image);
    for (let i = 0; i < pixels.length; i += 2) {
      pixels[i] = (pixels[i] ?? 0) | 0x80;
    }
  } else {
    pixels = new Uint8Array(pixmap.image);
  }

  return {
    width: pixmap.width,
    height: pixmap.height,
    srcPixelFormat,
    dstPixelFormat,
    bufferSize: pixels.length,
    pixels,
  };
}

export function textureShaderToBG3DMaterial(
  shader: TQ3TextureShader,
  mesh: TQ3TriMeshData | null,
): BG3DMaterial {
  let flags = 0;
  if (shader.pixmap) flags |= BG3DMaterialFlags.BG3D_MATERIALFLAG_TEXTURED;
  if (shader.boundaryU === ShaderUVBoundary.Clamp) {
    flags |= BG3DMaterialFlags.BG3D_MATERIALFLAG_CLAMP_U;
  }
  if (shader.boundaryV === ShaderUVBoundary.Clamp) {
    flags |= BG3DMaterialFlags.BG3D_MATERIALFLAG_CLAMP_V;
  }

  const diffuseColor: [number, number, number, number] = mesh
    ? [
        mesh.diffuseColor.r,
        mesh.diffuseColor.g,
        mesh.diffuseColor.b,
        mesh.diffuseColor.a,
      ]
    : [1, 1, 1, 1];

  const textures: BG3DTexture[] = [];
  if (shader.pixmap) textures.push(pixmapToBG3DTexture(shader.pixmap));

  return { flags, diffuseColor, textures };
}

export function triMeshToBG3DGeometry(mesh: TQ3TriMeshData): BG3DGeometry {
  const vertices: [number, number, number][] = mesh.points.map((p) => [
    p.x,
    p.y,
    p.z,
  ]);

  let normals: [number, number, number][] | undefined;
  if (mesh.vertexNormals)
    normals = mesh.vertexNormals.map((n) => [n.x, n.y, n.z]);

  let uvs: [number, number][] | undefined;
  if (mesh.vertexUVs) uvs = mesh.vertexUVs.map((uv) => [uv.u, uv.v]);

  let colors: [number, number, number, number][] | undefined;
  if (mesh.vertexColors) {
    colors = mesh.vertexColors.map((c) => [
      Math.round(c.r * 255),
      Math.round(c.g * 255),
      Math.round(c.b * 255),
      Math.round(c.a * 255),
    ]);
  }

  const triangles: [number, number, number][] = mesh.triangles.map((t) => [
    t.pointIndices[0],
    t.pointIndices[1],
    t.pointIndices[2],
  ]);

  return {
    type: 0,
    numMaterials: mesh.internalTextureID >= 0 ? 1 : 0,
    layerMaterialNum: [
      mesh.internalTextureID >= 0 ? mesh.internalTextureID : 0,
      0,
      0,
      0,
    ],
    flags: 0,
    numPoints: mesh.numPoints,
    numTriangles: mesh.numTriangles,
    vertices,
    normals,
    uvs,
    colors,
    triangles,
    boundingBox: {
      min: [mesh.bBox.min.x, mesh.bBox.min.y, mesh.bBox.min.z],
      max: [mesh.bBox.max.x, mesh.bBox.max.y, mesh.bBox.max.z],
    },
  };
}

export function bg3dTextureToPixmap(texture: BG3DTexture): TQ3Pixmap {
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

  let image: Uint8Array;
  if (texture.srcPixelFormat === PixelFormatSrc.GL_RGB) {
    const numPixels = texture.width * texture.height;
    image = new Uint8Array(numPixels * 4);
    for (let i = 0; i < numPixels; i++) {
      image[i * 4 + 0] = 0;
      image[i * 4 + 1] = texture.pixels[i * 3 + 0] ?? 0;
      image[i * 4 + 2] = texture.pixels[i * 3 + 1] ?? 0;
      image[i * 4 + 3] = texture.pixels[i * 3 + 2] ?? 0;
    }
  } else if (texture.srcPixelFormat === PixelFormatSrc.GL_RGBA) {
    const numPixels = texture.width * texture.height;
    image = new Uint8Array(numPixels * 4);
    for (let i = 0; i < numPixels; i++) {
      image[i * 4 + 0] = texture.pixels[i * 4 + 3] ?? 255;
      image[i * 4 + 1] = texture.pixels[i * 4 + 0] ?? 0;
      image[i * 4 + 2] = texture.pixels[i * 4 + 1] ?? 0;
      image[i * 4 + 3] = texture.pixels[i * 4 + 2] ?? 0;
    }
  } else {
    image = new Uint8Array(texture.pixels);
  }

  return {
    image,
    width: texture.width,
    height: texture.height,
    rowBytes,
    pixelSize: bytesPerPixel * 8,
    pixelType,
    bitOrder: Endian.Big,
    byteOrder: Endian.Big,
  };
}

export function bg3dGeometryToTriMesh(
  geometry: BG3DGeometry,
  materialIndex: number,
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

  if (geometry.vertices)
    mesh.points = geometry.vertices.map(([x, y, z]) => ({ x, y, z }));
  if (geometry.normals) {
    mesh.vertexNormals = geometry.normals.map(([x, y, z]) => ({ x, y, z }));
    mesh.hasVertexNormals = true;
  }
  if (geometry.uvs) mesh.vertexUVs = geometry.uvs.map(([u, v]) => ({ u, v }));
  if (geometry.colors) {
    mesh.vertexColors = geometry.colors.map(([r, g, b, a]) => ({
      r: r / 255,
      g: g / 255,
      b: b / 255,
      a: a / 255,
    }));
    mesh.hasVertexColors = true;
  }
  if (geometry.triangles) {
    mesh.triangles = geometry.triangles.map(([a, b, c]) => ({
      pointIndices: [a, b, c],
    }));
  }

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
    let minX = Infinity;
    let minY = Infinity;
    let minZ = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxZ = -Infinity;

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

function isBG3DGroup(obj: BG3DGeometry | BG3DGroup): obj is BG3DGroup {
  return "children" in obj && Array.isArray(obj.children);
}

export function extractGeometriesFromNode(
  node: BG3DGeometry | BG3DGroup,
): BG3DGeometry[] {
  if (!isBG3DGroup(node)) return [node];
  const geometries: BG3DGeometry[] = [];
  for (const child of node.children) {
    geometries.push(...extractGeometriesFromNode(child));
  }
  return geometries;
}
