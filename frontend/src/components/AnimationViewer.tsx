import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Square, RotateCcw } from "lucide-react";
import * as THREE from "three";

export interface AnimationInfo {
  name: string;
  duration: number;
  index: number;
  clip: THREE.AnimationClip;
}

interface AnimationViewerProps {
  animations: AnimationInfo[];
  animationMixer: THREE.AnimationMixer | null;
  onAnimationChange?: (animationIndex: number | null) => void;
}

export function AnimationViewer({ 
  animations, 
  animationMixer,
  onAnimationChange 
}: AnimationViewerProps) {
  const [selectedAnimation, setSelectedAnimation] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const animationRequestRef = useRef<number>();
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);

  // Update animation state when mixer or selection changes
  useEffect(() => {
    if (selectedAnimation !== null && animationMixer && animations[selectedAnimation]) {
      const animationInfo = animations[selectedAnimation];
      setDuration(animationInfo.duration);
      setCurrentTime(0);
      setIsPlaying(false);
      
      // Stop current animation if any
      if (currentActionRef.current) {
        currentActionRef.current.stop();
        currentActionRef.current = null;
      }
      
      // Get the animation clip and create action
      const clip = animationInfo.clip;
      if (clip) {
        const action = animationMixer.clipAction(clip);
        action.reset();
        action.setLoop(THREE.LoopRepeat, Infinity);
        currentActionRef.current = action;
      }
      
      onAnimationChange?.(selectedAnimation);
    } else {
      setDuration(0);
      setCurrentTime(0);
      setIsPlaying(false);
      if (currentActionRef.current) {
        currentActionRef.current.stop();
        currentActionRef.current = null;
      }
      onAnimationChange?.(null);
    }
  }, [selectedAnimation, animationMixer, animations, onAnimationChange]);

  // Animation loop for updating time
  useEffect(() => {
    const updateTime = () => {
      if (animationMixer && currentActionRef.current && isPlaying) {
        const time = currentActionRef.current.time;
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
    const time = newTime[0];
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
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  if (animations.length === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-sm">Animations</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-400">No animations found in this model</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white text-sm">
          Animations ({animations.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Animation List */}
        <div className="space-y-2">
          <label className="text-xs text-gray-300">Select Animation:</label>
          <select
            className="w-full bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 text-sm"
            value={selectedAnimation ?? ""}
            onChange={(e) => setSelectedAnimation(e.target.value ? parseInt(e.target.value) : null)}
          >
            <option value="">-- Select Animation --</option>
            {animations.map((anim, index) => (
              <option key={index} value={index}>
                {anim.name} ({formatTime(anim.duration)})
              </option>
            ))}
          </select>
        </div>

        {/* Animation Controls */}
        {selectedAnimation !== null && (
          <div className="space-y-3">
            {/* Control Buttons */}
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePlay}
                disabled={!currentActionRef.current}
                className="flex-1 text-white"
              >
                {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleStop}
                disabled={!currentActionRef.current}
                className="text-white"
              >
                <Square className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleReset}
                disabled={!currentActionRef.current}
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
              <div>Name: {animations[selectedAnimation].name}</div>
              <div>Duration: {formatTime(duration)}</div>
              <div>Status: {isPlaying ? "Playing" : "Paused"}</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}