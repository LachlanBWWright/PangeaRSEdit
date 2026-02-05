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
 */

import { useState, useRef, useCallback } from "react";
import BG3DGltfWorker from "@/modelParsers/bg3dGltfWorker?worker";
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
    // Get the param config to know which param index to use
    const config = mapper.getParamDependentConfig?.(itemType);
    if (config) {
      const paramValue = getParamByIndex(params, config.paramIndex);
      return `${gamePrefix}${itemType}_p${config.paramIndex}_${paramValue}`;
    }
    // Fallback: use p1 for backwards compatibility
    return `${gamePrefix}${itemType}_p1_${params.p1}`;
  }
  return `${gamePrefix}${itemType}`;
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

  /**
   * Initialize worker if needed
   */
  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new BG3DGltfWorker();
    }
    return workerRef.current;
  }, []);

  /**
   * Extract specific model from glTF scene by index
   *
   * Otto Matic BG3D files have structure:
   * - gltf.scene.children[0] is the groups container
   * - gltf.scene.children[0].children[N] is the model at index N
   * - gltf.materials contains all materials with textures
   */
  const extractSubgroupByIndex = useCallback(
    (gltf: GLTF, modelIndex: number): GLTF | null => {
      try {
        // Get the groups container (first child of scene)
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

        // Validate model index
        if (modelIndex >= groupsContainer.children.length) {
          console.warn(
            `Model index ${modelIndex} out of range (max ${
              groupsContainer.children.length - 1
            })`,
          );
          return null;
        }

        // Get the model at the specified index
        const targetModel = groupsContainer.children[modelIndex];
        if (!targetModel) {
          return null;
        }

        // Clone the model preserving all geometry and materials
        const clonedModel = targetModel.clone(true);

        // Create new Group with the extracted model (Group satisfies GLTF.scene typing)
        const newScene = new Group();
        newScene.add(clonedModel);

        // Return new gltf with extracted scene, keeping materials reference
        return { ...gltf, scene: newScene };
      } catch (error) {
        console.error(`Error in extractSubgroupByIndex:`, error);
        return null;
      }
    },
    [],
  );

  /**
   * Load a 3D model for an item type
   * Uses lazy loading - only fetches when called
   * @param itemType - The item type ID
   * @param params - Item parameters (affects model selection for param-dependent items)
   */
  const loadModel = useCallback(
    async (itemType: number, params?: ItemParams): Promise<GLTF | null> => {
      const cacheKey = getCacheKey(game, itemType, params);
      
      // Check if already cached with no error
      if (modelCache.has(cacheKey)) {
        const cached = modelCache.get(cacheKey);
        if (!cached?.loading && !cached?.error) {
          return cached?.gltf || null;
        }
        if (cached?.loading) {
          // Already loading, wait a bit and return
          return new Promise((resolve) => {
            const checkInterval = setInterval(() => {
              const updated = modelCache.get(cacheKey);
              if (!updated?.loading) {
                clearInterval(checkInterval);
                resolve(updated?.gltf || null);
              }
            }, 100);
          });
        }
        if (cached?.error) {
          return null; // Already tried and failed
        }
      }

      // Get mapping using the game mapper (which supports params)
      const mapper = getGameMapper(game);
      const mapping = mapper?.getMapping(itemType, undefined, params);
      if (!mapping) {
        // No mapping, item will use colored cube fallback
        return null;
      }

      // Mark as loading
      setModelCache((prev) => {
        const updated = new Map(prev);
        updated.set(cacheKey, { gltf: null, loading: true });
        return updated;
      });

      try {
        // Build URLs using game-specific base path
        const baseUrl = GAME_BASE_PATHS[game];
        const bg3dUrl = `${baseUrl}/${mapping.modelPath}/${mapping.modelFile}`;

        // Fetch BG3D file
        console.log(`[ItemModelCache] Loading model: ${bg3dUrl} (index: ${mapping.modelIndex})`);
        const response = await fetch(bg3dUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch BG3D file: ${response.statusText} (URL: ${bg3dUrl})`);
        }
        const buffer = await response.arrayBuffer();

        // Convert via worker (no skeleton data - static poses only)
        const glbArrayBuffer = await new Promise<ArrayBuffer>(
          (resolve, reject) => {
            const worker = getWorker();
            let resolved = false;

            const handleMessage = (e: MessageEvent) => {
              // Worker responds with type "bg3d-with-skeleton-to-glb" and result property
              if (
                e.data.type === "bg3d-with-skeleton-to-glb" &&
                e.data.result
              ) {
                resolved = true;
                worker.removeEventListener("message", handleMessage);
                worker.removeEventListener("error", handleError);
                resolve(e.data.result);
              } else if (e.data.type === "error") {
                resolved = true;
                worker.removeEventListener("message", handleMessage);
                worker.removeEventListener("error", handleError);
                reject(new Error(`Worker error: ${e.data.error}`));
              }
            };

            const handleError = (error: ErrorEvent) => {
              if (!resolved) {
                resolved = true;
                worker.removeEventListener("message", handleMessage);
                worker.removeEventListener("error", handleError);
                reject(
                  new Error(
                    `Worker error: ${error.message || "Unknown error"}`,
                  ),
                );
              }
            };

            worker.addEventListener("message", handleMessage);
            worker.addEventListener("error", handleError);

            // Post message to worker (no skeleton data)
            worker.postMessage({
              type: "bg3d-with-skeleton-to-glb",
              bg3dBuffer: buffer,
              skeletonData: undefined,
            });

            // Timeout after 60 seconds for large files
            setTimeout(() => {
              if (!resolved) {
                resolved = true;
                worker.removeEventListener("message", handleMessage);
                worker.removeEventListener("error", handleError);
                reject(new Error("Model loading timeout (60s)"));
              }
            }, 60000);
          },
        );

        // Convert ArrayBuffer to Blob
        const glbBlob = new Blob([glbArrayBuffer], {
          type: "model/gltf-binary",
        });

        // Load GLB using Three.js GLTFLoader
        const glbUrl = URL.createObjectURL(glbBlob);
        const loader = new GLTFLoader();

        const gltf = await new Promise<GLTF>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error(`GLTFLoader timeout for ${glbUrl}`));
          }, 30000); // 30 second timeout

          loader.load(
            glbUrl,
            (gltf: GLTF) => {
              clearTimeout(timeoutId);
              resolve(gltf);
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

        // Revoke URL after loading
        URL.revokeObjectURL(glbUrl);

        // Extract the specific model for this item type
        let finalGltf = gltf;
        if (mapping.modelIndex !== undefined) {
          const extracted = extractSubgroupByIndex(gltf, mapping.modelIndex);
          if (extracted) {
            finalGltf = extracted;
          } else {
            // Extraction failed - don't use full scene, return error
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
        console.error(`[ItemModelCache] Error loading model for item type ${itemType}:`, err.message);

        // Cache the error
        setModelCache((prev) => {
          const updated = new Map(prev);
          updated.set(cacheKey, { gltf: null, loading: false, error: err });
          return updated;
        });

        return null;
      }
    },
    [game, modelCache, getWorker, extractSubgroupByIndex],
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
