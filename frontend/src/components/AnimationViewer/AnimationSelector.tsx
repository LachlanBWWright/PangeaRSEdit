/**
 * Animation Selector component for choosing animations
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnimationInfo } from "./types";

interface AnimationSelectorProps {
  selectedAnimation: number | null;
  editableAnimations: AnimationInfo[];
  onSelectionChange: (value: string) => void;
}

export function AnimationSelector({
  selectedAnimation,
  editableAnimations,
  onSelectionChange,
}: AnimationSelectorProps) {
  const selectedAnimationValue =
    selectedAnimation === null ? "none" : String(selectedAnimation);

  return (
    <div className="space-y-2">
      <label className="text-sm text-gray-300">Select Animation</label>
      <Select value={selectedAnimationValue} onValueChange={onSelectionChange}>
        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-gray-700 border-gray-600 text-white">
          <SelectItem value="none" className="text-white focus:bg-gray-600">
            None
          </SelectItem>
          {editableAnimations.map((anim) => (
            <SelectItem
              key={anim.index}
              value={String(anim.index)}
              className="text-white focus:bg-gray-600"
            >
              {anim.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {editableAnimations.length === 0 && (
        <p className="text-xs text-gray-400">No animations available.</p>
      )}
    </div>
  );
}
