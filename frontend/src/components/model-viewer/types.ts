// Types for model hierarchy and node management
import * as THREE from "three";
import { AnimationInfo } from "@/components/AnimationViewer";

export interface ModelNode {
  name: string;
  type: "mesh" | "node" | "group";
  visible: boolean;
  children?: ModelNode[];
  meshIndex?: number;
  nodeIndex?: number;
}

export type ModelCanvasProps = {
  gltfUrl: string;
  setModelNodes: (nodes: ModelNode[]) => void;
  onSceneReady?: (scene: THREE.Group | undefined) => void;
  onAnimationsReady?: (animations: AnimationInfo[], mixer: THREE.AnimationMixer | null) => void;
};