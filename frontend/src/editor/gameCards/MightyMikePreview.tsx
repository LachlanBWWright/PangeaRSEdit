import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { loadBorderPalette } from "@/editor/loadLogic/mightyMikeParseHelpers";
import {
  getShapeAnimationFrameCycle,
  loadShapeFrame,
} from "@/utils/mightyMikeShapeImageLoader";
import { gMightyMikePalette } from "@/utils/mightyMikePalette";

const FALLBACK_WALK_FRAMES = [0, 1, 2, 3] as const;
const DIRECTIONAL_WALK_ANIMS = [0, 1, 2, 3] as const;
const TICK_MS = 220;

export function MightyMikePreview({ className }: { className?: string }) {
  const [tick, setTick] = useState(0);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [directionalFrameCycles, setDirectionalFrameCycles] = useState<
    Partial<Record<number, readonly number[]>>
  >({});

  const directionAnimIndex =
    DIRECTIONAL_WALK_ANIMS[
      Math.floor(tick / 6) % DIRECTIONAL_WALK_ANIMS.length
    ] ?? DIRECTIONAL_WALK_ANIMS[0];

  const directionalFrames = directionalFrameCycles[directionAnimIndex];
  const activeFrames =
    directionalFrames && directionalFrames.length > 0
      ? directionalFrames
      : FALLBACK_WALK_FRAMES;
  const frameIndex =
    activeFrames[Math.floor(tick / 2) % activeFrames.length] ?? activeFrames[0];

  useEffect(() => {
    let cancelled = false;

    const loadDirectionalFrames = async () => {
      const resolvedEntries = await Promise.all(
        DIRECTIONAL_WALK_ANIMS.map(async (animationIndex) => {
          const cycleResult = await getShapeAnimationFrameCycle(
            "main.shapes",
            0,
            animationIndex,
          );
          if (cycleResult.isErr()) {
            return [animationIndex, FALLBACK_WALK_FRAMES] as const;
          }
          return [animationIndex, cycleResult.value] as const;
        }),
      );

      if (cancelled) {
        return;
      }

      const nextCycles: Partial<Record<number, readonly number[]>> = {};
      for (const [animationIndex, frameCycle] of resolvedEntries) {
        nextCycles[animationIndex] = frameCycle;
      }
      setDirectionalFrameCycles(nextCycles);
    };

    void loadDirectionalFrames();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPreviewFrame = async () => {
      const palette = await loadBorderPalette();
      if (palette) {
        gMightyMikePalette.loadPaletteFromRGBA(palette);
      }

      const frameResult = await loadShapeFrame("main.shapes", 0, frameIndex);
      if (!cancelled && frameResult.isOk()) {
        setFrameUrl(frameResult.value.canvas.toDataURL("image/png"));
      }
    };

    void loadPreviewFrame();

    return () => {
      cancelled = true;
    };
  }, [frameIndex]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTick((current) => current + 1);
    }, TICK_MS);
    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  return (
    <div className={cn("w-full flex items-center justify-center", className)}>
      {frameUrl ? (
        <img
          src={frameUrl}
          alt="Mighty Mike"
          className="h-full max-h-full object-contain pixelated"
        />
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          Preview
        </div>
      )}
    </div>
  );
}
