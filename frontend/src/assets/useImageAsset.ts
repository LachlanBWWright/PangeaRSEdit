import { useEffect, useState } from "react";
import { imageAssetKey, loadImageAsset, type ImageAssetSource } from "./imageAssets";
import { useAssetState } from "./useAssetState";
import { versionedAssetUrl } from "./assetState";

export function useImageAsset(source: ImageAssetSource | null): HTMLCanvasElement | null {
  const { revision } = useAssetState();
  const [loaded, setLoaded] = useState<{ key: string; canvas: HTMLCanvasElement } | null>(null);
  const url = source ? versionedAssetUrl(source.url, revision) : undefined;
  const format = source?.format;
  const materialIndex = source?.materialIndex;
  const modelIndex = source?.modelIndex;
  useEffect(() => {
    if (!url || !format) return;
    const request = { url, format, materialIndex, modelIndex };
    let active = true;
    void loadImageAsset(request).match(
      (canvas) => { if (active) setLoaded({ key: imageAssetKey(request), canvas }); },
      () => undefined,
    );
    return () => { active = false; };
  }, [url, format, materialIndex, modelIndex]);
  return url && format && loaded?.key === imageAssetKey({ url, format, materialIndex, modelIndex }) ? loaded.canvas : null;
}
