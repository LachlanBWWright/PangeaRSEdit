import { useCallback, useEffect, useRef, useState } from "react";
import { Group } from "three";
import BG3DGltfWorker from "@/modelParsers/bg3dGltfWorker?worker";
import { Game } from "@/data/globals/globals";
import type { ItemModelKind } from "@/data/items/itemModelTypes";
import { DEFAULT_ITEM_MODEL_PARAMS } from "@/data/items/itemModelPreview";
import { getItemModelCacheKey, type ItemModelParams } from "./itemModelCacheKey";
import { loadResolvedItemModel } from "./itemModelPreviewLoader";

export interface CachedModel {
  readonly gltf: Group | null;
  readonly loading: boolean;
  readonly error?: string;
}

interface UseItemModelCacheReturn {
  modelCache: Map<string, CachedModel>;
  loadModel: (
    itemType: number,
    params?: ItemModelParams,
    levelNum?: number,
    kind?: ItemModelKind,
    flags?: number,
  ) => Promise<Group | null>;
  isLoading: (itemType: number, params?: ItemModelParams, levelNum?: number, kind?: ItemModelKind) => boolean;
  hasError: (itemType: number, params?: ItemModelParams, levelNum?: number, kind?: ItemModelKind) => boolean;
}

export function useItemModelCache(game: Game): UseItemModelCacheReturn {
  const [modelCache, setModelCache] = useState<Map<string, CachedModel>>(new Map());
  const modelCacheRef = useRef(modelCache);
  const inFlightRef = useRef(new Set<string>());
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    modelCacheRef.current = modelCache;
  }, [modelCache]);

  const getWorker = useCallback((): Worker => {
    if (!workerRef.current) workerRef.current = new BG3DGltfWorker();
    return workerRef.current;
  }, []);

  useEffect(() => () => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  const loadModel = useCallback(async (
    itemType: number,
    params: ItemModelParams = DEFAULT_ITEM_MODEL_PARAMS,
    levelNum?: number,
    kind: ItemModelKind = "terrainItem",
    flags?: number,
  ): Promise<Group | null> => {
    const cacheKey = getItemModelCacheKey(game, itemType, params, levelNum, kind, flags);
    const cached = modelCacheRef.current.get(cacheKey);
    if (cached && !cached.loading) return cached.gltf;
    if (inFlightRef.current.has(cacheKey)) return null;

    inFlightRef.current.add(cacheKey);
    setModelCache((previous) => new Map(previous).set(cacheKey, { gltf: null, loading: true }));
    const result = await loadResolvedItemModel({ game, kind, itemType, levelNum, params, flags }, getWorker());
    inFlightRef.current.delete(cacheKey);
    if (result.isErr()) {
      setModelCache((previous) => new Map(previous).set(cacheKey, {
        gltf: null,
        loading: false,
        error: result.error.message,
      }));
      return null;
    }
    setModelCache((previous) => new Map(previous).set(cacheKey, {
      gltf: result.value.scene,
      loading: false,
    }));
    return result.value.scene;
  }, [game, getWorker]);

  const getState = useCallback((itemType: number, params?: ItemModelParams, levelNum?: number, kind: ItemModelKind = "terrainItem", flags?: number) => {
    const key = getItemModelCacheKey(game, itemType, params, levelNum, kind, flags);
    return modelCache.get(key);
  }, [game, modelCache]);

  return {
    modelCache,
    loadModel,
    isLoading: (itemType, params, levelNum, kind) => getState(itemType, params, levelNum, kind)?.loading ?? false,
    hasError: (itemType, params, levelNum, kind) => getState(itemType, params, levelNum, kind)?.error !== undefined,
  };
}

export const useOttoItemModelCache = () => useItemModelCache(Game.OTTO_MATIC);
