/**
 * Animation Controls component for playback controls
 */

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Square, RotateCcw } from "lucide-react";
import { formatTime } from "./utils";

interface AnimationControlsProps {
  hasActiveAction: boolean;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onReset: () => void;
  onSeek: (time: number) => void;
}

export function AnimationControls({
  hasActiveAction,
  isPlaying,
  currentTime,
  duration,
  onPlay,
  onPause,
  onStop,
  onReset,
  onSeek,
}: AnimationControlsProps) {
  return (
    <div className="space-y-3">
      <div className="flex justify-center gap-2">
        <Button
          size="sm"
          onClick={onPlay}
          disabled={!hasActiveAction || isPlaying}
        >
          <Play className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          onClick={onPause}
          disabled={!hasActiveAction || !isPlaying}
        >
          <Pause className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={onStop} disabled={!hasActiveAction}>
          <Square className="h-4 w-4" />
        </Button>
        <Button size="sm" onClick={onReset} disabled={!hasActiveAction}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-400">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
        <Slider
          value={[currentTime]}
          onValueChange={(values) => onSeek(values[0] ?? 0)}
          max={duration}
          step={0.001}
          disabled={!hasActiveAction}
        />
      </div>
    </div>
  );
}
