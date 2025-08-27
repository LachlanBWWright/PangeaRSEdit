// Hook for extracting model hierarchy from glTF scenes
import { useEffect } from "react";
import * as THREE from "three";
import { GLTF as GLTFResult } from "three-stdlib";
import { ModelNode } from "./types";
import { isJoint } from "./utils";

/**
 * Extract node hierarchy from the scene, filtering out joints
 */
function extractNode(obj: THREE.Object3D, level = 0): ModelNode | null {
  // Skip joints/bones
  if (isJoint(obj)) {
    return null;
  }
  
  const node: ModelNode = {
    name: obj.name || `Node_${obj.id}`,
    type:
      obj instanceof THREE.Mesh
        ? "mesh"
        : obj instanceof THREE.Group
        ? "group"
        : "node",
    visible: obj.visible,
    children: [],
    meshIndex: obj instanceof THREE.Mesh ? obj.id : undefined,
    nodeIndex: obj.id,
  };
  
  if (obj.children.length > 0) {
    node.children = obj.children.map((child) =>
      extractNode(child, level + 1),
    ).filter((child): child is ModelNode => child !== null);
  }
  
  return node;
}

/**
 * Hook for processing model hierarchy from glTF result
 */
export function useModelHierarchy(
  gltfResult: GLTFResult | undefined,
  setModelNodes: (nodes: ModelNode[]) => void,
  onSceneReady?: (scene: THREE.Group | undefined) => void
) {
  useEffect(() => {
    try {
      if (gltfResult?.scene) {
        const nodes = gltfResult.scene.children.map((child: THREE.Object3D) =>
          extractNode(child),
        ).filter((node): node is ModelNode => node !== null);
        
        setModelNodes(nodes);
        if (onSceneReady) onSceneReady(gltfResult.scene);
      } else {
        setModelNodes([]);
        if (onSceneReady) onSceneReady(undefined as any);
      }
    } catch (error) {
      console.error("Error in useModelHierarchy:", error);
      setModelNodes([]);
      if (onSceneReady) onSceneReady(undefined as any);
    }
  }, [gltfResult?.scene, setModelNodes, onSceneReady]);
}