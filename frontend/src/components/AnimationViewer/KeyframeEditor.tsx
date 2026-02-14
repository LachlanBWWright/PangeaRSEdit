/**
 * Keyframe Editor component for editing animation keyframes
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnimationInfo, Keyframe, TimelineRow } from "./types";
import {
  formatBoneLabel,
  formatTime,
  TRACK_PROPERTY_CONFIG,
  type TrackProperty,
} from "./utils";
import {
  TIMELINE_MIN_WIDTH_CLASS,
  BONE_NAME_MAX_WIDTH_CLASS,
  KEYFRAME_LIST_MAX_HEIGHT_CLASS,
  KEYFRAME_TIME_INPUT_CLASS,
  KEYFRAME_VALUE_INPUT_CLASS,
  TIMELINE_TABLE_MIN_WIDTH_CLASS,
} from "./constants";

interface KeyframeEditorProps {
  selectedAnimationInfo: AnimationInfo | null;
  selectedBoneName: string;
  availableBoneNames: string[];
  selectedTrackProperty: TrackProperty;
  selectedKeyframes: Keyframe[];
  selectedKeyframeIndex: number | null;
  keyframeTimeInput: string;
  keyframeValueInputs: string[];
  keyframeError: string | null;
  timelineDuration: number;
  timelinePlayhead: number;
  timelineRows: TimelineRow[];
  boneTransform: [number, number, number] | null;
  onBoneNameChange: (boneName: string) => void;
  onTrackPropertyChange: (property: TrackProperty) => void;
  onSelectKeyframe: (index: number) => void;
  onNewKeyframe: () => void;
  onTimeInputChange: (time: string) => void;
  onValueInputChange: (index: number, value: string) => void;
  onUseBoneTransform: () => void;
  onApplyKeyframe: () => void;
  onDeleteKeyframe: () => void;
  onTimelineRowClick: (boneName: string) => void;
}

export function KeyframeEditor({
  selectedAnimationInfo,
  selectedBoneName,
  availableBoneNames,
  selectedTrackProperty,
  selectedKeyframes,
  selectedKeyframeIndex,
  keyframeTimeInput,
  keyframeValueInputs,
  keyframeError,
  timelineDuration,
  timelinePlayhead,
  timelineRows,
  boneTransform,
  onBoneNameChange,
  onTrackPropertyChange,
  onSelectKeyframe,
  onNewKeyframe,
  onTimeInputChange,
  onValueInputChange,
  onUseBoneTransform,
  onApplyKeyframe,
  onDeleteKeyframe,
  onTimelineRowClick,
}: KeyframeEditorProps) {
  if (!selectedAnimationInfo) {
    return (
      <p className="text-xs text-gray-400">
        Select an animation to edit keyframes.
      </p>
    );
  }

  const selectedTrackConfig = TRACK_PROPERTY_CONFIG[selectedTrackProperty];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-xs text-gray-300">Bone</label>
          <Select value={selectedBoneName} onValueChange={onBoneNameChange}>
            <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Select bone" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600 text-white max-h-60">
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
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-400">
          <span>0:00.00</span>
          <span>{formatTime(timelineDuration)}</span>
        </div>
        <div className="overflow-x-auto">
          <div
            className={`relative h-10 ${TIMELINE_MIN_WIDTH_CLASS} rounded-md border border-gray-700 bg-gray-800`}
          >
            <div
              className="absolute top-0 h-full w-px bg-blue-400"
              style={{
                left: `${Math.min(100, Math.max(0, timelinePlayhead))}%`,
              }}
            />
            {selectedKeyframes.map((keyframe, index) => {
              const position =
                timelineDuration > 0
                  ? (keyframe.time / timelineDuration) * 100
                  : 0;
              const isSelected = selectedKeyframeIndex === index;
              return (
                <button
                  key={`${keyframe.time}-${index}`}
                  type="button"
                  className={`absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border ${
                    isSelected
                      ? "border-blue-200 bg-blue-500"
                      : "border-gray-500 bg-gray-300"
                  }`}
                  style={{
                    left: `${Math.min(100, Math.max(0, position))}%`,
                  }}
                  onClick={() => onSelectKeyframe(index)}
                  title={`#${index + 1} @ ${formatTime(keyframe.time)}`}
                />
              );
            })}
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-300">Keyframes</span>
          <Button size="sm" onClick={onNewKeyframe}>
            New Keyframe
          </Button>
        </div>
        {selectedKeyframes.length > 0 ? (
          <div
            className={`space-y-2 ${KEYFRAME_LIST_MAX_HEIGHT_CLASS} overflow-y-auto rounded-md border border-gray-700 p-2`}
          >
            {selectedKeyframes.map((keyframe, index) => (
              <Button
                key={`${keyframe.time}-${index}`}
                size="sm"
                className={`w-full justify-between ${
                  selectedKeyframeIndex === index
                    ? "bg-blue-700 hover:bg-blue-700"
                    : ""
                }`}
                onClick={() => onSelectKeyframe(index)}
              >
                <span>#{index + 1}</span>
                <span>{formatTime(keyframe.time)}</span>
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">
            No keyframes found for this track.
          </p>
        )}
      </div>
      <div className="space-y-4">
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
                onChange={(event) => onValueInputChange(index, event.target.value)}
                className={KEYFRAME_VALUE_INPUT_CLASS}
              />
            ))}
          </div>
        </div>
      </div>
      {keyframeError && <p className="text-xs text-red-300">{keyframeError}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button size="sm" className="flex-1" onClick={onApplyKeyframe}>
          {selectedKeyframeIndex === null ? "Add Keyframe" : "Update Keyframe"}
        </Button>
        <Button
          size="sm"
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
      <details className="rounded-md border border-gray-700 bg-gray-800 p-2">
        <summary className="cursor-pointer text-xs text-gray-200">
          Joint Timeline Table
        </summary>
        <div className="mt-3 space-y-3">
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>0:00.00</span>
            <span>{formatTime(timelineDuration)}</span>
          </div>
          <div className="overflow-x-auto">
            <div className={`space-y-2 ${TIMELINE_TABLE_MIN_WIDTH_CLASS}`}>
              {timelineRows.map((row) => {
                const isSelected = row.boneName === selectedBoneName;
                return (
                  <div
                    key={row.boneName}
                    className={`flex items-center gap-3 rounded-md px-2 py-1 ${
                      isSelected ? "bg-blue-900/30" : "bg-gray-900/20"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => onTimelineRowClick(row.boneName)}
                      className="w-40 shrink-0 text-left text-xs text-gray-200 hover:text-white"
                      title={row.boneName}
                    >
                      {formatBoneLabel(row.boneName)}
                    </button>
                    <div className="relative h-6 flex-1 rounded bg-gray-800/60">
                      {row.times.map((time, index) => {
                        const position =
                          timelineDuration > 0
                            ? (time / timelineDuration) * 100
                            : 0;
                        return (
                          <span
                            key={`${row.boneName}-${time}-${index}`}
                            className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-400"
                            style={{
                              left: `${Math.min(
                                100,
                                Math.max(0, position),
                              )}%`,
                            }}
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
        </div>
      </details>
    </div>
  );
}
