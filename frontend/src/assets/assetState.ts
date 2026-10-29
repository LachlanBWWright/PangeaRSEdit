export interface AssetFailure { code: string; message: string; url: string }
export interface AssetState { revision: number; failures: readonly AssetFailure[] }
let state: AssetState = { revision: 0, failures: [] };
let sources = "";
const listeners = new Set<() => void>();
const resetters = new Set<() => void>();

export const getAssetState = () => state;
export function subscribeAssets(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function registerAssetCache(reset: () => void) { resetters.add(reset); return () => { resetters.delete(reset); }; }
export function resetAssets() {
  state = { revision: state.revision + 1, failures: [] };
  for (const reset of resetters) reset();
  for (const listener of listeners) listener();
}
export function updateAssetSources(identity: string) {
  if (identity === sources) return;
  sources = identity;
  resetAssets();
}
export function reportAssetFailure(failure: AssetFailure) {
  if (["stale", "cancelled"].includes(failure.code) || state.failures.some((entry) => entry.url === failure.url && entry.message === failure.message)) return;
  state = { ...state, failures: [...state.failures.slice(-19), failure] };
  for (const listener of listeners) listener();
}

export function versionedAssetUrl(url: string, revision = state.revision): string {
  if (!revision || /^(blob:|data:|https?:)/.test(url) || url.includes("/project/")) return url;
  if (/[?&]assetRevision=\d+/.test(url)) return url.replace(/assetRevision=\d+/, `assetRevision=${revision}`);
  return `${url}${url.includes("?") ? "&" : "?"}assetRevision=${revision}`;
}
