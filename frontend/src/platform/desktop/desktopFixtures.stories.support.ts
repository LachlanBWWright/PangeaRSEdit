import type { DesktopBridge, ReleaseManifest } from "@pangea/desktop-contracts";

const release: ReleaseManifest = {
  version: 1, tag: "v1.0.0", sourceRevision: "storybook-fixture", assetRootVersion: 1, scriptContractVersion: 1,
  assets: [
    { game: "OttoMatic", kind: "runtime", platform: "linux", arch: "x64", format: "appimage", filename: "OttoMatic-Android-linux.AppImage", size: 140 * 1024 * 1024, sha256: "0".repeat(64) },
    { game: "OttoMatic", kind: "editor-assets", platform: "web", arch: "wasm", format: "zip", filename: "OttoMatic-Android-editor-assets.zip", size: 30 * 1024 * 1024, sha256: "0".repeat(64) },
  ],
};

export function installDesktopStoryBridge(offline = false): () => void {
  const previous = window.pangeaDesktop;
  const bridge: DesktopBridge = {
    request: async (request) => {
      switch (request.operation) {
        case "host.info": return { ok: true, value: { platform: "linux", arch: "x64" } };
        case "games.assets": return { ok: true, value: [] };
        case "games.installed": return { ok: true, value: [{ game: "OttoMatic", version: "v0.9.0", executable: "/games/OttoMatic", data: "/games/Data", managed: true, assetRootVersion: 1 }] };
        case "games.catalog": return offline ? { ok: false, error: { code: "network", message: "Cannot check game releases. Installed games remain available offline." } } : { ok: true, value: [release] };
        case "games.play": return { ok: true, value: undefined };
        default: return { ok: false, error: { code: "fixture", message: "This story exercises release discovery and installed-game controls." } };
      }
    },
    onProjectChange: () => () => undefined,
    onTransfer: () => () => undefined,
  };
  window.pangeaDesktop = bridge;
  return () => { window.pangeaDesktop = previous; };
}
