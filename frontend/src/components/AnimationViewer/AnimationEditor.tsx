/**
 * Animation Editor component for editing animation properties
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
import type { AnimationInfo } from "./types";
import type { LoopMode } from "./hooks";

interface AnimationEditorProps {
  selectedAnimationInfo: AnimationInfo | null;
  editName: string;
  editDurationInput: string;
  durationMode: "scale" | "truncate";
  durationError: string | null;
  onNameChange: (name: string) => void;
  onDurationInputChange: (duration: string) => void;
  onLoopModeChange: (mode: LoopMode) => void;
  onDurationModeChange: (mode: "scale" | "truncate") => void;
  onApplyChanges: () => void;
  onDeleteAnimation: () => void;
}

export function AnimationEditor({
  selectedAnimationInfo,
  editName,
  editDurationInput,
  durationMode,
  durationError,
  onNameChange,
  onDurationInputChange,
  onLoopModeChange,
  onDurationModeChange,
  onApplyChanges,
  onDeleteAnimation,
}: AnimationEditorProps) {
  if (!selectedAnimationInfo) {
    return (
      <p className="text-xs text-gray-400">
        Select an animation to edit its properties.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <label className="text-xs text-gray-300">Name</label>
        <Input
          value={editName}
          onChange={(event) => onNameChange(event.target.value)}
          className="bg-gray-700 border-gray-600 text-white"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs text-gray-300">Duration (seconds)</label>
        <Input
          type="text"
          inputMode="decimal"
          value={editDurationInput}
          onChange={(event) => onDurationInputChange(event.target.value)}
          className="bg-gray-700 border-gray-600 text-white"
        />
        {durationError && (
          <p className="text-xs text-red-300">{durationError}</p>
        )}
      </div>
      <div className="space-y-2">
        <label className="text-xs text-gray-300">Playback Mode</label>
        {(() => {
          const effectiveMode: LoopMode = selectedAnimationInfo.loopMode ?? (selectedAnimationInfo.loop ? "loop" : "once");
          return (
            <>
              <Select
                value={effectiveMode}
                onValueChange={(value) => onLoopModeChange(value as LoopMode)}
              >
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600 text-white">
                  <SelectItem value="loop" className="text-white focus:bg-gray-600">
                    Loop
                  </SelectItem>
                  <SelectItem value="pingpong" className="text-white focus:bg-gray-600">
                    Zigzag (Ping-Pong)
                  </SelectItem>
                  <SelectItem value="once" className="text-white focus:bg-gray-600">
                    Play Once
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">
                {effectiveMode === "loop"
                  ? "Animation repeats from start when finished."
                  : effectiveMode === "pingpong"
                    ? "Animation plays forward then backward (zigzag)."
                    : "Animation plays once and stops at the end."}
              </p>
            </>
          );
        })()}
      </div>
      <div className="space-y-2">
        <label className="text-xs text-gray-300">Duration Change Mode</label>
        <Select value={durationMode} onValueChange={onDurationModeChange}>
          <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600 text-white">
            <SelectItem value="scale" className="text-white focus:bg-gray-600">
              Scale Keyframes
            </SelectItem>
            <SelectItem
              value="truncate"
              className="text-white focus:bg-gray-600"
            >
              Truncate Keyframes
            </SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-gray-400">
          {durationMode === "scale"
            ? "Keyframes will be scaled proportionally to the new duration."
            : "Keyframes beyond the new duration will be removed."}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="sm"
          className="flex-1"
          onClick={onApplyChanges}
          disabled={
            editName === selectedAnimationInfo.name &&
            editDurationInput === String(selectedAnimationInfo.duration)
          }
        >
          Apply Changes
        </Button>
        <Button
          size="sm"
          variant="destructive"
          className="flex-1"
          onClick={() => {
            if (
              window.confirm(
                `Delete animation "${selectedAnimationInfo.name}"?`,
              )
            ) {
              onDeleteAnimation();
            }
          }}
        >
          Delete Animation
        </Button>
      </div>
    </div>
  );
}
