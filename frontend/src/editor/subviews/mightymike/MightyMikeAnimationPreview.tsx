import { useEffect, useState } from "react";
import { TileCanvas } from "@/editor/subviews/shared/TileCanvas";

export function MightyMikeAnimationPreview({
  frames,
  speed,
  images,
  imageIndexes,
}: {
  readonly frames: readonly number[];
  readonly speed: number;
  readonly images: readonly HTMLCanvasElement[];
  readonly imageIndexes: readonly number[];
}) {
  const [frameIndex, setFrameIndex] = useState(0);
  const delayFrames = speed <= 0 ? null : Math.ceil(257 / speed);

  useEffect(() => {
    if (frames.length < 2 || speed <= 0) return;
    const framesPerStep = Math.ceil(257 / speed);
    const interval = window.setInterval(
      () => setFrameIndex((current) => (current + 1) % frames.length),
      Math.max(16, (framesPerStep * 1000) / 60),
    );
    return () => window.clearInterval(interval);
  }, [frames, speed]);

  const visibleFrameIndex = frames.length === 0 ? 0 : frameIndex % frames.length;
  const tileIndex = frames[visibleFrameIndex];
  const imageIndex = tileIndex === undefined ? undefined : imageIndexes[tileIndex];
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="bg-[repeating-conic-gradient(#444_0_25%,#222_0_50%)] bg-[length:16px_16px] p-2">
        <TileCanvas image={imageIndex === undefined ? undefined : images[imageIndex]} size={96} />
      </div>
      <span className="text-xs text-gray-400">
        {tileIndex === undefined ? "No frames" : `Frame ${visibleFrameIndex + 1} · Tile ${tileIndex}`}
      </span>
      {delayFrames === null && (
        <span className="text-xs text-amber-400">Paused: speed is 0</span>
      )}
    </div>
  );
}
