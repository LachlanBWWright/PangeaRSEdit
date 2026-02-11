import { useState, useEffect, useRef, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Square, RotateCcw } from "lucide-react";
import {
  AnimationClip,
  AnimationMixer,
  LoopOnce,
  LoopRepeat,
  QuaternionKeyframeTrack,
  VectorKeyframeTrack,
  type AnimationAction,
} from "three";

export interface AnimationInfo {
  name: string;
  duration: number;
  index: number;
  clip: AnimationClip;
  loop?: boolean;
}

export interface AnimationMetadata {
  eventCount: number;
  events: { time: number; type: number; value: number }[];
}

const DEFAULT_ANIMATION_DURATION = 1;
const MIN_ANIMATION_DURATION = 0.016; // ~1 frame at 60fps
const durationErrorMessage = `Invalid duration. Must be at least ${MIN_ANIMATION_DURATION} seconds.`;
const ANIMATION_PANEL_MAX_HEIGHT_CLASS = "max-h-[calc(100vh-12rem)]";
const TIMELINE_MIN_WIDTH_CLASS = "min-w-[320px]";
const BONE_NAME_MAX_WIDTH_CLASS = "max-w-[220px]";
const KEYFRAME_LIST_MAX_HEIGHT_CLASS = "max-h-56";
const METADATA_LIST_MAX_HEIGHT_CLASS = "max-h-32";
const MIN_HEX_BONE_NAME_LENGTH = 6;
const KEYFRAME_INPUT_CLASS = "w-full bg-gray-700 border-gray-600 text-white";
const MIN_PLAYBACK_RATIO = 0.001;

type TrackProperty = "position" | "rotation" | "scale";

const TRACK_PROPERTY_CONFIG: Record<
  TrackProperty,
  { trackName: string; label: string; components: string[] }
> = {
  position: {
    trackName: "position",
    label: "Position",
    components: ["X", "Y", "Z"],
  },
  rotation: {
    trackName: "quaternion",
    label: "Rotation (Quaternion)",
    components: ["X", "Y", "Z", "W"],
  },
  scale: {
    trackName: "scale",
    label: "Scale",
    components: ["X", "Y", "Z"],
  },
};

const parseTrackName = (name: string) => {
  const lastDot = name.lastIndexOf(".");
  if (lastDot === -1) {
    return null;
  }
  return {
    boneName: name.slice(0, lastDot),
    property: name.slice(lastDot + 1),
  };
};

/**
 * Decode hex-encoded bone names (Pascal-style length prefix or null-terminated).
 * Some skeletons store bone names in fixed-width hex strings; this tries the
 * length-prefixed format first, then falls back to null-terminated ASCII.
 */
const decodeHexEncodedBoneName = (value: string) => {
  const normalized = value.replace(/\s+/g, "");
  if (
    normalized.length < MIN_HEX_BONE_NAME_LENGTH ||
    normalized.length % 2 !== 0 ||
    !/^[0-9a-fA-F]+$/.test(normalized)
  ) {
    return null;
  }
  const matches = normalized.match(/.{1,2}/g);
  if (!matches) {
    return null;
  }
  const bytes = matches.map((pair) => Number.parseInt(pair, 16));
  if (bytes.length === 0) {
    return null;
  }
  const firstByte = bytes[0];
  if (
    firstByte !== undefined &&
    firstByte > 0 &&
    1 + firstByte <= bytes.length
  ) {
    const length = firstByte;
    const slice = bytes.slice(1, 1 + length);
    const decoded = slice
      .map((byte) => (byte >= 32 && byte < 127 ? String.fromCharCode(byte) : ""))
      .join("");
    if (decoded.trim().length > 0) {
      return decoded.trim();
    }
  }
  let decoded = "";
  for (const byte of bytes) {
    if (byte === 0) break;
    if (byte >= 32 && byte < 127) {
      decoded += String.fromCharCode(byte);
    }
  }
  return decoded.trim().length > 0 ? decoded.trim() : null;
};

export const formatBoneLabel = (value: string) =>
  decodeHexEncodedBoneName(value) ?? value;

const extractBoneNames = (clip: AnimationClip) => {
  const names = new Set<string>();
  clip.tracks.forEach((track) => {
    const parsed = parseTrackName(track.name);
    if (!parsed) return;
    const hasProperty = Object.values(TRACK_PROPERTY_CONFIG).some(
      (config) => config.trackName === parsed.property,
    );
    if (hasProperty) {
      names.add(parsed.boneName);
    }
  });
  return Array.from(names).sort((a, b) => a.localeCompare(b));
};

const parseDurationInputValue = (value: string, fallback: number) => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed) || parsed < MIN_ANIMATION_DURATION) {
    return { value: fallback, valid: false };
  }
  return { value: parsed, valid: true };
};

const reindexAnimations = (items: AnimationInfo[]) =>
  items.map((anim, index) => ({
    ...anim,
    index,
  }));

interface AnimationViewerProps {
  animations: AnimationInfo[];
  animationMixer: AnimationMixer | null;
  onAnimationChange?: (animationIndex: number | null) => void;
  onBoneSelectionChange?: (boneName: string | null) => void;
  animationMetadata?: Record<string, AnimationMetadata>;
} 

export function AnimationViewer({
  animations,
  animationMixer,
  onAnimationChange,
  onBoneSelectionChange,
  animationMetadata,
}: AnimationViewerProps) {
  const [draftAnimations, setDraftAnimations] = useState<AnimationInfo[] | null>(
    null,
  );
  const [selectedAnimation, setSelectedAnimation] = useState<number | null>(
    null,
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasActiveAction, setHasActiveAction] = useState(false); // Track if there's an active action
  const [editName, setEditName] = useState("");
  const [editDurationInput, setEditDurationInput] = useState("");
  const [newAnimationName, setNewAnimationName] = useState("New Animation");
  const [newAnimationDurationInput, setNewAnimationDurationInput] = useState(
    DEFAULT_ANIMATION_DURATION.toString(),
  );
  const [durationMode, setDurationMode] = useState<"scale" | "truncate">(
    "scale",
  );
  const [durationError, setDurationError] = useState<string | null>(null);
  const [keyframeError, setKeyframeError] = useState<string | null>(null);
  const [selectedBoneName, setSelectedBoneName] = useState("");
  const [selectedTrackProperty, setSelectedTrackProperty] =
    useState<TrackProperty>("position");
  const [selectedKeyframeIndex, setSelectedKeyframeIndex] = useState<
    number | null
  >(null);
  const [keyframeTimeInput, setKeyframeTimeInput] = useState("");
  const [keyframeValueInputs, setKeyframeValueInputs] = useState<string[]>([]);
  const animationRequestRef = useRef<number | undefined>(undefined);
  const currentActionRef = useRef<AnimationAction | null>(null);
  const isPlayingRef = useRef(false);
  const lastSelectionRef = useRef<number | null>(null);
  const autoNameCounterRef = useRef(animations.length + 1);
  const baseAnimations = useMemo(
    () => reindexAnimations(animations),
    [animations],
  );
  const editableAnimations = draftAnimations ?? baseAnimations;

  const setPlayingState = (value: boolean) => {
    isPlayingRef.current = value;
    setIsPlaying(value);
  };

  useEffect(() => {
    autoNameCounterRef.current = animations.length + 1;
  }, [animations.length]);
  const selectedAnimationValue =
    selectedAnimation === null ? "none" : String(selectedAnimation);
  const selectedAnimationInfo = useMemo(
    () =>
      selectedAnimation === null
        ? null
        : editableAnimations[selectedAnimation] ?? null,
    [editableAnimations, selectedAnimation],
  );
  const availableBoneNames = useMemo(() => {
    if (!selectedAnimationInfo) {
      return [];
    }
    return extractBoneNames(selectedAnimationInfo.clip);
  }, [selectedAnimationInfo]);
  const selectedTrackConfig = TRACK_PROPERTY_CONFIG[selectedTrackProperty];
  const selectedTrack = useMemo(() => {
    if (!selectedAnimationInfo || !selectedBoneName) {
      return null;
    }
    return (
      selectedAnimationInfo.clip.tracks.find((track) => {
        const parsed = parseTrackName(track.name);
        if (!parsed) return false;
        return (
          parsed.boneName === selectedBoneName &&
          parsed.property === selectedTrackConfig.trackName
        );
      }) ?? null
    );
  }, [selectedAnimationInfo, selectedBoneName, selectedTrackConfig.trackName]);
  const selectedKeyframes = useMemo(() => {
    if (!selectedTrack) {
      return [];
    }
    const times = Array.from(selectedTrack.times);
    const values = Array.from(selectedTrack.values);
    const stride = selectedTrackConfig.components.length;
    return times.map((time, index) => ({
      time,
      values: values.slice(index * stride, index * stride + stride),
    }));
  }, [selectedTrack, selectedTrackConfig.components.length]);

  const selectedMetadata =
    selectedAnimationInfo && animationMetadata
      ? animationMetadata[selectedAnimationInfo.name]
      : undefined;

  useEffect(() => {
    onBoneSelectionChange?.(selectedBoneName || null);
  }, [selectedBoneName, onBoneSelectionChange]);

  const updateSelectedAnimation = (
    updater: (current: AnimationInfo) => AnimationInfo,
  ) => {
    if (selectedAnimation === null) {
      return;
    }
    setDraftAnimations((prev) => {
      const currentAnimations = prev ?? baseAnimations;
      return reindexAnimations(
        currentAnimations.map((anim, index) =>
          index === selectedAnimation ? updater(anim) : anim,
        ),
      );
    });
  };

  const configureActionLoop = (action: AnimationAction, loop: boolean) => {
    action.setLoop(loop ? LoopRepeat : LoopOnce, loop ? Infinity : 0);
    action.clampWhenFinished = !loop;
  };

  // Update animation state when mixer or selection changes
  useEffect(() => {
    const animationInfo =
      selectedAnimation !== null ? editableAnimations[selectedAnimation] : null;
    if (!animationMixer || !animationInfo) {
      Promise.resolve().then(() => {
        setDuration(0);
        setCurrentTime(0);
        setPlayingState(false);
        setHasActiveAction(false);
      });
      if (currentActionRef.current) {
        currentActionRef.current.stop();
        currentActionRef.current = null;
      }
      lastSelectionRef.current = selectedAnimation;
      onAnimationChange?.(null);
      return;
    }

    const clip = animationInfo.clip;
    const isNewSelection = lastSelectionRef.current !== selectedAnimation;
    const previousAction = currentActionRef.current;
    const previousDuration = previousAction?.getClip().duration ?? clip.duration;
    const previousTime = previousAction?.time ?? 0;
    const previousRatio =
      previousDuration > 0 ? previousTime / previousDuration : 0;
    if (previousAction) {
      previousAction.stop();
    }
    const action = animationMixer.clipAction(clip);
    action.reset();
    configureActionLoop(action, animationInfo.loop ?? true);
    if (!isNewSelection && previousRatio >= MIN_PLAYBACK_RATIO) {
      action.time = Math.min(clip.duration, previousRatio * clip.duration);
    }
    currentActionRef.current = action;
    const shouldPlay = isNewSelection || isPlayingRef.current;
    if (shouldPlay) {
      action.play();
      action.paused = false;
    } else {
      action.play();
      action.paused = true;
    }
    Promise.resolve().then(() => {
      setDuration(clip.duration);
      setCurrentTime(action.time);
      setHasActiveAction(true);
      setPlayingState(shouldPlay);
    });
    lastSelectionRef.current = selectedAnimation;
    onAnimationChange?.(selectedAnimation);
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
      configureActionLoop(
        currentActionRef.current,
        selectedAnimationInfo?.loop ?? true,
      );
      if (isPlayingRef.current) {
        currentActionRef.current.paused = true;
        setPlayingState(false);
      } else {
        currentActionRef.current.paused = false;
        currentActionRef.current.play();
        setPlayingState(true);
      }
    }
  };

  const handleStop = () => {
    if (currentActionRef.current) {
      currentActionRef.current.stop();
      currentActionRef.current.time = 0;
      setCurrentTime(0);
      setPlayingState(false);
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
    const nextLoop = current.loop ?? true;
    const clip = current.clip.clone();
    clip.name = nextName;
    updateSelectedAnimation((anim) => ({
      ...anim,
      name: nextName,
      clip,
      loop: nextLoop,
    }));
    setEditName(nextName);
    setDurationError(null);
  };

  const handleCreateAnimation = () => {
    const trimmedName = newAnimationName.trim();
    const nextAutoIndex = autoNameCounterRef.current;
    const nextName =
      trimmedName.length > 0
        ? trimmedName
        : `Animation ${nextAutoIndex}`;
    const parsedDuration = parseDurationInputValue(
      newAnimationDurationInput,
      DEFAULT_ANIMATION_DURATION,
    );
    if (!parsedDuration.valid) {
      setDurationError(durationErrorMessage);
      return;
    }
    const nextDuration = parsedDuration.value;
    const clip = selectedAnimationInfo?.clip
      ? selectedAnimationInfo.clip.clone()
      : new AnimationClip(nextName, nextDuration, []);
    clip.name = nextName;
    clip.duration = nextDuration;
    const nextIndex = editableAnimations.length;
    const newInfo: AnimationInfo = {
      name: nextName,
      duration: nextDuration,
      index: nextIndex,
      clip,
      loop: true,
    };
    setDraftAnimations((prev) =>
      reindexAnimations([...(prev ?? baseAnimations), newInfo]),
    );
    setSelectedAnimation(nextIndex);
    setEditName(nextName);
    setEditDurationInput(nextDuration.toString());
    setDurationError(null);
    if (trimmedName.length === 0) {
      autoNameCounterRef.current += 1;
    }
  };

  const handleLoopToggle = (nextLoop: boolean) => {
    if (selectedAnimation === null) return;
    updateSelectedAnimation((anim) => ({
      ...anim,
      loop: nextLoop,
    }));
    if (currentActionRef.current) {
      configureActionLoop(currentActionRef.current, nextLoop);
    }
  };

  const handleApplyDuration = () => {
    if (selectedAnimation === null) return;
    const current = editableAnimations[selectedAnimation];
    if (!current) return;
    const parsedDuration = parseDurationInputValue(
      editDurationInput,
      current.duration,
    );
    if (!parsedDuration.valid) {
      setDurationError(durationErrorMessage);
      return;
    }
    const nextDuration = parsedDuration.value;
    const currentDuration = current.duration > 0 ? current.duration : 1;
    const scale = nextDuration / currentDuration;
    const nextTracks = current.clip.tracks.map((track) => {
      const times = Array.from(track.times);
      const values = Array.from(track.values);
      const stride = track.getValueSize();
      let nextTimes: number[] = [];
      let nextValues: number[] = [];
      if (durationMode === "truncate") {
        times.forEach((time, index) => {
          if (time <= nextDuration) {
            nextTimes.push(time);
            nextValues.push(
              ...values.slice(index * stride, index * stride + stride),
            );
          }
        });
          if (nextTimes.length === 0 && times.length > 0) {
            // Preserve the first keyframe so we don't end up with an empty track.
            nextTimes = [0];
            nextValues = values.slice(0, stride);
          }
      } else {
        nextTimes = times.map((time) => time * scale);
        nextValues = values.slice();
      }
      const nextTrack = track.clone();
      nextTrack.times = new Float32Array(nextTimes);
      nextTrack.values = new Float32Array(nextValues);
      return nextTrack;
    });
    const nextClip = new AnimationClip(current.name, nextDuration, nextTracks);
    updateSelectedAnimation((anim) => ({
      ...anim,
      duration: nextDuration,
      clip: nextClip,
    }));
    setDuration(nextDuration);
    setEditDurationInput(nextDuration.toString());
    setDurationError(null);
  };

  const handleSelectKeyframe = (index: number) => {
    const keyframe = selectedKeyframes[index];
    if (!keyframe) return;
    setSelectedKeyframeIndex(index);
    setKeyframeTimeInput(keyframe.time.toString());
    setKeyframeValueInputs(keyframe.values.map((value) => value.toString()));
    setKeyframeError(null);
  };

  const handleApplyKeyframe = () => {
    if (!selectedAnimationInfo || !selectedBoneName) return;
    const timeValue = Number.parseFloat(keyframeTimeInput);
    if (!Number.isFinite(timeValue) || timeValue < 0) {
      setKeyframeError("Enter a valid keyframe time.");
      return;
    }
    const componentCount = selectedTrackConfig.components.length;
    if (keyframeValueInputs.length !== componentCount) {
      setKeyframeError("Enter all component values.");
      return;
    }
    const parsedValues = keyframeValueInputs.map((value) =>
      Number.parseFloat(value),
    );
    if (parsedValues.some((value) => !Number.isFinite(value))) {
      setKeyframeError("Enter valid numeric values.");
      return;
    }
    const trackName = `${selectedBoneName}.${selectedTrackConfig.trackName}`;
    const currentTrack = selectedTrack ?? null;
    const stride = componentCount;
    let times: number[] = [];
    let values: number[] = [];
    if (currentTrack) {
      times = Array.from(currentTrack.times);
      values = Array.from(currentTrack.values);
    }
    if (
      currentTrack &&
      selectedKeyframeIndex !== null &&
      selectedKeyframeIndex < times.length
    ) {
      times[selectedKeyframeIndex] = timeValue;
      parsedValues.forEach((value, offset) => {
        values[selectedKeyframeIndex * stride + offset] = value;
      });
    } else {
      times.push(timeValue);
      values.push(...parsedValues);
    }
    const combined = times.map((time, index) => ({
      time,
      values: values.slice(index * stride, index * stride + stride),
    }));
    combined.sort((a, b) => a.time - b.time);
    const nextTimes = combined.map((entry) => entry.time);
    const nextValues = combined.flatMap((entry) => entry.values);
    const nextTrack = currentTrack
      ? currentTrack.clone()
      : selectedTrackConfig.trackName === "quaternion"
        ? new QuaternionKeyframeTrack(trackName, nextTimes, nextValues)
        : new VectorKeyframeTrack(trackName, nextTimes, nextValues);
    nextTrack.times = new Float32Array(nextTimes);
    nextTrack.values = new Float32Array(nextValues);
    const nextTracks = selectedAnimationInfo.clip.tracks
      .filter((track) => track !== currentTrack)
      .concat(nextTrack);
    const nextClip = new AnimationClip(
      selectedAnimationInfo.name,
      selectedAnimationInfo.duration,
      nextTracks,
    );
    updateSelectedAnimation((anim) => ({
      ...anim,
      clip: nextClip,
    }));
    setKeyframeError(null);
  };

  const handleDeleteKeyframe = () => {
    if (
      !selectedAnimationInfo ||
      !selectedTrack ||
      selectedKeyframeIndex === null
    ) {
      return;
    }
    const stride = selectedTrackConfig.components.length;
    const times = Array.from(selectedTrack.times);
    const values = Array.from(selectedTrack.values);
    const nextTimes: number[] = [];
    const nextValues: number[] = [];
    times.forEach((time, index) => {
      if (index !== selectedKeyframeIndex) {
        nextTimes.push(time);
        nextValues.push(
          ...values.slice(index * stride, index * stride + stride),
        );
      }
    });
    const baseTracks = selectedAnimationInfo.clip.tracks.filter(
      (track) => track !== selectedTrack,
    );
    const nextTracks =
      nextTimes.length === 0
        ? baseTracks
        : [
            ...baseTracks,
            (() => {
              const nextTrack = selectedTrack.clone();
              nextTrack.times = new Float32Array(nextTimes);
              nextTrack.values = new Float32Array(nextValues);
              return nextTrack;
            })(),
          ];
    const nextClip = new AnimationClip(
      selectedAnimationInfo.name,
      selectedAnimationInfo.duration,
      nextTracks,
    );
    updateSelectedAnimation((anim) => ({
      ...anim,
      clip: nextClip,
    }));
    setSelectedKeyframeIndex(null);
    setKeyframeTimeInput("");
    setKeyframeValueInputs([]);
    setKeyframeError(null);
  };

  const handleDeleteAnimation = () => {
    if (selectedAnimation === null) return;
    const deletedIndex = selectedAnimation;
    setDraftAnimations((prev) => {
      const currentAnimations = prev ?? baseAnimations;
      return reindexAnimations(
        currentAnimations.filter((_, index) => index !== deletedIndex),
      );
    });
    setSelectedAnimation((prev) => {
      if (prev === null) return null;
      if (prev === deletedIndex) return null;
      return prev > deletedIndex ? prev - 1 : prev;
    });
    setEditName("");
    setEditDurationInput("");
    setSelectedBoneName("");
    setSelectedKeyframeIndex(null);
    setKeyframeTimeInput("");
    setKeyframeValueInputs([]);
    setKeyframeError(null);
    setDurationError(null);
  };

  const hasAnimations = editableAnimations.length > 0;
  const timelineDuration = selectedAnimationInfo?.duration ?? 0;
  const timelinePlayhead =
    timelineDuration > 0 ? (currentTime / timelineDuration) * 100 : 0;

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white text-sm">
          Animations ({editableAnimations.length})
        </CardTitle>
      </CardHeader>
      <CardContent
        className={`space-y-4 ${ANIMATION_PANEL_MAX_HEIGHT_CLASS} overflow-y-auto pr-1`}
      >
        {/* Animation List */}
        <div className="space-y-2">
          <label className="text-xs text-gray-300">Select Animation:</label>
          <Select
            value={selectedAnimationValue}
            onValueChange={(value) => {
              if (value === "none") {
                setSelectedAnimation(null);
                setEditName("");
                setEditDurationInput("");
                setSelectedBoneName("");
                setSelectedTrackProperty("position");
                setSelectedKeyframeIndex(null);
                setKeyframeTimeInput("");
                setKeyframeValueInputs([]);
                setKeyframeError(null);
                setDurationError(null);
                return;
              }
              const nextIndex = Number.parseInt(value, 10);
              const resolvedIndex = Number.isNaN(nextIndex)
                ? null
                : nextIndex;
              setSelectedAnimation(resolvedIndex);
              const resolvedAnimation =
                resolvedIndex !== null
                  ? editableAnimations[resolvedIndex]
                  : null;
              if (resolvedAnimation) {
                setEditName(resolvedAnimation.name);
                setEditDurationInput(resolvedAnimation.duration.toString());
                const nextBoneName =
                  extractBoneNames(resolvedAnimation.clip)[0] ?? "";
                setSelectedBoneName(nextBoneName);
                setSelectedTrackProperty("position");
                setSelectedKeyframeIndex(null);
                setKeyframeTimeInput("");
                setKeyframeValueInputs([]);
                setKeyframeError(null);
                setDurationError(null);
              }
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
                onClick={handlePlay}
                disabled={!hasActiveAction}
                className="flex-1"
              >
                {isPlaying ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
              </Button>
              <Button
                size="sm"
                onClick={handleStop}
                disabled={!hasActiveAction}
                className="text-white"
              >
                <Square className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
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
            <div className="space-y-3">
              <label className="text-xs text-gray-300">Name</label>
              <Input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
              <div className="flex items-center justify-between rounded-md border border-gray-600 bg-gray-700 px-3 py-2">
                <span className="text-xs text-gray-200">Loop animation</span>
                <Switch
                  checked={selectedAnimationInfo.loop ?? true}
                  onCheckedChange={handleLoopToggle}
                />
              </div>
              <label className="text-xs text-gray-300">Duration (seconds)</label>
              <Input
                type="text"
                inputMode="decimal"
                value={editDurationInput}
                onChange={(event) => setEditDurationInput(event.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-2">
                  <label className="text-xs text-gray-300">Retiming mode</label>
                  <Select
                    value={durationMode}
                    onValueChange={(value) =>
                      setDurationMode(value === "truncate" ? "truncate" : "scale")
                    }
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 text-white">
                      <SelectItem value="scale" className="text-white focus:bg-gray-600">
                        Scale (speed up/slow down)
                      </SelectItem>
                      <SelectItem value="truncate" className="text-white focus:bg-gray-600">
                        Truncate extra frames
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={handleApplyDuration} className="text-white">
                  Apply Duration
                </Button>
              </div>
              {durationError && (
                <p className="text-xs text-red-300">{durationError}</p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button size="sm" className="flex-1" onClick={handleUpdateAnimation}>
                  Save Changes
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    const name = selectedAnimationInfo?.name;
                    const message = name
                      ? `Delete animation "${name}"?`
                      : "Delete this animation?";
                    if (window.confirm(message)) {
                      handleDeleteAnimation();
                    }
                  }}
                >
                  Delete Animation
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Select an animation to edit.</p>
          )}
        </div>

        <div className="space-y-3 border-t border-gray-700 pt-3">
          <div className="text-xs font-semibold text-gray-300">Keyframe Editor</div>
          {selectedAnimationInfo ? (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs text-gray-300">Bone</label>
                  <Select
                    value={selectedBoneName || "none"}
                    onValueChange={(value) => {
                      const nextBone = value === "none" ? "" : value;
                      setSelectedBoneName(nextBone);
                      setSelectedKeyframeIndex(null);
                      setKeyframeTimeInput("");
                      setKeyframeValueInputs(
                        Array(selectedTrackConfig.components.length).fill(""),
                      );
                      setKeyframeError(null);
                    }}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select bone" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600 text-white">
                      <SelectItem value="none" className="text-white focus:bg-gray-600">
                        -- Select Bone --
                      </SelectItem>
                      {availableBoneNames.map((bone) => (
                        <SelectItem
                          key={bone}
                          value={bone}
                          className="text-white focus:bg-gray-600"
                        >
                          <span
                            className={`block ${BONE_NAME_MAX_WIDTH_CLASS} truncate`}
                            title={bone}
                          >
                            {formatBoneLabel(bone)}
                          </span>
                        </SelectItem>
                      ))}
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
                      setSelectedTrackProperty(nextProperty);
                      setSelectedKeyframeIndex(null);
                      setKeyframeTimeInput("");
                      setKeyframeValueInputs(
                        Array(TRACK_PROPERTY_CONFIG[nextProperty].components.length).fill(""),
                      );
                      setKeyframeError(null);
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
                          onClick={() => handleSelectKeyframe(index)}
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
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedKeyframeIndex(null);
                      setKeyframeTimeInput("");
                      setKeyframeValueInputs(
                        Array(selectedTrackConfig.components.length).fill(""),
                      );
                      setKeyframeError(null);
                    }}
                  >
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
                        onClick={() => handleSelectKeyframe(index)}
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
              <div className="grid gap-2 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs text-gray-300">Time (seconds)</label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={keyframeTimeInput}
                    onChange={(event) => setKeyframeTimeInput(event.target.value)}
                    className={KEYFRAME_INPUT_CLASS}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-gray-300">Values</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {selectedTrackConfig.components.map((label, index) => (
                      <Input
                        key={label}
                        type="text"
                        inputMode="decimal"
                        placeholder={label}
                        value={keyframeValueInputs[index] ?? ""}
                        onChange={(event) => {
                          setKeyframeValueInputs((prev) => {
                            const next = [...prev];
                            next[index] = event.target.value;
                            return next;
                          });
                        }}
                        className={KEYFRAME_INPUT_CLASS}
                      />
                    ))}
                  </div>
                </div>
              </div>
              {keyframeError && (
                <p className="text-xs text-red-300">{keyframeError}</p>
              )}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button size="sm" className="flex-1" onClick={handleApplyKeyframe}>
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
                      handleDeleteKeyframe();
                    }
                  }}
                  disabled={selectedKeyframeIndex === null}
                >
                  Delete Keyframe
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Select an animation to edit keyframes.</p>
          )}
        </div>

        <div className="space-y-3 border-t border-gray-700 pt-3">
          <div className="text-xs font-semibold text-gray-300">Animation Metadata</div>
          {selectedAnimationInfo ? (
            selectedMetadata ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-400">
                  Event count: {selectedMetadata.eventCount}
                </p>
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
            ) : (
              <p className="text-xs text-gray-400">
                No game animation metadata available.
              </p>
            )
          ) : (
            <p className="text-xs text-gray-400">Select an animation to view metadata.</p>
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
              type="text"
              inputMode="decimal"
              value={newAnimationDurationInput}
              onChange={(event) =>
                setNewAnimationDurationInput(event.target.value)
              }
              className="bg-gray-700 border-gray-600 text-white"
            />
            <Button
              size="sm"
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
                New animation will be empty until edited.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
