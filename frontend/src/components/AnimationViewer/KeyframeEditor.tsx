/**
 * Keyframe Editor component for editing animation keyframes
 */

import type { MouseEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnimationControls } from "./AnimationControls";
import type { AnimationEvent, AnimationInfo, Keyframe, TimelineRow } from "./types";
import {
  formatBoneLabel,
  formatTime,
  getAnimationEventDetails,
  getAnimationEventTooltip,
  formatAnimationEventType,
  getAnimationEventValueLabel,
  TRACK_PROPERTY_CONFIG,
  TICKS_PER_SECOND,
  type ModelSourceKind,
  type TrackProperty,
} from "./utils";
import {
  BONE_NAME_MAX_WIDTH_CLASS,
  KEYFRAME_LIST_MAX_HEIGHT_CLASS,
  KEYFRAME_TIME_INPUT_CLASS,
  KEYFRAME_VALUE_INPUT_CLASS,
} from "./constants";

interface KeyframeEditorProps {
  selectedAnimationInfo: AnimationInfo | null;
  hasActiveAction: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  selectedBoneName: string;
  availableBoneNames: string[];
  selectedTrackProperty: TrackProperty;
  selectedKeyframes: Keyframe[];
  selectedKeyframeIndex: number | null;
  selectedEvents: AnimationEvent[];
  selectedEventIndex: number | null;
  keyframeTimeInput: string;
  keyframeValueInputs: string[];
  keyframeError: string | null;
  timelineRows: TimelineRow[];
  boneTransform: [number, number, number] | null;
  gameLabel?: string | null;
  modelSourceKind?: ModelSourceKind | null;
  isCreatingKeyframe: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onBoneNameChange: (boneName: string) => void;
  onTrackPropertyChange: (property: TrackProperty) => void;
  onSelectKeyframe: (index: number) => void;
  onSelectEvent: (index: number) => void;
  onNewKeyframe: () => void;
  onTimeInputChange: (time: string) => void;
  onValueInputChange: (index: number, value: string) => void;
  onUseBoneTransform: () => void;
  onDeleteKeyframe: () => void;
  onTimelineRowClick: (boneName: string) => void;
  onUndo: () => void;
  onRedo: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onReset: () => void;
  onSeek: (time: number) => void;
}

export function KeyframeEditor({
  selectedAnimationInfo,
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
  gameLabel,
  modelSourceKind,
  isCreatingKeyframe,
  canUndo,
  canRedo,
  onBoneNameChange,
  onTrackPropertyChange,
  onSelectKeyframe,
  onSelectEvent,
  onNewKeyframe,
  onTimeInputChange,
  onValueInputChange,
  onUseBoneTransform,
  onDeleteKeyframe,
  onTimelineRowClick,
  onUndo,
  onRedo,
  onPlay,
  onPause,
  onStop,
  onReset,
  onSeek,
}: KeyframeEditorProps) {
  if (!selectedAnimationInfo) {
    return (
      <p className="text-xs text-gray-400">
        Select an animation to edit keyframes.
      </p>
    );
  }

  const selectedTrackConfig = TRACK_PROPERTY_CONFIG[selectedTrackProperty];
  const ticksPerSecond = TICKS_PER_SECOND;
  const timelineDuration = duration;
  const totalTicks = Math.max(1, Math.ceil(timelineDuration * ticksPerSecond));
  const timelinePlayhead =
    timelineDuration > 0 ? (currentTime / timelineDuration) * 100 : 0;
  const clampTimelinePercent = (position: number) =>
    Math.min(99.5, Math.max(0, position));
  const showKeyframeDetails = selectedKeyframeIndex !== null || isCreatingKeyframe;
  const valuesHelpText =
    selectedTrackProperty === "rotation"
      ? "Rotation uses quaternion components: X, Y, Z, and W. These are not degrees; W is the scalar component."
      : selectedTrackProperty === "scale"
        ? "Scale is per-axis. 1 keeps the axis unchanged, values above 1 enlarge it, and values below 1 shrink it."
        : "Position is the bone offset along the X, Y, and Z axes.";
  const rulerTicks = Array.from(
    { length: Math.floor(totalTicks / ticksPerSecond) + 1 },
    (_value, index) => index * ticksPerSecond,
  );
  if (rulerTicks[rulerTicks.length - 1] !== totalTicks) {
    rulerTicks.push(totalTicks);
  }

  const handleTimelineSeek = (event: MouseEvent<HTMLDivElement>) => {
    if (timelineDuration <= 0) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    const position = (event.clientX - rect.left) / rect.width;
    onSeek(Math.min(timelineDuration, Math.max(0, position * timelineDuration)));
  };

  return (
    <div className="space-y-4 min-w-0">
      <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-900/50 p-3 shadow-sm min-w-0">
        <AnimationControls
          hasActiveAction={hasActiveAction}
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          onPlay={onPlay}
          onPause={onPause}
          onStop={onStop}
          onReset={onReset}
        />

        <div className="space-y-3 min-w-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Timeline</span>
              <span className="text-[10px] text-gray-500">
                {formatTime(duration)}
              </span>
            </div>
            <div
              className="relative h-14 overflow-hidden rounded-md border border-gray-700 bg-gray-800/80"
              onClick={handleTimelineSeek}
              role="presentation"
            >
              <div
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
              >
                {rulerTicks.map((tick) => {
                  const position = (tick / totalTicks) * 100;
                  const isMajor = tick % ticksPerSecond === 0;
                  return (
                    <div
                      key={`ruler-${tick}`}
                      className="absolute top-0 h-full"
                      style={{ left: `${clampTimelinePercent(position)}%` }}
                    >
                      <div
                        className={`absolute bottom-0 w-px ${
                          isMajor ? "h-full bg-gray-500" : "h-3 bg-gray-700"
                        }`}
                      />
                      {isMajor && (
                        <>
                          <span className="absolute top-1 -translate-x-1/2 text-[10px] text-gray-300">
                            {formatTime(tick / ticksPerSecond)}
                          </span>
                          <span className="absolute bottom-1 -translate-x-1/2 text-[10px] text-gray-500">
                            {tick}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}
                <div
                  className="absolute top-0 h-full w-px bg-blue-400/80"
                  style={{
                    left: `${clampTimelinePercent(timelinePlayhead)}%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-[10px] uppercase tracking-wide text-gray-400">
              Events
            </div>
            <div className="relative h-10 overflow-hidden rounded-md bg-gray-800/70">
              <div
                className="pointer-events-none absolute inset-0"
                aria-hidden="true"
              >
                {rulerTicks.map((tick) => {
                  const position = (tick / totalTicks) * 100;
                  const isMajor = tick % ticksPerSecond === 0;
                  return (
                    <div
                      key={`event-grid-${tick}`}
                      className="absolute top-0 h-full"
                      style={{ left: `${clampTimelinePercent(position)}%` }}
                    >
                      <div
                        className={`absolute bottom-0 w-px ${
                          isMajor ? "h-full bg-gray-600/80" : "h-3 bg-gray-700"
                        }`}
                      />
                    </div>
                  );
                })}
                <div
                  className="absolute top-0 h-full w-px bg-blue-400/80"
                  style={{
                    left: `${clampTimelinePercent(timelinePlayhead)}%`,
                  }}
                />
              </div>
              {selectedEvents.map((event, index) => {
                const position = totalTicks > 0 ? (event.time / totalTicks) * 100 : 0;
                const isSelected = selectedEventIndex === index;
                const valueLabel = getAnimationEventValueLabel(
                  event.type,
                  event.value,
                  modelSourceKind,
                  gameLabel,
                );
                const valueDetails = getAnimationEventDetails(
                  event.type,
                  event.value,
                  modelSourceKind,
                  gameLabel,
                );
                return (
                  <button
                    key={`${event.time}-${event.type}-${event.value}-${index}`}
                    type="button"
                    className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 border ${
                      isSelected
                        ? "border-amber-100 bg-amber-500"
                        : "border-amber-300 bg-amber-400"
                    }`}
                    style={{
                      left: `${clampTimelinePercent(position)}%`,
                    }}
                    onClick={() => onSelectEvent(index)}
                    title={`Event @ ${event.time} ticks (${formatTime(
                      event.time / ticksPerSecond,
                    )}) - ${formatAnimationEventType(event.type)} - ${valueLabel}${
                      valueDetails ? `: ${valueDetails}` : ""
                    }${
                      getAnimationEventTooltip(event.type)
                        ? ` | ${getAnimationEventTooltip(event.type)}`
                        : ""
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {timelineRows.map((row) => {
            const isSelected = row.boneName === selectedBoneName;
            return (
              <div key={row.boneName} className="space-y-1">
                <div className="text-[10px] uppercase tracking-wide text-gray-400">
                  {formatBoneLabel(row.boneName)}
                </div>
                <div
                  className={`relative h-8 overflow-hidden rounded-md ${
                    isSelected ? "bg-blue-950/35" : "bg-gray-800/80"
                  }`}
                >
                  <div
                    className="pointer-events-none absolute inset-0"
                    aria-hidden="true"
                  >
                    {rulerTicks.map((tick) => {
                      const position = (tick / totalTicks) * 100;
                      const isMajor = tick % ticksPerSecond === 0;
                      return (
                        <div
                          key={`bone-grid-${row.boneName}-${tick}`}
                          className="absolute top-0 h-full"
                          style={{
                            left: `${clampTimelinePercent(position)}%`,
                          }}
                        >
                          <div
                            className={`absolute bottom-0 w-px ${
                              isMajor ? "h-full bg-gray-600/80" : "h-3 bg-gray-700"
                            }`}
                          />
                        </div>
                      );
                    })}
                    <div
                      className="absolute top-0 h-full w-px bg-blue-400/80"
                      style={{
                        left: `${clampTimelinePercent(timelinePlayhead)}%`,
                      }}
                    />
                  </div>
                  {row.times.map((time, index) => {
                    const position =
                      timelineDuration > 0 ? (time / timelineDuration) * 100 : 0;
                    return (
                      <button
                        key={`${row.boneName}-${time}-${index}`}
                        type="button"
                        className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400"
                        style={{
                          left: `${clampTimelinePercent(position)}%`,
                        }}
                        onClick={() => onTimelineRowClick(row.boneName)}
                        title={`${formatTime(time)}`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-gray-700 bg-gray-900/30 p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs text-gray-300">Bone</label>
            <Select value={selectedBoneName} onValueChange={onBoneNameChange}>
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue placeholder="Select bone" />
              </SelectTrigger>
              <SelectContent className="max-h-60 bg-gray-700 border-gray-600 text-white">
                {availableBoneNames.length === 0 ? (
                  <div className="px-2 py-1 text-xs text-gray-400">
                    No bones found
                  </div>
                ) : (
                  availableBoneNames.map((bone) => {
                    const formattedBone = formatBoneLabel(bone);
                    return (
                      <SelectItem
                        key={bone}
                        value={bone}
                        className="text-white focus:bg-gray-600"
                        textValue={formattedBone}
                      >
                        <span
                          className={`block ${BONE_NAME_MAX_WIDTH_CLASS} truncate`}
                          title={bone}
                        >
                          {formattedBone}
                        </span>
                      </SelectItem>
                    );
                  })
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-gray-300">Track</label>
            <Select
              value={selectedTrackProperty}
              onValueChange={(value) => {
                const nextProperty =
                  value === "rotation"
                    ? "rotation"
                    : value === "scale"
                      ? "scale"
                      : "position";
                onTrackPropertyChange(nextProperty);
              }}
            >
              <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-700 border-gray-600 text-white">
                {Object.entries(TRACK_PROPERTY_CONFIG).map(([key, config]) => (
                  <SelectItem
                    key={key}
                    value={key}
                    className="text-white focus:bg-gray-600"
                  >
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-gray-300">
          <span>Keyframes</span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={onUndo}
              disabled={!canUndo}
            >
              Undo
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={onRedo}
              disabled={!canRedo}
            >
              Redo
            </Button>
          </div>
        </div>
        {selectedKeyframes.length > 0 ? (
          <div
            className={`space-y-2 ${KEYFRAME_LIST_MAX_HEIGHT_CLASS} overflow-y-auto rounded-md border border-gray-700 p-2`}
          >
            {selectedKeyframes.map((keyframe, index) => {
              const isSelected = selectedKeyframeIndex === index;
              return (
                <Button
                  key={`${keyframe.time}-${index}`}
                  size="sm"
                  className={`w-full justify-between ${
                    isSelected ? "bg-blue-700 hover:bg-blue-700" : ""
                  }`}
                  onClick={() => onSelectKeyframe(index)}
                >
                  <span>#{index + 1}</span>
                  <span>{formatTime(keyframe.time)}</span>
                </Button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            No keyframes found for this track.
          </p>
        )}
        <Button
          size="sm"
          className={`w-full ${
            isCreatingKeyframe
              ? "border-blue-300 bg-blue-700 text-white hover:bg-blue-700"
              : ""
          }`}
          onClick={onNewKeyframe}
        >
          {isCreatingKeyframe ? "Creating Keyframe" : "New Keyframe"}
        </Button>
      </div>

      {showKeyframeDetails && (
        <div
          className={`space-y-4 rounded-md border p-3 ${
            isCreatingKeyframe
              ? "border-blue-500/70 bg-blue-950/30"
              : "border-gray-700 bg-gray-900/20"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-xs font-semibold text-gray-200">
              {isCreatingKeyframe
                ? "Creating new keyframe"
                : selectedKeyframeIndex !== null
                  ? `Editing keyframe #${selectedKeyframeIndex + 1}`
                  : "Keyframe details"}
            </div>
            {isCreatingKeyframe && (
              <div className="text-[10px] uppercase tracking-wide text-blue-200">
                Auto-saves when valid
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="text-xs text-gray-300">Time (seconds)</label>
            <Input
              type="text"
              inputMode="decimal"
              value={keyframeTimeInput}
              onChange={(event) => onTimeInputChange(event.target.value)}
              className={KEYFRAME_TIME_INPUT_CLASS}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-gray-300">Values</label>
            <p className="text-[10px] leading-snug text-gray-500">
              {valuesHelpText}
            </p>
            {boneTransform && selectedTrackProperty === "position" && (
              <div className="space-y-1 text-[10px] text-gray-400">
                {boneTransform.map((val, index) => {
                  const fallbackLabels = ["X", "Y", "Z", "W"];
                  const label =
                    selectedTrackConfig.components[index] ??
                    fallbackLabels[index] ??
                    `Component ${index + 1}`;
                  return (
                    <div key={`gizmo-${index}`}>
                      Gizmo {label}: {val.toFixed(2)}
                    </div>
                  );
                })}
                <Button size="sm" onClick={onUseBoneTransform}>
                  Use Gizmo Values
                </Button>
              </div>
            )}
            <div className="space-y-3">
              {selectedTrackConfig.components.map((label, index) => (
                <Input
                  key={label}
                  type="text"
                  inputMode="decimal"
                  placeholder={label}
                  value={keyframeValueInputs[index] ?? ""}
                  onChange={(event) =>
                    onValueInputChange(index, event.target.value)
                  }
                  className={KEYFRAME_VALUE_INPUT_CLASS}
                />
              ))}
            </div>
          </div>
          {keyframeError && <p className="text-xs text-red-300">{keyframeError}</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              size="sm"
              variant="destructive"
              className="flex-1"
              onClick={() => {
                const keyframe =
                  selectedKeyframeIndex !== null
                    ? selectedKeyframes[selectedKeyframeIndex]
                    : null;
                const message =
                  keyframe && selectedKeyframeIndex !== null
                    ? `Delete keyframe #${selectedKeyframeIndex + 1} at ${formatTime(
                        keyframe.time,
                      )}?`
                    : "Delete this keyframe?";
                if (window.confirm(message)) {
                  onDeleteKeyframe();
                }
              }}
              disabled={selectedKeyframeIndex === null}
            >
              Delete Keyframe
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
