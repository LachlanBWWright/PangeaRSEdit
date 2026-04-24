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

import { mapErr } from "@/utils/mapErr";
import { useState, useRef, useCallback, useEffect } from "react";
import BG3DGltfWorker from "@/modelParsers/bg3dGltfWorker?worker";
import { ResultAsync } from "neverthrow";
import { getGameMapper } from "@/data/items/mappers";
import { Game } from "@/data/globals/globals";
import { getParamByIndex } from "@/data/items/standardParamTypes";
import { type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { extractSubgroupByIndex, loadFileGltf } from "./itemModelLoaderUtils";

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
  loadModel: (
    itemType: number,
    params?: ItemParams,
    levelNum?: number,
  ) => Promise<GLTF | null>;
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
 * Uses the mapper to determine which items are param-dependent or level-dependent
 */
function getCacheKey(
  game: Game,
  itemType: number,
  params?: ItemParams,
  levelNum?: number,
): string {
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

  if (levelNum !== undefined && mapper?.isLevelDependent?.(itemType)) {
    return `${gamePrefix}${itemType}_lv${levelNum}`;
  }

  return `${gamePrefix}${itemType}`;
}

/**
 * Hook for managing item model loading and caching
 * @param game - The game to load models for (default: OTTO_MATIC)
 */
export const useItemModelCache = (
  game: Game = Game.OTTO_MATIC,
): UseItemModelCacheReturn => {
  const [modelCache, setModelCache] = useState<Map<string, CachedModel>>(
    new Map(),
  );
  const workerRef = useRef<Worker | null>(null);

  // Use a ref to track in-flight requests (avoids stale closure issues)
  const inFlightRef = useRef<Set<string>>(new Set());

  // Mirror modelCache in a ref so loadModel can read latest state
  // without needing modelCache in its dependency array
  const modelCacheRef = useRef<Map<string, CachedModel>>(modelCache);
  useEffect(() => {
    modelCacheRef.current = modelCache;
  }, [modelCache]);

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
    async (
      itemType: number,
      params?: ItemParams,
      levelNum?: number,
    ): Promise<GLTF | null> => {
      const cacheKey = getCacheKey(game, itemType, params, levelNum);

      // Skip if already in-flight (avoids stale closure issues)
      if (inFlightRef.current.has(cacheKey)) {
        return null;
      }

      // Check if already in the cache
      const alreadyCached = modelCacheRef.current.get(cacheKey);
      if (alreadyCached && !alreadyCached.loading) {
        // Already loaded (success or error) - don't retry
        return alreadyCached.gltf;
      }

      // Get mapping
      const mapper = getGameMapper(game);
      const mapping = mapper?.getMapping(itemType, levelNum, params);
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

      const baseUrl = GAME_BASE_PATHS[game];
      const bg3dUrl = `${baseUrl}/${mapping.modelPath}/${mapping.modelFile}`;

      console.log(
        `[ItemModelCache] Loading model: ${bg3dUrl} (index: ${mapping.modelIndex}, groupSize: ${mapping.groupSize ?? 1})`,
      );

      // Load the full BG3D file (cached at the file level)
      const fullGltfResult = await ResultAsync.fromPromise(
        loadFileGltf(getWorker(), bg3dUrl),
        mapErr,
      );

      if (fullGltfResult.isErr()) {
        console.error(
          `[ItemModelCache] Error loading model for item type ${itemType}:`,
          fullGltfResult.error.message,
        );

        setModelCache((prev) => {
          const updated = new Map(prev);
          updated.set(cacheKey, {
            gltf: null,
            loading: false,
            error: fullGltfResult.error,
          });
          return updated;
        });

        inFlightRef.current.delete(cacheKey);
        return null;
      }

      const fullGltf = fullGltfResult.value;

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
          const extractError = new Error(
            `Failed to extract model index ${mapping.modelIndex} from ${mapping.modelFile}`,
          );
          console.error(
            `[ItemModelCache] Error loading model for item type ${itemType}:`,
            extractError.message,
          );

          setModelCache((prev) => {
            const updated = new Map(prev);
            updated.set(cacheKey, {
              gltf: null,
              loading: false,
              error: extractError,
            });
            return updated;
          });

          inFlightRef.current.delete(cacheKey);
          return null;
        }
      }

      // Cache the result
      setModelCache((prev) => {
        const updated = new Map(prev);
        updated.set(cacheKey, { gltf: finalGltf, loading: false });
        return updated;
      });

      inFlightRef.current.delete(cacheKey);
      return finalGltf;
    },
    [game, getWorker],
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
