// Hook for extracting model hierarchy from glTF scenes
import { useEffect } from "react";
import { Object3D, Mesh, Group } from "three";
import { GLTF as GLTFResult } from "three-stdlib";
import { ModelNode } from "./types";
import { isJoint } from "./utils";

/**
 * Extract node hierarchy from the scene, filtering out joints
 */
function extractNode(obj: Object3D, level = 0): ModelNode | null {
  // Skip joints/bones
  if (isJoint(obj)) {
    return null;
  }

  const node: ModelNode = {
    name: obj.name || `Node_${obj.id}`,
    type:
      obj instanceof Mesh
        ? "mesh"
        : obj instanceof Group
        ? "group"
        : "node",
    visible: obj.visible,
    children: [],
    meshIndex: obj instanceof Mesh ? obj.id : undefined,
    nodeIndex: obj.id,
    // Store reference to the original THREE object for proper matching later
    threeObject: obj,
  };

  if (obj.children.length > 0) {
    node.children = obj.children
      .map((child) => extractNode(child, level + 1))
      .filter((child): child is ModelNode => child !== null);
  }

  return node;
}

/**
 * Hook for processing model hierarchy from glTF result
 */
export function useModelHierarchy(
  gltfResult: GLTFResult | undefined,
  setModelNodes: (nodes: ModelNode[]) => void,
  onSceneReady?: (scene: Group | undefined) => void,
) {
  useEffect(() => {
    try {
      if (gltfResult?.scene) {
        const nodes = gltfResult.scene.children
          .map((child: THREE.Object3D) => extractNode(child))
          .filter((node): node is ModelNode => node !== null);

        setModelNodes(nodes);
        if (onSceneReady) onSceneReady(gltfResult.scene);
      } else {
        setModelNodes([]);
        if (onSceneReady) onSceneReady(undefined);
      }
    } catch (error) {
      console.error("Error in useModelHierarchy:", error);
      setModelNodes([]);
      if (onSceneReady) onSceneReady(undefined);
    }
    // Only depend on gltfResult.scene
    // setModelNodes is a stable setState function (doesn't change between renders)
    // onSceneReady callback is memoized in parent component
  }, [gltfResult?.scene, onSceneReady, setModelNodes]);
}
