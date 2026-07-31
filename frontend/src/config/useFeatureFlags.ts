import { useSyncExternalStore } from "react";
import {
  getFeatureFlags,
  subscribeToFeatureFlags,
  type FeatureFlags,
} from "./featureFlags";

export function useFeatureFlags(): FeatureFlags {
  return useSyncExternalStore(
    subscribeToFeatureFlags,
    getFeatureFlags,
    getFeatureFlags,
  );
}
