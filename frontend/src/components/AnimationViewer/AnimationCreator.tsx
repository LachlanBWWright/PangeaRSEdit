/**
 * Animation Creator component for creating new animations
 */

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface AnimationCreatorProps {
  newAnimationName: string;
  newAnimationDurationInput: string;
  onNameChange: (name: string) => void;
  onDurationChange: (duration: string) => void;
  onCreateWithTracks: () => void;
  onCreateEmpty: () => void;
}

export function AnimationCreator({
  newAnimationName,
  newAnimationDurationInput,
  onNameChange,
  onDurationChange,
  onCreateWithTracks,
  onCreateEmpty,
}: AnimationCreatorProps) {
  return (
    <div className="space-y-2">
      <label className="text-xs text-gray-300">Name</label>
      <Input
        value={newAnimationName}
        onChange={(event) => onNameChange(event.target.value)}
        className="bg-gray-700 border-gray-600 text-white"
      />
      <label className="text-xs text-gray-300">Duration (seconds)</label>
      <Input
        type="text"
        inputMode="decimal"
        value={newAnimationDurationInput}
        onChange={(event) => onDurationChange(event.target.value)}
        className="bg-gray-700 border-gray-600 text-white"
      />
      <div className="space-y-2">
        <Button
          size="sm"
          className="w-full text-white"
          onClick={onCreateWithTracks}
        >
          Create Animation (Copy Tracks)
        </Button>
        <Button
          size="sm"
          variant="secondary"
          className="w-full"
          onClick={onCreateEmpty}
        >
          Create Empty Animation
        </Button>
      </div>
      <p className="text-xs text-gray-400">
        Create a new animation from the current model or start with empty
        tracks.
      </p>
    </div>
  );
}
