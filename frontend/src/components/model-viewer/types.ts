// Types for model hierarchy and node management
import { Object3D, Group, AnimationMixer } from "three";
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
  threeObject?: Object3D;
}

export interface ModelCanvasProps {
  gltfUrl: string;
  setModelNodes: (nodes: ModelNode[]) => void;
  onSceneReady?: (scene: Group | undefined) => void;
  onAnimationsReady?: (
    animations: AnimationInfo[],
    mixer: AnimationMixer | null,
  ) => void;
  onBoneTransformChange?: (position: [number, number, number]) => void;
  wireframeMode?: boolean;
  showSkeleton?: boolean;
  logBonePositions?: boolean;
  selectedBoneName?: string | null;
  gameType?: Game;
}
