import { Redo2, Undo2, Upload } from "lucide-react";
import type { AnimationMixer, Group } from "three";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { ModelCanvas } from "../ModelCanvas";
import type { ModelNode, GizmoMode, ViewerInteractionMode } from "@/components/model-viewer/types";
import type { SkinWeightsData, WeightBrushSettings, WeightVisualizationMode } from "@/modelEditing/weights/weightTypes";
import type { WeightBrushHit } from "@/modelEditing/weights/weightBrushStroke";

interface ModelViewerViewportProps {
  gltfUrl: string | null;
  scene: Group | undefined;
  setModelNodes: (nodes: ModelNode[]) => void;
  onSceneReady: (scene: Group | undefined) => void;
  onAnimationsReady: (animations: import("@/components/AnimationViewer").AnimationInfo[], mixer: AnimationMixer | null) => void;
  wireframeMode: boolean;
  showSkeleton: boolean;
  logBonePositions: boolean;
  selectedBoneName: string | null;
  onBoneTransformChange: (position: [number, number, number]) => void;
  onBoneRotationChange: (quaternion: [number, number, number, number]) => void;
  onBoneScaleChange: (scale: [number, number, number]) => void;
  gizmoMode: GizmoMode;
  interactionMode: ViewerInteractionMode;
  skinData: SkinWeightsData | null;
  weightBrushSettings: WeightBrushSettings;
  weightVisualizationMode: WeightVisualizationMode;
  onWeightBrushStroke: (hit: WeightBrushHit) => void;
  sceneUpdateRevision: number;
  pastCount: number;
  futureCount: number;
  onUndo: () => void;
  onRedo: () => void;
}

export function ModelViewerViewport({
  gltfUrl, setModelNodes, onSceneReady, onAnimationsReady, wireframeMode,
  showSkeleton, logBonePositions, selectedBoneName, onBoneTransformChange,
  onBoneRotationChange, onBoneScaleChange, gizmoMode, interactionMode,
  skinData, weightBrushSettings, weightVisualizationMode, onWeightBrushStroke,
  sceneUpdateRevision, pastCount, futureCount, onUndo, onRedo,
}: ModelViewerViewportProps) {
  const hasLoadedModel = gltfUrl !== null;
  return (
    <div className="relative h-full min-h-0 overflow-hidden rounded-lg bg-gray-800">
      {hasLoadedModel && <div className="absolute left-3 top-3 z-20 flex gap-1 rounded-md border border-gray-600/80 bg-gray-900/80 p-1 shadow-lg backdrop-blur-sm">
        <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-200" onClick={onUndo} disabled={pastCount === 0} aria-label="Undo model change" title="Undo">
          <Undo2 className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-200" onClick={onRedo} disabled={futureCount === 0} aria-label="Redo model change" title="Redo">
          <Redo2 className="h-4 w-4" />
        </Button>
      </div>}
      {hasLoadedModel ? <ErrorBoundary><ModelCanvas
        gltfUrl={gltfUrl} setModelNodes={setModelNodes} onSceneReady={onSceneReady}
        onAnimationsReady={onAnimationsReady} wireframeMode={wireframeMode}
        showSkeleton={showSkeleton} logBonePositions={logBonePositions}
        selectedBoneName={selectedBoneName} onBoneTransformChange={onBoneTransformChange}
        onBoneRotationChange={onBoneRotationChange} onBoneScaleChange={onBoneScaleChange}
        gizmoMode={gizmoMode} interactionMode={interactionMode} skinData={skinData}
        weightBrushSettings={weightBrushSettings} weightVisualizationMode={weightVisualizationMode}
        onWeightBrushStroke={onWeightBrushStroke} sceneUpdateRevision={sceneUpdateRevision}
      /></ErrorBoundary> : <div className="flex items-center justify-center h-full text-gray-400">
        <div className="text-center">
          <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-gray-700 flex items-center justify-center"><Upload className="w-12 h-12" /></div>
          <h3 className="text-xl font-semibold mb-2">No Model Loaded</h3>
          <p>Upload a BG3D file to start viewing 3D models</p>
        </div>
      </div>}
    </div>
  );
}
