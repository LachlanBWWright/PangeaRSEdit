// Types for model hierarchy and node management
import * as THREE from "three";
import { AnimationInfo } from "@/components/AnimationViewer";
import { Game } from "@/data/globals/globals";

export interface ModelNode {
  name: string;
  type: "mesh" | "node" | "group";
  visible: boolean;
  children?: ModelNode[];
  meshIndex?: number;
  nodeIndex?: number;
  // Reference to the original THREE.Object3D for proper matching
  threeObject?: THREE.Object3D;
}

export interface ModelCanvasProps {
  gltfUrl: string;
  setModelNodes: (nodes: ModelNode[]) => void;
  onSceneReady?: (scene: THREE.Group | undefined) => void;
  onAnimationsReady?: (
    animations: AnimationInfo[],
    mixer: THREE.AnimationMixer | null,
  ) => void;
  wireframeMode?: boolean;
  showSkeleton?: boolean;
  logBonePositions?: boolean;
  gameType?: Game;
}
