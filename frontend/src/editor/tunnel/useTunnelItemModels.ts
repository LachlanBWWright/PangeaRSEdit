import { useEffect, useMemo, useState } from "react";
import { Result } from "neverthrow";
import { Group } from "three";
import BG3DGltfWorker from "@/modelParsers/bg3dGltfWorker?worker";
import { cloneGroupForItemRendering, extractSubgroupByIndex } from "@/editor/threejs/hooks/itemModelLoaderUtils";
import { closeAssetWorker, loadFileGltf } from "@/assets/modelAssets";
import { gameAssetUrl } from "@/assets/gameAssetUrls";
import { useAssetState } from "@/assets/useAssetState";
import { reportAssetFailure, versionedAssetUrl } from "@/assets/assetState";
import { Game } from "@/data/globals/globals";
import type { TunnelData } from "@/data/tunnelParser/types";

interface TunnelModels { url: string; scenes: ReadonlyMap<number, Group> }

export function useTunnelItemModels(tunnelData: TunnelData, isPlumbing: boolean): {
  readonly getSceneForType: (itemType: number) => Group | null;
  readonly isLoadingType: (itemType: number) => boolean;
} {
  const { revision } = useAssetState();
  const filename = isPlumbing ? "Level4_Plumbing.bg3d" : "Level7_Gutter.bg3d";
  const url = versionedAssetUrl(gameAssetUrl(Game.BUGDOM_2, `Models/${filename}`, `${import.meta.env.BASE_URL}games/bugdom2/models/${filename}`), revision);
  const types = useMemo(() => [...new Set(tunnelData.items.map((item) => item.type))], [tunnelData.items]);
  const [loaded, setLoaded] = useState<TunnelModels | null>(null);

  useEffect(() => {
    let active = true;
    const worker = Result.fromThrowable(() => new BG3DGltfWorker(), () => "Cannot start the model converter")();
    if (worker.isErr()) {
      reportAssetFailure({ code: "conversion", url, message: worker.error });
      return;
    }
    void loadFileGltf(worker.value, url).match((gltf) => {
      if (!active) return;
      const scenes = new Map<number, Group>();
      for (const type of types) {
        const group = extractSubgroupByIndex(gltf, type, 1);
        if (group) scenes.set(type, cloneGroupForItemRendering(group));
        else reportAssetFailure({ code: "missing-model", url, message: `Model ${type} is missing from ${filename}` });
      }
      setLoaded({ url, scenes });
    }, () => { if (active) setLoaded({ url, scenes: new Map() }); });
    return () => { active = false; closeAssetWorker(worker.value); };
  }, [url, types, filename]);

  return {
    getSceneForType: (type) => loaded?.url === url ? loaded.scenes.get(type) ?? null : null,
    isLoadingType: () => loaded?.url !== url,
  };
}
