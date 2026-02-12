import { Suspense, useMemo, useRef, useState, useEffect, useCallback } from "react";
import { ModelCanvas } from "@/pages/ModelCanvas";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Game } from "@/data/globals/globals";
import type { AnimationAction, AnimationMixer } from "three";
import type { AnimationInfo } from "@/components/AnimationViewer";

const getDefaultAnimationName = (gameType: Game): string | null => {
  switch (gameType) {
    case Game.OTTO_MATIC:
      return "Walk";
    case Game.BUGDOM:
      return "Walk";
    case Game.BUGDOM_2:
      return "Personality 2";
    case Game.NANOSAUR:
      return "Run";
    case Game.NANOSAUR_2:
      return "FlapWings";
    case Game.BILLY_FRONTIER:
      return "Draw&Shoot4";
    case Game.CRO_MAG:
      return "Sit";
    default:
      return null;
  }
};

export function MiniThreeView({
  gltfUrl,
  gameType,
}: {
  gltfUrl?: string;
  gameType: Game;
}) {
  // Prevent unnecessary reinitialization
  useMemo(() => ({ position: [0, 0, 50] as const }), []);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);
  const actionRef = useRef<AnimationAction | null>(null);

  const resolvedGltfUrl = useMemo(() => {
    if (!gltfUrl) return null;
    const base = (import.meta.env?.BASE_URL as string | undefined) ?? "/";
    return base + gltfUrl.replace(/^\//, "");
  }, [gltfUrl]);

  const defaultAnimationName = useMemo(
    () => getDefaultAnimationName(gameType),
    [gameType],
  );

  const handleAnimationsReady = useCallback(
    (animationInfos: AnimationInfo[], mixer: AnimationMixer | null) => {
      actionRef.current?.stop();
      if (!mixer || animationInfos.length === 0) {
        actionRef.current = null;
        return;
      }
      const target =
        (defaultAnimationName
          ? animationInfos.find(
              (anim) =>
                anim.name.toLowerCase() ===
                defaultAnimationName.toLowerCase(),
            )
          : undefined) ?? animationInfos[0];
      // Use case-insensitive match to handle capitalization differences in assets.
      if (!target) {
        return;
      }
      const action = mixer.clipAction(target.clip);
      action.reset();
      action.play();
      actionRef.current = action;
    },
    [defaultAnimationName],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let mountedTimeout: number | null = null;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting) {
          // Delay mount slightly to avoid rapid mount/unmount during scrolling
          mountedTimeout = window.setTimeout(() => setMounted(true), 150);
        } else {
          if (mountedTimeout) {
            clearTimeout(mountedTimeout);
            mountedTimeout = null;
          }
          // Don't unmount immediately to avoid thrash; keep model mounted once visible
        }
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (mountedTimeout) clearTimeout(mountedTimeout);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-100 h-70 bg-transparent rounded-md overflow-hidden"
    >
      <ErrorBoundary>
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-full text-gray-500">
              Loading...
            </div>
          }
        >
          {mounted && resolvedGltfUrl ? (
              <ModelCanvas
                gltfUrl={resolvedGltfUrl}
                setModelNodes={() => { /* no-op in mini view */ }}
                onSceneReady={() => { /* no-op in mini view */ }}
                onAnimationsReady={handleAnimationsReady}
                wireframeMode={false}
                showSkeleton={false}
                logBonePositions={false}
                gameType={gameType}
              />
          ) : mounted ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              No Model
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              Preview
            </div>
          )}
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
