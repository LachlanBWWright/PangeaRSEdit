import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { ModelCanvas } from "@/pages/ModelCanvas";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Game } from "@/data/globals/globals";

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

  const resolvedGltfUrl = useMemo(() => {
    if (!gltfUrl) return null;
    try {
      const base = (import.meta.env?.BASE_URL as string | undefined) ?? "/";
      return base + gltfUrl.replace(/^\//, "");
    } catch {
      return null;
    }
  }, [gltfUrl]);

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
              onAnimationsReady={() => { /* no-op in mini view */ }}
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
