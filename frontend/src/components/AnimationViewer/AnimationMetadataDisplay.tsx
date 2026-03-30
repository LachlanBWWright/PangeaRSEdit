/**
 * Animation Metadata Display component
 */

import type { AnimationInfo, AnimationMetadata, TimelineRow } from "./types";
import { formatTime } from "./utils";
interface AnimationMetadataDisplayProps {
  selectedAnimationInfo: AnimationInfo | null;
  selectedMetadata: AnimationMetadata | null;
  timelineRows: TimelineRow[];
  totalKeyframes: number;
}

export function AnimationMetadataDisplay({
  selectedAnimationInfo,
  selectedMetadata,
  timelineRows,
  totalKeyframes,
}: AnimationMetadataDisplayProps) {
  if (!selectedAnimationInfo) {
    return (
      <p className="text-xs text-gray-400">
        Select an animation to view metadata.
      </p>
    );
  }

  if (!selectedMetadata) {
    return (
      <p className="text-xs text-gray-400">
        No game animation metadata available.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2 text-[11px] text-gray-300 sm:grid-cols-3">
        <div className="rounded-md border border-gray-700 bg-gray-900/40 px-2 py-1.5">
          <div className="text-[10px] uppercase tracking-wide text-gray-500">Duration</div>
          <div>{formatTime(selectedAnimationInfo.duration)}</div>
        </div>
        <div className="rounded-md border border-gray-700 bg-gray-900/40 px-2 py-1.5">
          <div className="text-[10px] uppercase tracking-wide text-gray-500">Loop</div>
          <div>{selectedAnimationInfo.loop ? "On" : "Off"}</div>
        </div>
        <div className="rounded-md border border-gray-700 bg-gray-900/40 px-2 py-1.5">
          <div className="text-[10px] uppercase tracking-wide text-gray-500">Bones</div>
          <div>{timelineRows.length}</div>
        </div>
        <div className="rounded-md border border-gray-700 bg-gray-900/40 px-2 py-1.5">
          <div className="text-[10px] uppercase tracking-wide text-gray-500">Tracks</div>
          <div>{selectedAnimationInfo.clip.tracks.length}</div>
        </div>
        <div className="rounded-md border border-gray-700 bg-gray-900/40 px-2 py-1.5">
          <div className="text-[10px] uppercase tracking-wide text-gray-500">Keyframes</div>
          <div>{totalKeyframes}</div>
        </div>
        <div className="rounded-md border border-gray-700 bg-gray-900/40 px-2 py-1.5">
          <div className="text-[10px] uppercase tracking-wide text-gray-500">Events</div>
          <div>{selectedMetadata.eventCount}</div>
        </div>
      </div>
    </div>
  );
}
