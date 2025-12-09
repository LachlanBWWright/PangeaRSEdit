/**
 * Type definitions for 3DMF file format parsing
 * Based on Apple's QuickDraw 3D 3DMF file format specification
 * Reference: Pomme's 3DMFParser.cpp
 */

// Chunk type constants as 4-byte FourCC codes
export const CHUNK_3DMF = 0x33444d46; // '3DMF'
export const CHUNK_CNTR = 0x636e7472; // 'cntr' - Container
export const CHUNK_BGNG = 0x626e6767; // 'bgng' - Begin Group
export const CHUNK_ENDG = 0x656e6467; // 'endg' - End Group
export const CHUNK_TMSH = 0x746d7368; // 'tmsh' - TriMesh
export const CHUNK_ATAR = 0x61746172; // 'atar' - AttributeArray
export const CHUNK_ATTR = 0x61747472; // 'attr' - AttributeSet
export const CHUNK_KDIF = 0x6b646966; // 'kdif' - Diffuse Color
export const CHUNK_KXPR = 0x6b787072; // 'kxpr' - Transparency Color
export const CHUNK_TXSU = 0x74787375; // 'txsu' - TextureShader
export const CHUNK_TXMM = 0x74786d6d; // 'txmm' - MipmapTexture
export const CHUNK_TXPM = 0x7478706d; // 'txpm' - PixmapTexture
export const CHUNK_SHDR = 0x73686472; // 'shdr' - Shader UV boundary
export const CHUNK_RFRN = 0x7266726e; // 'rfrn' - Reference
export const CHUNK_TOC  = 0x746f6320; // 'toc ' - Table of Contents

// Attribute types for atar chunks
export enum AttributeType {
  None = 0,
  SurfaceUV = 1,
  ShadingUV = 2,
  Normal = 3,
  AmbientCoefficient = 4,
  DiffuseColor = 5,
  SpecularColor = 6,
  SpecularControl = 7,
  TransparencyColor = 8,
  SurfaceTangent = 9,
  HighlightState = 10,
  SurfaceShader = 11,
  EmissiveColor = 12,
  NumTypes = 13,
}

// Position of array in atar chunks
export enum AttributeArrayPosition {
  TriangleAttribute = 0,
  EdgeAttribute = 1,
  VertexAttribute = 2,
}

// Pixel types for texture data
export enum PixelType {
  RGB32 = 0,
  ARGB32 = 1,
  RGB16 = 2,
  ARGB16 = 3,
  RGB16_565 = 4,
  RGB24 = 5,
  RGBA32 = 6,
  Unknown = 200,
}

// Endianness constants
export enum Endian {
  Big = 0,
  Little = 1,
}

// UV boundary modes
export enum ShaderUVBoundary {
  Wrap = 0,
  Clamp = 1,
}

// Texturing modes
export enum TexturingMode {
  Invalid = -1,
  Off = 0,
  Opaque = 1,
  AlphaTest = 2,
  AlphaBlend = 3,
}

// Boolean values
export enum TQ3Boolean {
  False = 0,
  True = 1,
}

/**
 * 3DMF parsed data structures
 */

export interface TQ3Point3D {
  x: number;
  y: number;
  z: number;
}

export interface TQ3Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface TQ3Param2D {
  u: number;
  v: number;
}

export interface TQ3ColorRGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface TQ3ColorRGB {
  r: number;
  g: number;
  b: number;
}

export interface TQ3BoundingBox {
  min: TQ3Point3D;
  max: TQ3Point3D;
  isEmpty: TQ3Boolean;
}

export interface TQ3TriMeshTriangleData {
  pointIndices: [number, number, number];
}

export interface TQ3Pixmap {
  image: Uint8Array;
  width: number;
  height: number;
  rowBytes: number;
  pixelSize: number;
  pixelType: PixelType;
  bitOrder: Endian;
  byteOrder: Endian;
}

export interface TQ3TextureShader {
  pixmap: TQ3Pixmap | null;
  boundaryU: ShaderUVBoundary;
  boundaryV: ShaderUVBoundary;
}

export interface TQ3TriMeshData {
  numTriangles: number;
  triangles: TQ3TriMeshTriangleData[];
  numPoints: number;
  points: TQ3Point3D[];
  vertexNormals: TQ3Vector3D[] | null;
  vertexUVs: TQ3Param2D[] | null;
  vertexColors: TQ3ColorRGBA[] | null;
  bBox: TQ3BoundingBox;
  texturingMode: TexturingMode;
  internalTextureID: number;
  hasVertexNormals: boolean;
  hasVertexColors: boolean;
  diffuseColor: TQ3ColorRGBA;
}

export interface TQ3TriMeshFlatGroup {
  numMeshes: number;
  meshes: TQ3TriMeshData[];
}

export interface TQ3MetaFile {
  numTextures: number;
  textures: TQ3TextureShader[];
  numMeshes: number;
  meshes: TQ3TriMeshData[];
  numTopLevelGroups: number;
  topLevelGroups: TQ3TriMeshFlatGroup[];
}

/**
 * TOC (Table of Contents) entry
 */
export interface TOCEntry {
  offset: number;
  chunkType: number;
}

/**
 * Helper to convert a 4-byte number to a FourCC string
 */
export function fourCCToString(fourCC: number): string {
  return String.fromCharCode(
    (fourCC >> 24) & 0xff,
    (fourCC >> 16) & 0xff,
    (fourCC >> 8) & 0xff,
    fourCC & 0xff
  );
}

/**
 * Helper to convert a FourCC string to a 4-byte number
 */
export function stringToFourCC(str: string): number {
  if (str.length !== 4) {
    return 0;
  }
  return (
    ((str.charCodeAt(0) & 0xff) << 24) |
    ((str.charCodeAt(1) & 0xff) << 16) |
    ((str.charCodeAt(2) & 0xff) << 8) |
    (str.charCodeAt(3) & 0xff)
  );
}
