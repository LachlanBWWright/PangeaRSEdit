import { useSyncExternalStore } from "react";
import { getAssetState, subscribeAssets } from "./assetState";

export function useAssetState() {
  return useSyncExternalStore(subscribeAssets, getAssetState, getAssetState);
}
