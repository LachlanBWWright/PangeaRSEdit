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

  let polyCount: number | undefined;
  if (obj instanceof Mesh && obj.geometry) {
    const geo = obj.geometry;
    if (geo.index) {
      polyCount = Math.floor(geo.index.count / 3);
    } else if (geo.attributes.position) {
      polyCount = Math.floor(geo.attributes.position.count / 3);
    }
  }

  const node: ModelNode = {
    name: obj.name || `Node_${obj.id}`,
    type:
      obj instanceof Mesh ? "mesh" : obj instanceof Group ? "group" : "node",
    visible: obj.visible,
    children: [],
    meshIndex: obj instanceof Mesh ? obj.id : undefined,
    nodeIndex: obj.id,
    polyCount,
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
    if (gltfResult?.scene) {
      const extractedNodes = gltfResult.scene.children.map((child: Object3D) =>
        extractNode(child),
      );
      const nodes = extractedNodes.filter(
        (node): node is ModelNode => node !== null,
      );

      setModelNodes(nodes);
      if (onSceneReady) onSceneReady(gltfResult.scene);
    } else {
      setModelNodes([]);
      if (onSceneReady) onSceneReady(undefined);
    }
    // Only depend on gltfResult.scene
    // setModelNodes is a stable setState function (doesn't change between renders)
    // onSceneReady callback is memoized in parent component
  }, [gltfResult?.scene, onSceneReady, setModelNodes]);
}
