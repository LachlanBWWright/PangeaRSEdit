/**
 * BG3D ↔ glTF conversion utilities
 * Modular exports for all conversion functions
 */

// Materials and textures
export {
  bg3dMaterialsToGltf,
  bg3dTexturesToGltf,
  gltfMaterialsToBg3d,
} from "./bg3d/materials";

// Skeleton
export {
  bg3dSkeletonToGltf,
  gltfSkeletonToBg3d,
  originalSkeletonBinaryToBg3d,
} from "./skeleton";

// Meshes and geometry
export {
  bg3dMeshesToGltf,
  gltfMeshesToBg3d,
  gltfSceneToBg3dGroups,
} from "./bg3d/meshes";

// Scene hierarchy
export {
  bg3dSceneToGltf,
  gltfSceneToBg3d,
  createGltfSceneFromBg3d,
} from "./bg3d/scene";
