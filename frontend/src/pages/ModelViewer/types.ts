/**
 * Type definitions for the ModelViewer component and related modules
 */

export interface Texture {
  name: string;
  url: string;
  type: "diffuse" | "normal" | "other";
  material?: string;
  size?: { width: number; height: number };
}

export type UploadStep = "select-bg3d" | "select-skeleton" | "completed";

// Re-export ModelNode and related types from model-viewer for convenience
export type { ModelNode, ModelCanvasProps } from "@/components/model-viewer/types";
