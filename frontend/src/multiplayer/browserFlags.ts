import { getFeatureFlags } from "@/config/featureFlags";

function readSearchParam(name: string): string | null {
  const location = globalThis.window?.location;
  if (!location) {
    return null;
  }
  const params = new URLSearchParams(location.search);
  return params.get(name);
}

export function shouldShowDebugOverlay(): boolean {
  return getFeatureFlags().multiplayerDebug;
}

export function shouldUseMockHub(): boolean {
  return getFeatureFlags().multiplayerDebug && readSearchParam("multiplayerMockHub") === "1";
}

export function shouldForceLocalTransport(): boolean {
  return getFeatureFlags().multiplayerDebug && readSearchParam("multiplayerForceLocal") === "1";
}
