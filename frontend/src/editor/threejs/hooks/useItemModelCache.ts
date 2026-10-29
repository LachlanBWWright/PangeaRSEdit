import { useCallback, useEffect, useMemo, useState } from "react";
import { Group } from "three";
import { Game } from "@/data/globals/globals";
import type { ItemModelKind } from "@/data/items/itemModelTypes";
import { DEFAULT_ITEM_MODEL_PARAMS } from "@/data/items/itemModelPreview";
import { getItemModelCacheKey, type ItemModelParams } from "./itemModelCacheKey";
import { loadResolvedItemModel } from "./itemModelPreviewLoader";
import { ItemModelSession } from "./itemModelSession";
import { useAssetState } from "@/assets/useAssetState";

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
  const { revision } = useAssetState();
  const identity = `${game}:${revision}`;
  const session = useMemo(() => new ItemModelSession(identity), [identity]);
  useEffect(() => { session.open(); return () => session.close(); }, [session]);
  const [loaded, setLoaded] = useState<{ identity: string; models: Map<string, CachedModel> } | null>(null);
  const modelCache = useMemo(() => loaded?.identity === identity ? loaded.models : new Map<string, CachedModel>(), [loaded, identity]);

  const loadModel = useCallback(async (
    itemType: number,
    params: ItemModelParams = DEFAULT_ITEM_MODEL_PARAMS,
    levelNum?: number,
    kind: ItemModelKind = "terrainItem",
    flags?: number,
  ): Promise<Group | null> => {
    const cacheKey = getItemModelCacheKey(game, itemType, params, levelNum, kind, flags);
    if (!session.active) return null;
    const generation = session.generation;
    const cached = session.models.get(cacheKey);
    if (cached && !cached.loading) return cached.gltf;
    if (session.pending.has(cacheKey)) return null;

    const worker = session.getWorker();
    if (worker.isErr()) {
      setLoaded({ identity, models: session.save(cacheKey, { gltf: null, loading: false, error: worker.error }) });
      return null;
    }
    session.pending.add(cacheKey);
    setLoaded({ identity, models: session.save(cacheKey, { gltf: null, loading: true }) });
    const result = await loadResolvedItemModel({ game, kind, itemType, levelNum, params, flags }, worker.value);
    if (!session.active || session.generation !== generation) return null;
    session.pending.delete(cacheKey);
    if (result.isErr()) {
      setLoaded({ identity, models: session.save(cacheKey, {
        gltf: null,
        loading: false,
        error: result.error.message,
      }) });
      return null;
    }
    setLoaded({ identity, models: session.save(cacheKey, {
      gltf: result.value.scene,
      loading: false,
    }) });
    return result.value.scene;
  }, [game, session, identity]);

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
