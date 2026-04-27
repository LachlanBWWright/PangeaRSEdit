import type { RefObject } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimationSelector } from "./AnimationSelector";
import { AnimationEditor } from "./AnimationEditor";
import { KeyframeEditor } from "./KeyframeEditor";
import { AnimationMetadataDisplay } from "./AnimationMetadataDisplay";
import { AnimationEventEditor } from "./AnimationEventEditor";
import { AnimationCreator } from "./AnimationCreator";
import { ViewerSection } from "@/components/AnimationViewer/animationViewerSections";
import type { AnimationEvent, AnimationInfo, TimelineRow } from "./types";
import type { BoneInfluenceRow } from "./rigToolsState";
import type { ModelSourceKind, TrackProperty } from "./utils";

interface AnimationViewerLayoutProps {
  editableAnimations: AnimationInfo[];
  selectedAnimation: number | null;
  selectedAnimationInfo: AnimationInfo | null;
  newAnimationName: string;
  newAnimationDurationInput: string;
  editName: string;
  editDurationInput: string;
  durationMode: "scale" | "truncate";
  durationError: string | null;
  hasActiveAction: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  selectedBoneName: string;
  availableBoneNames: string[];
  selectedTrackProperty: TrackProperty;
  selectedKeyframes: { time: number; values: number[] }[];
  selectedKeyframeIndex: number | null;
  selectedEvents: AnimationEvent[];
  selectedEventIndex: number | null;
  keyframeTimeInput: string;
  keyframeValueInputs: string[];
  keyframeError: string | null;
  timelineRows: TimelineRow[];
  boneTransform: [number, number, number] | null;
  boneRotation: [number, number, number, number] | null;
  boneScale: [number, number, number] | null;
  gameLabel?: string | null;
  modelSourceKind?: ModelSourceKind | null;
  isCreatingKeyframe: boolean;
  canUndo: boolean;
  canRedo: boolean;
  totalKeyframes: number;
  selectedMetadata: import("./types").AnimationMetadata | null;
  eventsSectionRef: RefObject<HTMLDivElement | null>;
  editKeyframesSectionRef: RefObject<HTMLDivElement | null>;
  onSelectionChange: (value: string) => void;
  onNewAnimationNameChange: (value: string) => void;
  onNewAnimationDurationChange: (value: string) => void;
  onCreateAnimation: (sourceAnimationIndex: number | null) => void;
  onEditNameChange: (value: string) => void;
  onEditDurationChange: (value: string) => void;
  onLoopModeChange: (mode: import("./hooks").LoopMode) => void;
  onDurationModeChange: (mode: "scale" | "truncate") => void;
  onApplyEditorChanges: () => void;
  onDeleteAnimation: () => void;
  onBoneNameChange: (boneName: string) => void;
  onTrackPropertyChange: (property: TrackProperty) => void;
  onSelectKeyframe: (index: number) => void;
  onNewKeyframe: () => void;
  onTimeInputChange: (value: string) => void;
  onValueInputChange: (index: number, value: string) => void;
  onUseBoneTransform: () => void;
  onUseGizmoRotation: () => void;
  onUseGizmoScale: () => void;
  onDeleteKeyframe: () => void;
  onTimelineRowClick: (boneName: string, time: number) => void;
  onTimelineEventClick: (index: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onReset: () => void;
  onSeek: (time: number) => void;
  onSelectEvent: (index: number) => void;
  onAddEvent: () => void;
  onUpdateEvent: (index: number, event: AnimationEvent) => void;
  onDeleteEvent: (index: number) => void;
  boneRenameInput: string;
  boneInfluenceRows: BoneInfluenceRow[];
  skinData?: import("@/modelEditing/weights/weightTypes").SkinWeightsData | null;
  onBoneRenameInputChange: (value: string) => void;
  onRenameSelectedBone: () => void;
  onRepairWeights?: (repaired: import("@/modelEditing/weights/weightTypes").SkinWeightsData) => void;
}

export function AnimationViewerLayout({
  editableAnimations,
  selectedAnimation,
  selectedAnimationInfo,
  newAnimationName,
  newAnimationDurationInput,
  editName,
  editDurationInput,
  durationMode,
  durationError,
  hasActiveAction,
  isPlaying,
  currentTime,
  duration,
  selectedBoneName,
  availableBoneNames,
  selectedTrackProperty,
  selectedKeyframes,
  selectedKeyframeIndex,
  selectedEvents,
  selectedEventIndex,
  keyframeTimeInput,
  keyframeValueInputs,
  keyframeError,
  timelineRows,
  boneTransform,
  boneRotation,
  boneScale,
  gameLabel,
  modelSourceKind,
  isCreatingKeyframe,
  canUndo,
  canRedo,
  totalKeyframes,
  selectedMetadata,
  eventsSectionRef,
  editKeyframesSectionRef,
  onSelectionChange,
  onNewAnimationNameChange,
  onNewAnimationDurationChange,
  onCreateAnimation,
  onEditNameChange,
  onEditDurationChange,
  onLoopModeChange,
  onDurationModeChange,
  onApplyEditorChanges,
  onDeleteAnimation,
  onBoneNameChange,
  onTrackPropertyChange,
  onSelectKeyframe,
  onNewKeyframe,
  onTimeInputChange,
  onValueInputChange,
  onUseBoneTransform,
  onUseGizmoRotation,
  onUseGizmoScale,
  onDeleteKeyframe,
  onTimelineRowClick,
  onTimelineEventClick,
  onUndo,
  onRedo,
  onPlay,
  onPause,
  onStop,
  onReset,
  onSeek,
  onSelectEvent,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  boneRenameInput,
  boneInfluenceRows,
  skinData,
  onBoneRenameInputChange,
  onRenameSelectedBone,
  onRepairWeights,
}: AnimationViewerLayoutProps) {
  return (
    <Card className="flex min-h-0 flex-col overflow-hidden bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white text-sm">
          Animations ({editableAnimations.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="min-h-0 flex-1 space-y-4 overflow-y-auto">
        <AnimationSelector
          selectedAnimation={selectedAnimation}
          editableAnimations={editableAnimations}
          onSelectionChange={onSelectionChange}
        />

        <AnimationCreator
          editableAnimations={editableAnimations}
          newAnimationName={newAnimationName}
          newAnimationDurationInput={newAnimationDurationInput}
          onNameChange={onNewAnimationNameChange}
          onDurationChange={onNewAnimationDurationChange}
          onCreate={onCreateAnimation}
        />

        <ViewerSection title="Edit Animation Properties">
          <AnimationEditor
            selectedAnimationInfo={selectedAnimationInfo}
            editName={editName}
            editDurationInput={editDurationInput}
            durationMode={durationMode}
            durationError={durationError}
            onNameChange={onEditNameChange}
            onDurationInputChange={onEditDurationChange}
            onLoopModeChange={onLoopModeChange}
            onDurationModeChange={onDurationModeChange}
            onApplyChanges={onApplyEditorChanges}
            onDeleteAnimation={onDeleteAnimation}
          />
        </ViewerSection>

        <ViewerSection title="Animation Timeline">
          <KeyframeEditor
            selectedAnimationInfo={selectedAnimationInfo}
            hasActiveAction={hasActiveAction}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            selectedBoneName={selectedBoneName}
            availableBoneNames={availableBoneNames}
            selectedTrackProperty={selectedTrackProperty}
            selectedKeyframes={selectedKeyframes}
            selectedKeyframeIndex={selectedKeyframeIndex}
            selectedEvents={selectedEvents}
            selectedEventIndex={selectedEventIndex}
            keyframeTimeInput={keyframeTimeInput}
            keyframeValueInputs={keyframeValueInputs}
            keyframeError={keyframeError}
            timelineRows={timelineRows}
            boneTransform={boneTransform}
            boneRotation={boneRotation}
            boneScale={boneScale}
            gameLabel={gameLabel}
            modelSourceKind={modelSourceKind}
            isCreatingKeyframe={isCreatingKeyframe}
            canUndo={canUndo}
            canRedo={canRedo}
            onBoneNameChange={onBoneNameChange}
            onTrackPropertyChange={onTrackPropertyChange}
            onSelectKeyframe={onSelectKeyframe}
            onNewKeyframe={onNewKeyframe}
            onTimeInputChange={onTimeInputChange}
            onValueInputChange={onValueInputChange}
            onUseBoneTransform={onUseBoneTransform}
            onUseGizmoRotation={onUseGizmoRotation}
            onUseGizmoScale={onUseGizmoScale}
            onDeleteKeyframe={onDeleteKeyframe}
            onTimelineRowClick={onTimelineRowClick}
            onTimelineEventClick={onTimelineEventClick}
            editKeyframesSectionRef={editKeyframesSectionRef}
            onUndo={onUndo}
            onRedo={onRedo}
            onPlay={onPlay}
            onPause={onPause}
            onStop={onStop}
            onReset={onReset}
            onSeek={onSeek}
            boneRenameInput={boneRenameInput}
            boneInfluenceRows={boneInfluenceRows}
            skinData={skinData}
            onBoneRenameInputChange={onBoneRenameInputChange}
            onRenameSelectedBone={onRenameSelectedBone}
            onRepairWeights={onRepairWeights}
          />
        </ViewerSection>

        <ViewerSection title="Animation Events" containerRef={eventsSectionRef}>
          <AnimationEventEditor
            selectedAnimationInfo={selectedAnimationInfo}
            selectedEvents={selectedEvents}
            selectedEventIndex={selectedEventIndex}
            gameLabel={gameLabel}
            modelSourceKind={modelSourceKind}
            onSelectEvent={onSelectEvent}
            onAddEvent={onAddEvent}
            onUpdateEvent={onUpdateEvent}
            onDeleteEvent={onDeleteEvent}
          />
        </ViewerSection>

        <ViewerSection title="Animation Metadata">
          <AnimationMetadataDisplay
            selectedAnimationInfo={selectedAnimationInfo}
            selectedMetadata={selectedMetadata}
            timelineRows={timelineRows}
            totalKeyframes={totalKeyframes}
          />
        </ViewerSection>
      </CardContent>
    </Card>
  );
}
