/**
 * Animation Creator dialog for creating new animations
 */

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnimationInfo } from "./types";

interface AnimationCreatorProps {
  editableAnimations: AnimationInfo[];
  newAnimationName: string;
  newAnimationDurationInput: string;
  onNameChange: (name: string) => void;
  onDurationChange: (duration: string) => void;
  onCreate: (sourceAnimationIndex: number | null) => void;
}

export function AnimationCreator({
  editableAnimations,
  newAnimationName,
  newAnimationDurationInput,
  onNameChange,
  onDurationChange,
  onCreate,
}: AnimationCreatorProps) {
  const [open, setOpen] = useState(false);
  const [sourceAnimation, setSourceAnimation] = useState<string>("none");

  const sourceOptions = useMemo(
    () => editableAnimations.map((anim) => ({ id: String(anim.index), name: anim.name })),
    [editableAnimations],
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      setSourceAnimation("none");
    }
  };

  const handleCreate = () => {
    const parsedSourceIndex =
      sourceAnimation === "none"
        ? null
        : Number.parseInt(sourceAnimation, 10);
    onCreate(Number.isNaN(parsedSourceIndex) ? null : parsedSourceIndex);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary" className="w-full">
          Create Animation
        </Button>
      </DialogTrigger>
      <DialogContent className="border-gray-700 bg-gray-900 text-white sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-left">Create Animation</DialogTitle>
          <DialogDescription className="text-left text-gray-400">
            Name the animation and optionally copy tracks from an existing one.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-xs text-gray-300">Name</label>
            <Input
              value={newAnimationName}
              onChange={(event) => onNameChange(event.target.value)}
              className="border-gray-600 bg-gray-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-gray-300">Duration (seconds)</label>
            <Input
              type="text"
              inputMode="decimal"
              value={newAnimationDurationInput}
              onChange={(event) => onDurationChange(event.target.value)}
              className="border-gray-600 bg-gray-700 text-white"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-gray-300">Copy tracks from</label>
            <Select value={sourceAnimation} onValueChange={setSourceAnimation}>
              <SelectTrigger className="border-gray-600 bg-gray-700 text-white">
                <SelectValue placeholder="No source" />
              </SelectTrigger>
              <SelectContent className="border-gray-600 bg-gray-700 text-white">
                <SelectItem value="none" className="text-white focus:bg-gray-600">
                  None
                </SelectItem>
                {sourceOptions.map((option) => (
                  <SelectItem
                    key={option.id}
                    value={option.id}
                    className="text-white focus:bg-gray-600"
                  >
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button type="button" onClick={handleCreate}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
