/**
 * Hook for lazy-loading and caching item 3D models for all supported games
 */

import { useState, useRef, useCallback } from "react";
import BG3DGltfWorker from "@/modelParsers/bg3dGltfWorker?worker";
import { Group } from "three";
import {
  GLTFLoader,
  type GLTF,
} from "three/examples/jsm/loaders/GLTFLoader.js";
import { Game } from "@/data/globals/globals";
import {
  UniversalItemModelMapping,
  GameItemModelMapper
} from "@/data/items/itemModelTypes";

// Import game-specific mappings
import { getItemModelMapping as getOttoMapping } from "@/data/items/ottoItemModelMapping";
import { getNanosaurItemModelMapping } from "@/data/items/nanosaurItemModelMapping";
import { getBugdomItemModelMapping } from "@/data/items/bugdomItemModelMapping";
import { getBugdom2ItemModelMapping } from "@/data/items/bugdom2ItemModelMapping";
import { getNanosaur2ItemModelMapping } from "@/data/items/nanosaur2ItemModelMapping";
import { CROMA_ITEM_MODEL_MAPPINGS } from "@/data/items/cromagItemModelMapping";
import { BILLY_FRONTIER_ITEM_MODEL_MAPPINGS } from "@/data/items/billyFrontierItemModelMapping";

interface CachedModel {
  gltf: GLTF | null;
  loading: boolean;
  error?: Error;
}

interface UseItemModelCacheReturn {
  modelCache: Map<number, CachedModel>;
  loadModel: (mapping: UniversalItemModelMapping) => Promise<GLTF | null>;
  getModel: (mapping: UniversalItemModelMapping) => CachedModel | undefined;
  isLoading: (itemType: number) => boolean;
  hasError: (itemType: number) => boolean;
}

/**
 * Factory to create a game-specific mapper
 */
export function createGameMapper(gameType: Game): GameItemModelMapper {
  return {
    getMapping: (itemType: number, _levelNum?: number, _params?: any): UniversalItemModelMapping | undefined => {
      // Dispatch to specific game mappers
      // We cast the result to UniversalItemModelMapping because the individual files
      // might have slightly different interface names but compatible structures.

      switch (gameType) {
        case Game.OTTO_MATIC:
          return getOttoMapping(itemType) as unknown as UniversalItemModelMapping;
        case Game.NANOSAUR:
          return getNanosaurItemModelMapping(itemType) as unknown as UniversalItemModelMapping;
        case Game.BUGDOM:
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (getBugdomItemModelMapping as any)(itemType) as unknown as UniversalItemModelMapping;
        case Game.BUGDOM_2:
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (getBugdom2ItemModelMapping as any)(itemType) as unknown as UniversalItemModelMapping;
        case Game.NANOSAUR_2:
             // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (getNanosaur2ItemModelMapping as any)(itemType) as unknown as UniversalItemModelMapping;
        case Game.CRO_MAG:
            return CROMA_ITEM_MODEL_MAPPINGS[itemType] as unknown as UniversalItemModelMapping;
        case Game.BILLY_FRONTIER:
            return BILLY_FRONTIER_ITEM_MODEL_MAPPINGS[itemType] as unknown as UniversalItemModelMapping;
        default:
          return undefined;
      }
    },
    getMappedTypes: () => [], // TODO: Implement if needed for iteration
    hasModel: (_itemType: number) => false // TODO: Implement lookup
  };
}

/**
 * Hook for managing item model loading and caching
 */
export const useItemModelCache = (gameType: Game): UseItemModelCacheReturn => {
  // Cache key includes game type to avoid collisions
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
   * Helper to generate cache key
   */
  const getCacheKey = (mapping: UniversalItemModelMapping): string => {
      // Key based on file and index, since same model might be used for different items
      return `${mapping.modelFile}:${mapping.modelIndex}`;
  };

  /**
   * Extract specific model from glTF scene by index
   */
  const extractSubgroupByIndex = useCallback(
    (gltf: GLTF, modelIndex: number): GLTF | null => {
      try {
        const groupsContainer =
          gltf.scene.children && gltf.scene.children.length > 0
            ? gltf.scene.children[0]
            : null;

        if (!groupsContainer) {
            // Some files might be flat?
            // If flat, and index is 0, return whole scene?
            if (modelIndex === 0) return gltf;
            return null;
        }

        if (modelIndex >= groupsContainer.children.length) {
            // Fallback: check if the scene itself is the model (some files only have 1 model)
            if (modelIndex === 0 && groupsContainer.children.length === 0) return gltf;
            return null;
        }

        const targetModel = groupsContainer.children[modelIndex];
        if (!targetModel) return null;

        const clonedModel = targetModel.clone(true);
        const newScene = new Group();
        newScene.add(clonedModel);

        return { ...gltf, scene: newScene };
      } catch (error) {
        console.error(`Error in extractSubgroupByIndex:`, error);
        return null;
      }
    },
    [],
  );

  /**
   * Load a 3D model
   */
  const loadModel = useCallback(
    async (mapping: UniversalItemModelMapping): Promise<GLTF | null> => {
      const cacheKey = getCacheKey(mapping);

      // Check cache
      if (modelCache.has(cacheKey)) {
        const cached = modelCache.get(cacheKey);
        if (!cached?.loading && !cached?.error) return cached?.gltf || null;
        if (cached?.loading) return null; // Already loading
        if (cached?.error) return null;
      }

      // Mark loading
      setModelCache((prev) => {
        const updated = new Map(prev);
        updated.set(cacheKey, { gltf: null, loading: true });
        return updated;
      });

      try {
        // Determine base path based on game
        let gameDir = "";
        switch(gameType) {
            case Game.OTTO_MATIC: gameDir = "ottomatic"; break;
            case Game.NANOSAUR: gameDir = "nanosaur"; break;
            case Game.BUGDOM: gameDir = "bugdom"; break;
            case Game.BUGDOM_2: gameDir = "bugdom2"; break;
            case Game.NANOSAUR_2: gameDir = "nanosaur2"; break;
            case Game.CRO_MAG: gameDir = "croMag"; break;
            case Game.BILLY_FRONTIER: gameDir = "billyFrontier"; break;
            case Game.MIGHTY_MIKE: return null; // 2D game
        }

        const baseUrl = `/PangeaRSEdit/games/${gameDir}`;
        const bg3dUrl = `${baseUrl}/${mapping.modelPath}/${mapping.modelFile}`;

        const response = await fetch(bg3dUrl);
        if (!response.ok) throw new Error(`Failed to fetch BG3D file: ${response.statusText}`);

        const buffer = await response.arrayBuffer();

        // Convert via worker
        const glbArrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
            const worker = getWorker();
            const handler = (e: MessageEvent) => {
                if (e.data.type === "bg3d-with-skeleton-to-glb" && e.data.result) {
                    cleanup();
                    resolve(e.data.result);
                } else if (e.data.type === "error") {
                    cleanup();
                    reject(new Error(e.data.error));
                }
            };
            const cleanup = () => {
                worker.removeEventListener("message", handler);
            };
            worker.addEventListener("message", handler);
            worker.postMessage({
                type: "bg3d-with-skeleton-to-glb",
                bg3dBuffer: buffer,
                skeletonData: undefined
            });
        });

        const glbBlob = new Blob([glbArrayBuffer], { type: "model/gltf-binary" });
        const glbUrl = URL.createObjectURL(glbBlob);
        const loader = new GLTFLoader();

        const gltf = await new Promise<GLTF>((resolve, reject) => {
             loader.load(glbUrl, resolve, undefined, reject);
        });
        URL.revokeObjectURL(glbUrl);

        // Extract submodel
        let finalGltf = gltf;
        if (mapping.modelIndex !== undefined) {
             const extracted = extractSubgroupByIndex(gltf, mapping.modelIndex);
             if (extracted) finalGltf = extracted;
             // If extraction fails, we might still return null or throw?
             // For now keep silence or fallback
        }

        setModelCache((prev) => {
            const updated = new Map(prev);
            updated.set(cacheKey, { gltf: finalGltf, loading: false });
            return updated;
        });

        return finalGltf;

      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        setModelCache((prev) => {
            const updated = new Map(prev);
            updated.set(cacheKey, { gltf: null, loading: false, error: err });
            return updated;
        });
        return null;
      }
    },
    [modelCache, getWorker, extractSubgroupByIndex, gameType]
  );

  const getModel = useCallback((mapping: UniversalItemModelMapping) => {
      return modelCache.get(getCacheKey(mapping));
  }, [modelCache]);

  const isLoading = useCallback((_itemType: number) => false, []); // Deprecated in favor of getModel().loading
  const hasError = useCallback((_itemType: number) => false, []);

  // Map<number, CachedModel> required by interface, but we use string keys internally
  // We cast it to satisfy TS but consumers should use getModel(mapping)
  return {
      modelCache: modelCache as unknown as Map<number, CachedModel>,
      loadModel,
      getModel,
      isLoading,
      hasError
  };
};
