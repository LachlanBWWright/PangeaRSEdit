/**
 * Bugdom 2 Tunnel Level (.tun) Type Definitions
 *
 * These levels use a radically different format from standard .ter files.
 * The tunnel levels feature 3D "tube" or "half-pipe" geometry that the
 * player surfs through along a spline path.
 */

/**
 * 3D Point (OGLPoint3D equivalent)
 */
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * 3D Vector (OGLVector3D equivalent)
 */
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * 2D texture coordinate (OGLTextureCoord equivalent)
 */
export interface TextureCoord {
  u: number;
  v: number;
}

/**
 * Triangle indices (MOTriangleIndices equivalent)
 */
export interface TriangleIndices {
  a: number;
  b: number;
  c: number;
}

/**
 * Bounding box (OGLBoundingBox equivalent)
 * Note: OGLBoundingBox in the game includes an isEmpty boolean field
 * that takes 4 bytes with padding (1 byte + 3 padding)
 */
export interface BoundingBox {
  min: Point3D;
  max: Point3D;
  isEmpty: boolean;
}

/**
 * Tunnel file header
 * Total size: 88 bytes
 */
export interface TunnelHeader {
  /** Version info: two uint16 values (major.minor) packed as a single uint32 */
  versionMajor: number;
  versionMinor: number;
  /** Boolean (1 byte): true for 360° pipe, false for half-pipe */
  fullPipe: boolean;
  /** Number of spline control points (nubs) */
  numNubs: number;
  /** Number of interpolated spline points */
  numSplinePoints: number;
  /** Number of geometry mesh sections */
  numSections: number;
  /** Number of items/objects in tunnel */
  numItems: number;
}

/**
 * Spline point with position and up vector
 * Used for both nubs (control points) and interpolated spline points
 * Size: 24 bytes each
 */
export interface TunnelSplinePoint {
  /** Position in 3D space */
  point: Point3D;
  /** Up vector for orientation */
  up: Vector3D;
}

/**
 * Embedded RGBA texture
 */
export interface TunnelTexture {
  width: number;
  height: number;
  /** RGBA pixel data (width * height * 4 bytes) */
  data: Uint8Array;
}

/**
 * Tunnel item/object definition
 * Size: 56 bytes each
 */
export interface TunnelItem {
  /** Item type ID */
  type: number;
  /** Index into spline points array */
  splineIndex: number;
  /** Which geometry section this item belongs to */
  sectionNum: number;
  /** Scale factor */
  scale: number;
  /** Rotation (radians) */
  rot: Vector3D;
  /** Position offset from spline point */
  positionOffset: Vector3D;
  /** Item flags */
  flags: number;
  /** Item-specific parameters */
  parms: [number, number, number];
}

/**
 * Section mesh geometry (tunnel or water)
 */
export interface TunnelSectionMesh {
  /** Bounding box */
  bBox: BoundingBox;
  /** Number of vertices */
  numPoints: number;
  /** Number of triangles */
  numTriangles: number;
  /** Vertex positions */
  points: Point3D[];
  /** Vertex normals (optional - not present for water mesh) */
  normals?: Vector3D[];
  /** UV texture coordinates */
  uvs: TextureCoord[];
  /** Triangle indices */
  triangles: TriangleIndices[];
}

/**
 * A geometry section containing both tunnel and water meshes
 */
export interface TunnelSection {
  /** Main tunnel geometry */
  tunnelMesh: TunnelSectionMesh;
  /** Water surface geometry */
  waterMesh: TunnelSectionMesh;
}

/**
 * Complete tunnel data structure
 */
export interface TunnelData {
  /** File header */
  header: TunnelHeader;
  /** Spline control points (nubs) */
  nubs: TunnelSplinePoint[];
  /** Main tunnel texture */
  tunnelTexture: TunnelTexture;
  /** Water texture (currently skipped in loading) */
  waterTexture: TunnelTexture;
  /** Items placed in the tunnel */
  items: TunnelItem[];
  /** Interpolated spline points */
  splinePoints: TunnelSplinePoint[];
  /** Geometry sections */
  sections: TunnelSection[];
}

/**
 * Plumbing level item types
 */
export enum PlumbingItemType {
  NAIL = 0,
  BLOB = 1,
  HEALTH_POW = 2,
  RING = 3,
  SPRAY = 4,
}

/**
 * Gutter level item types
 */
export enum GutterItemType {
  PINE_CONE = 0,
  LEAF = 1,
  SPRAY = 2,
  RING = 3,
}

/**
 * Get human-readable item type name for Plumbing level
 */
export function getPlumbingItemName(type: number): string {
  switch (type) {
    case PlumbingItemType.NAIL:
      return "Nail";
    case PlumbingItemType.BLOB:
      return "Blob";
    case PlumbingItemType.HEALTH_POW:
      return "Health POW";
    case PlumbingItemType.RING:
      return "Ring";
    case PlumbingItemType.SPRAY:
      return "Spray";
    default:
      return `Unknown (${type})`;
  }
}

/**
 * Get human-readable item type name for Gutter level
 */
export function getGutterItemName(type: number): string {
  switch (type) {
    case GutterItemType.PINE_CONE:
      return "Pine Cone";
    case GutterItemType.LEAF:
      return "Leaf";
    case GutterItemType.SPRAY:
      return "Spray";
    case GutterItemType.RING:
      return "Ring";
    default:
      return `Unknown (${type})`;
  }
}
