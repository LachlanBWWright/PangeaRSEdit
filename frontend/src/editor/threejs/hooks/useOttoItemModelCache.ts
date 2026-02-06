/**
 * Hook for lazy-loading and caching item 3D models
 *
 * Features:
 * - Lazy loads models only for item types present in the current level
 * - Caches converted glTF models in memory for reuse
 * - Uses Web Worker to convert BG3D → glTF off main thread
 * - Extracts specific meshes from multi-geometry BG3D files
 * - Gracefully handles loading errors with fallback behavior
 * - Supports param-dependent models (e.g., Human types)
 * - Supports multiple games (Otto Matic, Bugdom 2, etc.)
 * - Uses requestId to correctly match concurrent worker responses
 * - Caches full BG3D file conversions to avoid redundant work
 */

import { useState, useRef, useCallback } from "react";
import BG3DGltfWorker from "@/modelParsers/bg3dGltfWorker?worker";
import type { BG3DGltfWorkerResponse } from "@/modelParsers/bg3dGltfWorker";
import { getGameMapper } from "@/data/items/mappers";
import { Game } from "@/data/globals/globals";
import { getParamByIndex } from "@/data/items/standardParamTypes";
import { Group } from "three";
import {
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/loaders/GLTFLoader.js";

interface CachedModel {
  gltf: GLTF | null;
  loading: boolean;
  error?: Error;
}

/**
 * Item parameters that can affect model selection
 */
interface ItemParams {
  p0: number;
  p1: number;
  p2: number;
  p3: number;
}

interface UseItemModelCacheReturn {
  modelCache: Map<string, CachedModel>;
  loadModel: (itemType: number, params?: ItemParams) => Promise<GLTF | null>;
  isLoading: (itemType: number, params?: ItemParams) => boolean;
  hasError: (itemType: number, params?: ItemParams) => boolean;
}

/**
 * Map game enum to the base URL path for model files
 */
const GAME_BASE_PATHS: Record<Game, string> = {
  [Game.OTTO_MATIC]: "/PangeaRSEdit/games/ottomatic",
  [Game.BUGDOM]: "/PangeaRSEdit/games/bugdom1",
  [Game.BUGDOM_2]: "/PangeaRSEdit/games/bugdom2",
  [Game.NANOSAUR]: "/PangeaRSEdit/games/nanosaur1",
  [Game.NANOSAUR_2]: "/PangeaRSEdit/games/nanosaur2",
  [Game.CRO_MAG]: "/PangeaRSEdit/games/cromagrally",
  [Game.BILLY_FRONTIER]: "/PangeaRSEdit/games/billyfrontier",
  [Game.MIGHTY_MIKE]: "/PangeaRSEdit/games/mightymike",
};

/**
 * Generate a cache key that includes game, item type, and relevant params
 * Uses the mapper to determine which items are param-dependent
 */
function getCacheKey(game: Game, itemType: number, params?: ItemParams): string {
  const mapper = getGameMapper(game);
  const gamePrefix = `g${game}_`;
  
  if (mapper?.isParamDependent?.(itemType) && params) {
    const config = mapper.getParamDependentConfig?.(itemType);
    if (config) {
      const paramValue = getParamByIndex(params, config.paramIndex);
      return `${gamePrefix}${itemType}_p${config.paramIndex}_${paramValue}`;
    }
    return `${gamePrefix}${itemType}_p1_${params.p1}`;
  }
  return `${gamePrefix}${itemType}`;
}

/** Monotonically increasing counter for generating unique request IDs */
let requestIdCounter = 0;

/**
 * Module-level cache for full BG3D file → GLTF conversions.
 * Keyed by file URL. Multiple items may use the same BG3D file
 * at different model indices.
 */
const fileGltfCache = new Map<string, Promise<GLTF>>();

/**
 * Convert a BG3D file buffer to GLTF via worker, using requestId
 * for correct response matching.
 */
function convertBg3dToGltf(worker: Worker, buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const requestId = `req_${++requestIdCounter}`;
  
  return new Promise<ArrayBuffer>((resolve, reject) => {
    let resolved = false;

    const handleMessage = (e: MessageEvent<BG3DGltfWorkerResponse>) => {
      // Only process responses with matching requestId
      if (e.data.requestId !== requestId) return;

      resolved = true;
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);

      if (e.data.type === "error") {
        reject(new Error(`Worker error: ${e.data.error}`));
      } else if (
        e.data.type === "bg3d-with-skeleton-to-glb" &&
        e.data.result
      ) {
        resolve(e.data.result);
      }
    };

    const handleError = (error: ErrorEvent) => {
      if (!resolved) {
        resolved = true;
        worker.removeEventListener("message", handleMessage);
        worker.removeEventListener("error", handleError);
        reject(
          new Error(`Worker error: ${error.message || "Unknown error"}`),
        );
      }
    };

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);

    worker.postMessage({
      type: "bg3d-with-skeleton-to-glb",
      bg3dBuffer: buffer,
      skeletonData: undefined,
      requestId,
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        worker.removeEventListener("message", handleMessage);
        worker.removeEventListener("error", handleError);
        reject(new Error("Model loading timeout (60s)"));
      }
    }, 60000);
  });
}

/**
 * Load and parse a full BG3D file into a GLTF object.
 * Uses file-level caching so the same BG3D file is only fetched
 * and converted once, even when multiple items reference it.
 */
function loadFileGltf(worker: Worker, fileUrl: string): Promise<GLTF> {
  const cached = fileGltfCache.get(fileUrl);
  if (cached) return cached;

  const promise = (async () => {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText} (${fileUrl})`);
    }
    const buffer = await response.arrayBuffer();

    const glbArrayBuffer = await convertBg3dToGltf(worker, buffer);

    const glbBlob = new Blob([glbArrayBuffer], {
      type: "model/gltf-binary",
    });
    const glbUrl = URL.createObjectURL(glbBlob);
    const loader = new GLTFLoader();

    const gltf = await new Promise<GLTF>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`GLTFLoader timeout for ${fileUrl}`));
      }, 30000);

      loader.load(
        glbUrl,
        (result: GLTF) => {
          clearTimeout(timeoutId);
          resolve(result);
        },
        undefined,
        (error: unknown) => {
          clearTimeout(timeoutId);
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          reject(new Error(`GLTFLoader error: ${errorMessage}`));
        },
      );
    });

    URL.revokeObjectURL(glbUrl);
    return gltf;
  })();

  // Cache the promise so concurrent requests share the same load
  fileGltfCache.set(fileUrl, promise);

  // Remove from cache on failure so it can be retried
  promise.catch(() => {
    fileGltfCache.delete(fileUrl);
  });

  return promise;
}

/**
 * Extract specific model from glTF scene by index.
 *
 * BG3D files have structure:
 * - gltf.scene.children[0] is the groups container
 * - gltf.scene.children[0].children[N] is the model at index N
 *
 * When groupSize > 1, extracts consecutive subgroups and combines them.
 */
function extractSubgroupByIndex(
  gltf: GLTF,
  modelIndex: number,
  groupSize = 1,
): GLTF | null {
  try {
    const groupsContainer =
      gltf.scene.children && gltf.scene.children.length > 0
        ? gltf.scene.children[0]
        : null;

    if (!groupsContainer) {
      console.warn(
        `Could not find groups container. Scene has ${
          gltf.scene.children?.length || 0
        } children`,
      );
      return null;
    }

    if (modelIndex >= groupsContainer.children.length) {
      console.warn(
        `Model index ${modelIndex} out of range (max ${
          groupsContainer.children.length - 1
        })`,
      );
      return null;
    }

    const newScene = new Group();
    const endIndex = Math.min(
      modelIndex + groupSize,
      groupsContainer.children.length,
    );

    for (let i = modelIndex; i < endIndex; i++) {
      const targetModel = groupsContainer.children[i];
      if (targetModel) {
        newScene.add(targetModel.clone(true));
      }
    }

    if (newScene.children.length === 0) {
      return null;
    }

    return { ...gltf, scene: newScene };
  } catch (error) {
    console.error(`Error in extractSubgroupByIndex:`, error);
    return null;
  }
}

/**
 * Hook for managing item model loading and caching
 * @param game - The game to load models for (default: OTTO_MATIC)
 */
export const useItemModelCache = (game: Game = Game.OTTO_MATIC): UseItemModelCacheReturn => {
  const [modelCache, setModelCache] = useState<Map<string, CachedModel>>(
    new Map(),
  );
  const workerRef = useRef<Worker | null>(null);

  // Use a ref to track in-flight requests (avoids stale closure issues)
  const inFlightRef = useRef<Set<string>>(new Set());

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new BG3DGltfWorker();
    }
    return workerRef.current;
  }, []);

  /**
   * Load a 3D model for an item type
   */
  const loadModel = useCallback(
    async (itemType: number, params?: ItemParams): Promise<GLTF | null> => {
      const cacheKey = getCacheKey(game, itemType, params);

      // Check if already loaded or in-flight using the ref
      // (avoids stale closure issues with modelCache state)
      if (inFlightRef.current.has(cacheKey)) {
        return null;
      }

      // Check if already in the cache (using latest state via callback)
      const alreadyCached = modelCache.get(cacheKey);
      if (alreadyCached && !alreadyCached.loading) {
        return alreadyCached.gltf;
      }

      // Get mapping
      const mapper = getGameMapper(game);
      const mapping = mapper?.getMapping(itemType, undefined, params);
      if (!mapping) {
        return null;
      }

      // Mark as in-flight
      inFlightRef.current.add(cacheKey);

      // Mark as loading in state
      setModelCache((prev) => {
        const updated = new Map(prev);
        updated.set(cacheKey, { gltf: null, loading: true });
        return updated;
      });

      try {
        const baseUrl = GAME_BASE_PATHS[game];
        const bg3dUrl = `${baseUrl}/${mapping.modelPath}/${mapping.modelFile}`;

        console.log(
          `[ItemModelCache] Loading model: ${bg3dUrl} (index: ${mapping.modelIndex}, groupSize: ${mapping.groupSize ?? 1})`,
        );

        // Load the full BG3D file (cached at the file level)
        const fullGltf = await loadFileGltf(getWorker(), bg3dUrl);

        // Extract the specific model for this item type
        let finalGltf = fullGltf;
        if (mapping.modelIndex !== undefined) {
          const extracted = extractSubgroupByIndex(
            fullGltf,
            mapping.modelIndex,
            mapping.groupSize ?? 1,
          );
          if (extracted) {
            finalGltf = extracted;
          } else {
            throw new Error(
              `Failed to extract model index ${mapping.modelIndex} from ${mapping.modelFile}`,
            );
          }
        }

        // Cache the result
        setModelCache((prev) => {
          const updated = new Map(prev);
          updated.set(cacheKey, { gltf: finalGltf, loading: false });
          return updated;
        });

        return finalGltf;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error(
          `[ItemModelCache] Error loading model for item type ${itemType}:`,
          err.message,
        );

        setModelCache((prev) => {
          const updated = new Map(prev);
          updated.set(cacheKey, { gltf: null, loading: false, error: err });
          return updated;
        });

        return null;
      } finally {
        inFlightRef.current.delete(cacheKey);
      }
    },
    [game, modelCache, getWorker],
  );

  const isLoading = useCallback(
    (itemType: number, params?: ItemParams) => {
      const cacheKey = getCacheKey(game, itemType, params);
      return modelCache.get(cacheKey)?.loading ?? false;
    },
    [game, modelCache],
  );

  const hasError = useCallback(
    (itemType: number, params?: ItemParams) => {
      const cacheKey = getCacheKey(game, itemType, params);
      return !!modelCache.get(cacheKey)?.error;
    },
    [game, modelCache],
  );

  return { modelCache, loadModel, isLoading, hasError };
};

// Export alias for backward compatibility
export const useOttoItemModelCache = () => useItemModelCache(Game.OTTO_MATIC);
