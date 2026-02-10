import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Square, RotateCcw } from "lucide-react";
import { AnimationClip, AnimationMixer, LoopRepeat, type AnimationAction } from "three";

export interface AnimationInfo {
  name: string;
  duration: number;
  index: number;
  clip: AnimationClip;
}

interface AnimationViewerProps {
  animations: AnimationInfo[];
  animationMixer: AnimationMixer | null;
  onAnimationChange?: (animationIndex: number | null) => void;
} 

export function AnimationViewer({
  animations,
  animationMixer,
  onAnimationChange,
}: AnimationViewerProps) {
  const normalizeAnimations = useCallback(
    (items: AnimationInfo[]) =>
      items.map((anim, index) => ({
        ...anim,
        index,
      })),
    [],
  );
  const [editableAnimations, setEditableAnimations] = useState<AnimationInfo[]>(
    () => normalizeAnimations(animations),
  );
  const [selectedAnimation, setSelectedAnimation] = useState<number | null>(
    null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasActiveAction, setHasActiveAction] = useState(false); // Track if there's an active action
  const [editName, setEditName] = useState("");
  const [editDuration, setEditDuration] = useState(0);
  const [newAnimationName, setNewAnimationName] = useState("New Animation");
  const [newAnimationDuration, setNewAnimationDuration] = useState(1);
  const animationRequestRef = useRef<number | undefined>(undefined);
  const currentActionRef = useRef<AnimationAction | null>(null);
  const selectedAnimationValue =
    selectedAnimation === null ? "none" : String(selectedAnimation);
  const selectedAnimationInfo = useMemo(
    () =>
      selectedAnimation === null
        ? null
        : editableAnimations[selectedAnimation] ?? null,
    [editableAnimations, selectedAnimation],
  );

  useEffect(() => {
    const normalized = normalizeAnimations(animations);
    Promise.resolve().then(() => {
      setEditableAnimations(normalized);
      setSelectedAnimation(null);
      setEditName("");
      setEditDuration(0);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);
    });
  }, [animations, normalizeAnimations]);

  useEffect(() => {
    if (!selectedAnimationInfo) {
      Promise.resolve().then(() => {
        setEditName("");
        setEditDuration(0);
      });
      return;
    }
    Promise.resolve().then(() => {
      setEditName(selectedAnimationInfo.name);
      setEditDuration(selectedAnimationInfo.duration);
    });
  }, [selectedAnimationInfo]);

  // Update animation state when mixer or selection changes
  useEffect(() => {
    if (
      selectedAnimation !== null &&
      animationMixer &&
      editableAnimations[selectedAnimation]
    ) {
      const animationInfo = editableAnimations[selectedAnimation];
      Promise.resolve().then(() => {
        setDuration(animationInfo.duration);
        setCurrentTime(0);
        setIsPlaying(false);
      });

      // Stop current animation if any
      if (currentActionRef.current) {
        currentActionRef.current.stop();
        currentActionRef.current = null;
        Promise.resolve().then(() => setHasActiveAction(false));
      }

      // Get the animation clip and create action
      const clip = animationInfo.clip;
      if (clip) {
        const action = animationMixer.clipAction(clip);
        action.reset();
        action.setLoop(LoopRepeat, Infinity);
        currentActionRef.current = action;
        Promise.resolve().then(() => setHasActiveAction(true));
      }

      onAnimationChange?.(selectedAnimation);
    } else {
      Promise.resolve().then(() => {
        setDuration(0);
        setCurrentTime(0);
        setIsPlaying(false);
      });
      if (currentActionRef.current) {
        currentActionRef.current.stop();
        currentActionRef.current = null;
      }
      onAnimationChange?.(null);
    }
  }, [selectedAnimation, animationMixer, editableAnimations, onAnimationChange]);

  // Animation loop for updating time
  useEffect(() => {
    const updateTime = () => {
      if (animationMixer && currentActionRef.current && isPlaying) {
        const time = currentActionRef.current.time ?? 0;
        setCurrentTime(time);

        // Loop the animation
        if (time >= duration && duration > 0) {
          currentActionRef.current.time = 0;
          setCurrentTime(0);
        }
      }

      if (isPlaying) {
        animationRequestRef.current = requestAnimationFrame(updateTime);
      }
    };

    if (isPlaying) {
      animationRequestRef.current = requestAnimationFrame(updateTime);
    }

    return () => {
      if (animationRequestRef.current) {
        cancelAnimationFrame(animationRequestRef.current);
      }
    };
  }, [isPlaying, duration, animationMixer]);

  const handlePlay = () => {
    if (currentActionRef.current && animationMixer) {
      if (isPlaying) {
        currentActionRef.current.paused = true;
        setIsPlaying(false);
      } else {
        currentActionRef.current.paused = false;
        currentActionRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleStop = () => {
    if (currentActionRef.current) {
      currentActionRef.current.stop();
      currentActionRef.current.time = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  const handleReset = () => {
    if (currentActionRef.current) {
      currentActionRef.current.time = 0;
      setCurrentTime(0);
    }
  };

  const handleTimeChange = (newTime: number[]) => {
    const time = newTime[0] ?? 0;
    if (currentActionRef.current && animationMixer) {
      currentActionRef.current.time = time;
      setCurrentTime(time);
      // Update the mixer to reflect the time change
      animationMixer.update(0);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, "0")}.${ms
      .toString()
      .padStart(2, "0")}`;
  };

  const handleUpdateAnimation = () => {
    if (selectedAnimation === null) return;
    const current = editableAnimations[selectedAnimation];
    if (!current) return;
    const trimmedName = editName.trim();
    const nextName =
      trimmedName.length > 0 ? trimmedName : `Animation ${selectedAnimation + 1}`;
    const durationValue = Number.isFinite(editDuration) ? editDuration : current.duration;
    const nextDuration = durationValue > 0 ? durationValue : current.duration;
    const clip = current.clip.clone();
    clip.name = nextName;
    clip.duration = nextDuration;
    setEditableAnimations((prev) =>
      normalizeAnimations(
        prev.map((anim, index) =>
          index === selectedAnimation
            ? { ...anim, name: nextName, duration: nextDuration, clip }
            : anim,
        ),
      ),
    );
  };

  const handleCreateAnimation = () => {
    const trimmedName = newAnimationName.trim();
    const nextName =
      trimmedName.length > 0
        ? trimmedName
        : `Animation ${editableAnimations.length + 1}`;
    const durationValue = Number.isFinite(newAnimationDuration)
      ? newAnimationDuration
      : 1;
    const nextDuration = durationValue > 0 ? durationValue : 1;
    const templateClip = selectedAnimationInfo?.clip ?? null;
    const clip = templateClip ? templateClip.clone() : new AnimationClip(nextName, nextDuration, []);
    clip.name = nextName;
    clip.duration = nextDuration;
    const nextIndex = editableAnimations.length;
    const newInfo: AnimationInfo = {
      name: nextName,
      duration: nextDuration,
      index: nextIndex,
      clip,
    };
    setEditableAnimations((prev) => normalizeAnimations([...prev, newInfo]));
    setSelectedAnimation(nextIndex);
  };

  const handleDeleteAnimation = () => {
    if (selectedAnimation === null) return;
    setEditableAnimations((prev) =>
      normalizeAnimations(prev.filter((_, index) => index !== selectedAnimation)),
    );
    setSelectedAnimation((prev) => {
      if (prev === null) return null;
      if (prev === selectedAnimation) return null;
      return prev > selectedAnimation ? prev - 1 : prev;
    });
  };

  const hasAnimations = editableAnimations.length > 0;

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white text-sm">
          Animations ({editableAnimations.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Animation List */}
        <div className="space-y-2">
          <label className="text-xs text-gray-300">Select Animation:</label>
          <Select
            value={selectedAnimationValue}
            onValueChange={(value) => {
              if (value === "none") {
                setSelectedAnimation(null);
                return;
              }
              const nextIndex = Number.parseInt(value, 10);
              setSelectedAnimation(Number.isNaN(nextIndex) ? null : nextIndex);
            }}
          >
            <SelectTrigger className="w-full bg-gray-700 border-gray-600 text-white">
              <SelectValue placeholder="Select animation" />
            </SelectTrigger>
            <SelectContent className="bg-gray-700 border-gray-600">
              <SelectItem value="none" className="text-white focus:bg-gray-600">
                -- Select Animation --
              </SelectItem>
              {editableAnimations.map((anim, index) => (
                <SelectItem
                  key={`${anim.name}-${index}`}
                  value={String(index)}
                  className="text-white focus:bg-gray-600"
                >
                  {anim.name} ({formatTime(anim.duration)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!hasAnimations && (
            <p className="text-xs text-gray-400">
              No animations found in this model.
            </p>
          )}
        </div>

        {/* Animation Controls */}
        {selectedAnimationInfo && (
          <div className="space-y-3">
            {/* Control Buttons */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePlay}
                disabled={!hasActiveAction}
                className="flex-1 text-white"
              >
                {isPlaying ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleStop}
                disabled={!hasActiveAction}
                className="text-white"
              >
                <Square className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                disabled={!hasActiveAction}
                className="text-white"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            </div>

            {/* Time Slider */}
            {duration > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <Slider
                  value={[currentTime]}
                  onValueChange={handleTimeChange}
                  max={duration}
                  min={0}
                  step={0.01}
                  className="w-full"
                />
              </div>
            )}

            {/* Animation Info */}
            <div className="text-xs text-gray-400 space-y-1">
              <div>Name: {selectedAnimationInfo.name}</div>
              <div>Duration: {formatTime(duration)}</div>
              <div>Status: {isPlaying ? "Playing" : "Paused"}</div>
            </div>
          </div>
        )}

        {/* Animation Editor */}
        <div className="space-y-3 border-t border-gray-700 pt-3">
          <div className="text-xs font-semibold text-gray-300">Edit Animation</div>
          {selectedAnimationInfo ? (
            <div className="space-y-2">
              <label className="text-xs text-gray-300">Name</label>
              <Input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
              <label className="text-xs text-gray-300">Duration (seconds)</label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={Number.isFinite(editDuration) ? editDuration : 0}
                onChange={(event) =>
                  setEditDuration(Number.parseFloat(event.target.value))
                }
                className="bg-gray-700 border-gray-600 text-white"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-white"
                  onClick={handleUpdateAnimation}
                >
                  Save Changes
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="text-white"
                  onClick={handleDeleteAnimation}
                >
                  Delete
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Select an animation to edit.</p>
          )}
        </div>

        <div className="space-y-3 border-t border-gray-700 pt-3">
          <div className="text-xs font-semibold text-gray-300">Create Animation</div>
          <div className="space-y-2">
            <label className="text-xs text-gray-300">Name</label>
            <Input
              value={newAnimationName}
              onChange={(event) => setNewAnimationName(event.target.value)}
              className="bg-gray-700 border-gray-600 text-white"
            />
            <label className="text-xs text-gray-300">Duration (seconds)</label>
            <Input
              type="number"
              min={0}
              step={0.1}
              value={Number.isFinite(newAnimationDuration) ? newAnimationDuration : 1}
              onChange={(event) =>
                setNewAnimationDuration(Number.parseFloat(event.target.value))
              }
              className="bg-gray-700 border-gray-600 text-white"
            />
            <Button
              size="sm"
              variant="outline"
              className="w-full text-white"
              onClick={handleCreateAnimation}
            >
              Create Animation
            </Button>
            {selectedAnimationInfo ? (
              <p className="text-xs text-gray-400">
                New animation will copy tracks from "{selectedAnimationInfo.name}"
              </p>
            ) : (
              <p className="text-xs text-gray-400">
                New animation will start empty until edited.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
