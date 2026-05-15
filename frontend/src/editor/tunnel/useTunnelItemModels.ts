import { useEffect, useMemo, useRef, useState } from "react";
import { ResultAsync, errAsync, okAsync } from "neverthrow";
import { Group } from "three";
import BG3DGltfWorker from "@/modelParsers/bg3dGltfWorker?worker";
import {
  cloneGroupForItemRendering,
  extractSubgroupByIndex,
  loadFileGltf,
} from "@/editor/threejs/hooks/itemModelLoaderUtils";
import { mapErr } from "@/utils/mapErr";
import type { TunnelData } from "@/data/tunnelParser/types";

interface TunnelItemModelCacheEntry {
  readonly state: "loading" | "ready" | "error";
  readonly scene: Group | null;
  readonly error: string | null;
}

function getModelFilePath(isPlumbing: boolean): string {
  return isPlumbing
    ? "/PangeaRSEdit/games/bugdom2/models/Level4_Plumbing.bg3d"
    : "/PangeaRSEdit/games/bugdom2/models/Level7_Gutter.bg3d";
}

export function useTunnelItemModels(
  tunnelData: TunnelData,
  isPlumbing: boolean,
): {
  readonly getSceneForType: (itemType: number) => Group | null;
  readonly isLoadingType: (itemType: number) => boolean;
} {
  const [cache, setCache] = useState<Map<number, TunnelItemModelCacheEntry>>(
    new Map(),
  );
  const workerRef = useRef<Worker | null>(null);

  const modelFilePath = useMemo(
    () => getModelFilePath(isPlumbing),
    [isPlumbing],
  );

  const uniqueItemTypes = useMemo(() => {
    const unique = new Set<number>();
    for (const item of tunnelData.items) {
      unique.add(item.type);
    }
    return Array.from(unique.values());
  }, [tunnelData.items]);

  useEffect(() => {
    if (workerRef.current === null) {
      workerRef.current = new BG3DGltfWorker();
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const worker = workerRef.current;
    if (worker === null) {
      return;
    }

    for (const itemType of uniqueItemTypes) {
      const existing = cache.get(itemType);
      if (
        existing &&
        (existing.state === "loading" || existing.state === "ready")
      ) {
        continue;
      }

      setCache((previous) => {
        const next = new Map(previous);
        next.set(itemType, {
          state: "loading",
          scene: null,
          error: null,
        });
        return next;
      });

      void ResultAsync.fromPromise(loadFileGltf(worker, modelFilePath), mapErr)
        .andThen((gltf) => {
          const extracted = extractSubgroupByIndex(gltf, itemType, 1);
          if (extracted === null) {
            return errAsync(
              `Model index ${String(itemType)} not found in ${modelFilePath}`,
            );
          }

          return okAsync(cloneGroupForItemRendering(extracted));
        })
        .match(
          (scene) => {
            setCache((previous) => {
              const next = new Map(previous);
              next.set(itemType, {
                state: "ready",
                scene,
                error: null,
              });
              return next;
            });
          },
          (error) => {
            setCache((previous) => {
              const next = new Map(previous);
              next.set(itemType, {
                state: "error",
                scene: null,
                error,
              });
              return next;
            });
          },
        );
    }
  }, [cache, modelFilePath, uniqueItemTypes]);

  const getSceneForType = (itemType: number): Group | null => {
    const entry = cache.get(itemType);
    if (!entry || entry.state !== "ready") {
      return null;
    }
    return entry.scene;
  };

  const isLoadingType = (itemType: number): boolean => {
    const entry = cache.get(itemType);
    return entry?.state === "loading";
  };

  return {
    getSceneForType,
    isLoadingType,
  };
}
