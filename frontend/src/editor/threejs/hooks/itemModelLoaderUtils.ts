import { mapErr } from "@/utils/mapErr";
import type { BG3DGltfWorkerResponse } from "@/modelParsers/bg3dGltfWorker";
import { ResultAsync } from "neverthrow";
import { Group, Mesh, Object3D } from "three";
import { errorSchema } from "@/schemas/common";
import {
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

let requestIdCounter = 0;
const fileGltfCache = new Map<string, Promise<GLTF>>();

export function convertBg3dToGltf(
  worker: Worker,
  buffer: ArrayBuffer,
): Promise<ArrayBuffer> {
  const requestId = `req_${++requestIdCounter}`;
  return new Promise<ArrayBuffer>((resolve, reject) => {
    let resolved = false;
    const handleMessage = (e: MessageEvent<BG3DGltfWorkerResponse>) => {
      if (e.data.requestId !== requestId) return;
      resolved = true;
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      if (e.data.type === "error")
        reject(new Error(`Worker error: ${e.data.error}`));
      else if (e.data.type === "bg3d-with-skeleton-to-glb" && e.data.result)
        resolve(e.data.result);
    };
    const handleError = (error: ErrorEvent) => {
      if (resolved) return;
      resolved = true;
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      reject(new Error(`Worker error: ${error.message || "Unknown error"}`));
    };
    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);
    worker.postMessage({
      type: "bg3d-with-skeleton-to-glb",
      bg3dBuffer: buffer,
      skeletonData: undefined,
      requestId,
    });
    setTimeout(() => {
      if (resolved) return;
      resolved = true;
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      reject(new Error("Model loading timeout (60s)"));
    }, 60000);
  });
}

export function loadFileGltf(worker: Worker, fileUrl: string): Promise<GLTF> {
  const cached = fileGltfCache.get(fileUrl);
  if (cached) return cached;

  const promise = (async () => {
    const fetchResult = await ResultAsync.fromPromise(fetch(fileUrl), mapErr);
    if (fetchResult.isErr())
      return Promise.reject(
        new Error(`Failed to fetch: ${fetchResult.error} (${fileUrl})`),
      );
    const response = fetchResult.value;
    if (!response.ok)
      return Promise.reject(
        new Error(`Failed to fetch: ${response.statusText} (${fileUrl})`),
      );
    const bufferResult = await ResultAsync.fromPromise(
      response.arrayBuffer(),
      mapErr,
    );
    if (bufferResult.isErr())
      return Promise.reject(
        new Error(`Failed to read buffer: ${bufferResult.error}`),
      );

    const glbArrayBuffer = await convertBg3dToGltf(worker, bufferResult.value);
    const glbBlob = new Blob([glbArrayBuffer], { type: "model/gltf-binary" });
    const glbUrl = URL.createObjectURL(glbBlob);
    const loader = new GLTFLoader();
    const gltf = await new Promise<GLTF>((resolve, reject) => {
      const timeoutId = setTimeout(
        () => reject(new Error(`GLTFLoader timeout for ${fileUrl}`)),
        30000,
      );
      loader.load(
        glbUrl,
        (result: GLTF) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        undefined,
        (error: unknown) => {
          clearTimeout(timeoutId);
          const parseResult = errorSchema.safeParse(error);
          const errorMessage = parseResult.success
            ? parseResult.data
            : String(error);
          reject(new Error(`GLTFLoader error: ${errorMessage}`));
        },
      );
    });
    URL.revokeObjectURL(glbUrl);
    return gltf;
  })();

  fileGltfCache.set(fileUrl, promise);
  promise.then(undefined, () => {
    fileGltfCache.delete(fileUrl);
  });
  return promise;
}

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
