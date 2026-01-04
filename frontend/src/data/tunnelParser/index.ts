/**
 * Bugdom 2 Tunnel Parser Module
 *
 * Exports all types and functions for parsing and serializing
 * Bugdom 2 tunnel level files (.tun).
 */

// Type exports
export type {
  Point3D,
  Vector3D,
  TextureCoord,
  TriangleIndices,
  BoundingBox,
  TunnelHeader,
  TunnelSplinePoint,
  TunnelTexture,
  TunnelItem,
  TunnelSectionMesh,
  TunnelSection,
  TunnelData,
} from "./types";

// Enum exports
export {
  PlumbingItemType,
  GutterItemType,
  getPlumbingItemName,
  getGutterItemName,
} from "./types";

// Parser exports
export { parseTunnelFile } from "./parseTunnelFile";

// Serializer exports
export { serializeTunnelFile } from "./serializeTunnelFile";

// Texture utility exports
export {
  tunnelTextureToCanvas,
  canvasToTunnelTexture,
  tunnelTextureToDataUrl,
  createSolidTexture,
} from "./textureUtils";
