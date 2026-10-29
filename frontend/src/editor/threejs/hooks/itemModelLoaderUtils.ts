import { Group, Mesh, Object3D } from "three";
import type { GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";
export { convertBg3dToGltf, loadFileGltf } from "@/assets/modelAssets";

const SKELETON_ROOT_NAME = "Skeleton";
const GROUP_ROOT_PREFIX = "Group_";
const MESH_NODE_PREFIX = "Mesh_";

function isNamedMeshNode(object: Object3D): boolean {
  return object.name.startsWith(MESH_NODE_PREFIX);
}

function isGroupRootNode(object: Object3D): boolean {
  return object.name.startsWith(GROUP_ROOT_PREFIX);
}

function getSkeletonSceneRoot(scene: Group): Object3D | null {
  return scene.children.find((child) => child.name === SKELETON_ROOT_NAME) ?? null;
}

function getSceneSelectionRoots(scene: Group): Object3D[] {
  const rootMeshChildren = scene.children.filter(isNamedMeshNode);
  if (rootMeshChildren.length > 0) {
    return rootMeshChildren;
  }

  const skeletonRoot = getSkeletonSceneRoot(scene);
  const skeletalMeshRoots = skeletonRoot?.children.filter(isNamedMeshNode) ?? [];
  if (skeletalMeshRoots.length > 0) {
    return skeletalMeshRoots;
  }

  const groupRoots = scene.children.filter(isGroupRootNode);
  if (groupRoots.length > 0) {
    return groupRoots.flatMap((groupRoot) => groupRoot.children);
  }

  return scene.children;
}

function extractSkeletalSceneSelection(
  scene: Group,
  selectedNames: Set<string>,
): Group | null {
  const clonedScene = cloneGroupForItemRendering(scene);
  const skeletonRoot = getSkeletonSceneRoot(clonedScene);
  const meshContainer =
    skeletonRoot && skeletonRoot.children.some(isNamedMeshNode)
      ? skeletonRoot
      : clonedScene;

  clonedScene.children
    .filter(
      (child) =>
        meshContainer === skeletonRoot &&
        child !== skeletonRoot &&
        child.name !== SKELETON_ROOT_NAME,
    )
    .forEach((child) => {
      clonedScene.remove(child);
    });

  meshContainer.children
    .filter(
      (child) => isNamedMeshNode(child) && !selectedNames.has(child.name),
    )
    .forEach((child) => {
      meshContainer.remove(child);
    });

  if (meshContainer === clonedScene) {
    clonedScene.children
      .filter(
        (child) =>
          !isNamedMeshNode(child) && child.name !== SKELETON_ROOT_NAME,
      )
      .forEach((child) => {
        clonedScene.remove(child);
      });
  }

  const remainingSelectedMeshes = meshContainer.children.filter((child) =>
    isNamedMeshNode(child),
  );
  return remainingSelectedMeshes.length > 0 ? clonedScene : null;
}

export function extractSubgroupFromScene(
  scene: Group,
  modelIndex: number,
  groupSize = 1,
): Group | null {
  const selectionRoots = getSceneSelectionRoots(scene);
  if (selectionRoots.length === 0) {
    console.warn(
      `Could not find selectable model roots. Scene has ${scene.children.length} direct children`,
    );
    return null;
  }

  if (modelIndex >= selectionRoots.length) {
    console.warn(
      `Model index ${modelIndex} out of range (max ${selectionRoots.length - 1})`,
    );
    return null;
  }

  const endIndex = Math.min(modelIndex + groupSize, selectionRoots.length);
  const selectedRoots = selectionRoots.slice(modelIndex, endIndex);
  if (selectedRoots.length === 0) {
    return null;
  }

  const hasSkeletalRoot =
    scene.children.some(isNamedMeshNode) ||
    !!getSkeletonSceneRoot(scene)?.children.some(isNamedMeshNode);
  if (hasSkeletalRoot) {
    return extractSkeletalSceneSelection(
      scene,
      new Set(selectedRoots.map((root) => root.name)),
    );
  }

  const extractedScene = new Group();
  selectedRoots.forEach((root) => {
    extractedScene.add(cloneObjectForItemRendering(root));
  });
  return extractedScene.children.length > 0 ? extractedScene : null;
}

export function extractSubgroupByIndex(
  gltf: GLTF,
  modelIndex: number,
  groupSize = 1,
): Group | null {
  return extractSubgroupFromScene(gltf.scene, modelIndex, groupSize);
}

export function cloneGroupForItemRendering(group: Group): Group {
  const cloned = cloneObjectForItemRendering(group);
  if (cloned instanceof Group) {
    return cloned;
  }
  const wrappedGroup = new Group();
  wrappedGroup.add(cloned);
  return wrappedGroup;
}

function cloneObjectForItemRendering(object: Object3D): Object3D {
  const cloned = clone(object);
  cloned.traverse((node) => {
    if (!(node instanceof Mesh) || !node.material) {
      return;
    }
    node.material = Array.isArray(node.material)
      ? node.material.map((material) => material.clone())
      : node.material.clone();
  });
  return cloned;
}
