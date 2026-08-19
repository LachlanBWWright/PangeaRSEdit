import type { DragEvent, RefObject } from "react";
import type { Group, Object3D } from "three";
import { AnimationViewer, type AnimationEvent, type AnimationInfo, type ModelSourceKind } from "@/components/AnimationViewer";
import { ModelHierarchy } from "@/components/ModelHierarchy";
import { ModelRigPanel } from "@/components/ModelRigPanel";
import { TextureManager } from "@/components/TextureManager";
import { SidebarSection } from "@/components/model-viewer/SidebarSection";
import { ModelUploadPanel } from "./ModelUploadPanel";
import { VisualizationOptions } from "./VisualizationOptions";
import type { AnimationMixer } from "three";
import type { ModelNode } from "@/components/model-viewer/types";
import type { SkinWeightsData, WeightBrushSettings, WeightVisualizationMode } from "@/modelEditing/weights/weightTypes";
import type { UvLayout } from "@/modelEditing/uv/uvTypes";
import type { Texture, UploadStep } from "./types";
import type { ViewerInteractionMode, GizmoMode } from "@/components/model-viewer/types";
import type { BoneInfluenceRow } from "@/components/AnimationViewer/rigToolsState";

interface ModelViewerSidebarProps {
  gltfUrl: string | null;
  loading: boolean;
  uploadStep: UploadStep;
  pendingBg3dFile: File | null;
  fileInputRef: RefObject<HTMLInputElement | null>;
  handleDrop: (event: DragEvent<Element>) => Promise<void>;
  handleDragOver: (event: DragEvent<Element>) => void;
  handleBg3dFileSelect: (file: File) => Promise<void>;
  handleSkeletonFileSelect: (file?: File) => Promise<void>;
  handleSkipSkeleton: () => Promise<void>;
  handleFileUpload: (bg3dFile: File, skeletonFile?: File, gameLabel?: string) => Promise<import("neverthrow").Result<void, string>>;
  modelBaseName: string;
  onModelBaseNameChange: (name: string) => void;
  exportTargets: { id: string; label: string }[];
  handleDownloadSelectedExport: (targetId: string) => Promise<void>;
  handleClearModel: () => void;
  onCancelSelection: () => void;
  wireframeMode: boolean;
  setWireframeMode: (value: boolean) => void;
  showSkeletonOverlay: boolean;
  setShowSkeletonOverlay: (value: boolean) => void;
  logBonePositions: boolean;
  setLogBonePositions: (value: boolean) => void;
  hasSkeleton: boolean;
  canLogBonePositions: boolean;
  interactionMode: ViewerInteractionMode;
  setInteractionMode: (mode: ViewerInteractionMode) => void;
  weightVisualizationMode: WeightVisualizationMode;
  setWeightVisualizationMode: (mode: WeightVisualizationMode) => void;
  hasSkinWeights: boolean;
  modelNodes: ModelNode[];
  scene: Group | undefined;
  onVisibilityChange: (object: Object3D, visible: boolean) => void;
  hasAnimations: boolean;
  modelSessionId: number;
  animations: AnimationInfo[];
  animationMixer: AnimationMixer | null;
  gameLabel: string | null;
  modelSourceKind: ModelSourceKind | null;
  onAnimationsChange: (animations: AnimationInfo[]) => void;
  onBoneSelectionChange: (boneName: string | null) => void;
  onAnimationEventsChange: (index: number, events: AnimationEvent[]) => Promise<void>;
  animationMetadata: Record<string, { eventCount: number; events: AnimationEvent[] }>;
  boneTransform: [number, number, number] | null;
  boneRotation: [number, number, number, number] | null;
  boneScale: [number, number, number] | null;
  gizmoMode: GizmoMode;
  onGizmoModeChange: (mode: GizmoMode) => void;
  boneRenameInput: string;
  boneInfluenceRows: BoneInfluenceRow[];
  skinData: SkinWeightsData | null;
  onBoneRenameInputChange: (value: string) => void;
  onRenameSelectedBone: () => void;
  onRepairWeights: (data: SkinWeightsData) => void;
  textures: Texture[];
  onDownloadTexture: (texture: Texture) => Promise<void>;
  onReplaceTexture: (texture: Texture, file: File) => Promise<void>;
  onTextureEdit: (texture: Texture, imageData: ImageData) => Promise<void>;
  uvLayouts: ReadonlyMap<string, UvLayout>;
  onPreviewUvEdit: (textureName: string, layout: UvLayout) => void;
  onResetUvPreview: (textureName: string) => void;
  onApplyUvEdit: (textureName: string, layout: UvLayout) => void;
  selectedBoneName: string | null;
  onCreateBone: (baseName: string) => void;
  onRemoveSelectedBone: () => void;
  weightBrushSettings: WeightBrushSettings;
  onBrushSettingsChange: (settings: WeightBrushSettings) => void;
}

export function ModelViewerSidebar(props: ModelViewerSidebarProps) {
  const {
    gltfUrl, loading, uploadStep, pendingBg3dFile, fileInputRef, handleDrop,
    handleDragOver, handleBg3dFileSelect, handleSkeletonFileSelect,
    handleSkipSkeleton, handleFileUpload, modelBaseName, onModelBaseNameChange,
    exportTargets, handleDownloadSelectedExport, handleClearModel,
    onCancelSelection, wireframeMode, setWireframeMode, showSkeletonOverlay,
    setShowSkeletonOverlay, logBonePositions, setLogBonePositions, hasSkeleton,
    canLogBonePositions, interactionMode, setInteractionMode,
    weightVisualizationMode, setWeightVisualizationMode, hasSkinWeights,
    modelNodes, scene, onVisibilityChange, hasAnimations, modelSessionId,
    animations, animationMixer, gameLabel, modelSourceKind, onAnimationsChange,
    onBoneSelectionChange, onAnimationEventsChange, animationMetadata,
    boneTransform, boneRotation, boneScale, gizmoMode, onGizmoModeChange,
    boneRenameInput, boneInfluenceRows, skinData, onBoneRenameInputChange,
    onRenameSelectedBone, onRepairWeights, textures, onDownloadTexture,
    onReplaceTexture, onTextureEdit, uvLayouts, onPreviewUvEdit,
    onResetUvPreview, onApplyUvEdit, onCreateBone, onRemoveSelectedBone,
    weightBrushSettings, onBrushSettingsChange,
  } = props;

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="flex-1 min-h-0 space-y-4 overflow-y-auto overflow-x-hidden bg-gradient-to-b from-gray-900 via-gray-900 to-gray-950/80 px-3 pb-4 pt-2">
        <ModelUploadPanel
          gltfUrl={gltfUrl} loading={loading} uploadStep={uploadStep}
          pendingBg3dFile={pendingBg3dFile} fileInputRef={fileInputRef}
          handleDrop={handleDrop} handleDragOver={handleDragOver}
          handleBg3dFileSelect={handleBg3dFileSelect}
          handleSkeletonFileSelect={handleSkeletonFileSelect}
          handleSkipSkeleton={handleSkipSkeleton} handleFileUpload={handleFileUpload}
          modelBaseName={modelBaseName} onModelBaseNameChange={onModelBaseNameChange}
          exportTargets={[...exportTargets, { id: "glb", label: "GLB" }]}
          handleDownloadSelectedExport={handleDownloadSelectedExport}
          handleClearModel={handleClearModel} onCancelSelection={onCancelSelection}
        />
        {gltfUrl && <VisualizationOptions
          wireframeMode={wireframeMode} setWireframeMode={setWireframeMode}
          showSkeleton={showSkeletonOverlay} setShowSkeleton={setShowSkeletonOverlay}
          logBonePositions={logBonePositions} setLogBonePositions={setLogBonePositions}
          hasSkeleton={hasSkeleton} canLogBonePositions={canLogBonePositions}
          interactionMode={interactionMode} setInteractionMode={setInteractionMode}
          weightVisualizationMode={interactionMode === "paint-weights" ? weightVisualizationMode : "none"}
          setWeightVisualizationMode={setWeightVisualizationMode} hasSkinWeights={hasSkinWeights}
        />}
        {gltfUrl && (interactionMode === "bone-edit" || interactionMode === "paint-weights") &&
          (interactionMode === "bone-edit" ? hasAnimations || skinData !== null : skinData !== null) &&
          <SidebarSection title={interactionMode === "bone-edit" ? "Bone Editor" : "Weight Painting"}>
            <ModelRigPanel
              selectedBoneName={props.selectedBoneName} boneRenameInput={boneRenameInput}
              boneInfluenceRows={boneInfluenceRows} skinData={skinData}
              interactionMode={interactionMode} brushSettings={weightBrushSettings}
              onSelectBone={onBoneSelectionChange} onBoneRenameInputChange={onBoneRenameInputChange}
              onRenameSelectedBone={onRenameSelectedBone} onCreateBone={onCreateBone}
              onRemoveSelectedBone={onRemoveSelectedBone} gizmoMode={gizmoMode}
              onGizmoModeChange={onGizmoModeChange} onBrushSettingsChange={onBrushSettingsChange}
              onRepairWeights={onRepairWeights}
            />
          </SidebarSection>}
        {gltfUrl && interactionMode === "navigate" && modelNodes.length > 0 &&
          <ModelHierarchy nodes={modelNodes} clonedScene={scene} onVisibilityChange={onVisibilityChange} />}
        {gltfUrl && hasAnimations && interactionMode === "animate" &&
          <AnimationViewer
            key={modelSessionId} animations={animations} animationMixer={animationMixer}
            gameLabel={gameLabel} modelSourceKind={modelSourceKind}
            onAnimationsChange={onAnimationsChange} onBoneSelectionChange={onBoneSelectionChange}
            onAnimationEventsChange={onAnimationEventsChange} animationMetadata={animationMetadata}
            boneTransform={boneTransform} boneRotation={boneRotation} boneScale={boneScale}
            onGizmoModeChange={onGizmoModeChange} boneRenameInput={boneRenameInput}
            boneInfluenceRows={boneInfluenceRows} skinData={skinData}
            onBoneRenameInputChange={onBoneRenameInputChange}
            onRenameSelectedBone={onRenameSelectedBone} onRepairWeights={onRepairWeights}
          />}
        {gltfUrl && interactionMode === "navigate" && <SidebarSection title="Texture Management">
          {textures.length > 0 ? <TextureManager
            textures={textures} onDownloadTexture={onDownloadTexture}
            onReplaceTexture={onReplaceTexture} onTextureEdit={onTextureEdit}
            uvLayouts={uvLayouts} onPreviewUvEdit={onPreviewUvEdit}
            onResetUvPreview={onResetUvPreview} onApplyUvEdit={onApplyUvEdit}
          /> : <p className="text-sm text-gray-400">No textures found in this model</p>}
        </SidebarSection>}
      </div>
    </div>
  );
}
