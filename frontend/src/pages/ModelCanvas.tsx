import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { EnhancedModelMesh } from "@/components/EnhancedModelMesh";

import * as THREE from "three";
import React, { useEffect } from "react";

interface ModelNode {
  name: string;
  type: "mesh" | "node" | "group";
  visible: boolean;
  children?: ModelNode[];
  meshIndex?: number;
  nodeIndex?: number;
}

type ModelCanvasProps = {
  gltfUrl: string;
  setModelNodes: (nodes: ModelNode[]) => void;
  onSceneReady?: (scene: THREE.Group | undefined) => void;
};

export function ModelCanvas(props: ModelCanvasProps) {
  const { gltfUrl, setModelNodes, onSceneReady } = props;
  // Always call useGLTF unconditionally
  const gltfResult = useGLTF(gltfUrl);

  // Extract node hierarchy from the scene
  function extractNode(obj: THREE.Object3D, level = 0): ModelNode {
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
      );
    }
    return node;
  }

  // Update model nodes when scene changes
  useEffect(() => {
    if (gltfResult?.scene) {
      const nodes = gltfResult.scene.children.map((child) =>
        extractNode(child),
      );
      setModelNodes(nodes);
      if (onSceneReady) onSceneReady(gltfResult.scene);
    } else {
      setModelNodes([]);
      if (onSceneReady) onSceneReady(undefined as any);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gltfResult?.scene]);

  return (
    <>
      {/* ModelHierarchy is now rendered in the sidebar by ModelViewer */}
      <Canvas
        camera={{
          position: [0, 0, 50],
          fov: 110,
          near: 0.1,
          far: 10000,
        }}
      >
        <ambientLight intensity={1} color={"#ff0000"} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={1} />
        {gltfResult && <EnhancedModelMesh scene={gltfResult.scene} />}
        <OrbitControls
          enablePan={false}
          enableZoom={true}
          enableRotate={true}
        />
      </Canvas>
    </>
  );
}
