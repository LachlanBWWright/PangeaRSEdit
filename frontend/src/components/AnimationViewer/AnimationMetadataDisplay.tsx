/**
 * Animation Metadata Display component
 */

import type { AnimationInfo, AnimationMetadata, TimelineRow } from "./types";
import { formatTime } from "./utils";
import { METADATA_LIST_MAX_HEIGHT_CLASS } from "./constants";

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
      <div className="space-y-1 text-xs text-gray-400">
        <p>Duration: {formatTime(selectedAnimationInfo.duration)}</p>
        <p>Looping: {selectedAnimationInfo.loop ? "On" : "Off"}</p>
        <p>Bones: {timelineRows.length}</p>
        <p>Tracks: {selectedAnimationInfo.clip.tracks.length}</p>
        <p>Keyframes: {totalKeyframes}</p>
        <p>Event count: {selectedMetadata.eventCount}</p>
      </div>
      {selectedMetadata.events.length > 0 ? (
        <div
          className={`${METADATA_LIST_MAX_HEIGHT_CLASS} overflow-y-auto rounded-md border border-gray-700`}
        >
          <div className="grid grid-cols-3 gap-2 px-2 py-1 text-[10px] text-gray-400">
            <span>Time</span>
            <span>Type</span>
            <span>Value</span>
          </div>
          {selectedMetadata.events.map((event, index) => (
            <div
              key={`${event.time}-${index}`}
              className="grid grid-cols-3 gap-2 px-2 py-1 text-xs text-gray-200 border-t border-gray-800"
            >
              <span>{formatTime(event.time)}</span>
              <span>{event.type}</span>
              <span>{event.value}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400">No animation events found.</p>
      )}
    </div>
  );
}
