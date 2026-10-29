import type { DesktopBridge, ReleaseManifest, UpstreamDataRelease } from "@pangea/desktop-contracts";

const release: ReleaseManifest = {
  version: 1, tag: "v1.0.0", sourceRevision: "storybook-fixture", assetRootVersion: 2, scriptContractVersion: 2,
  assets: [
    { game: "OttoMatic", kind: "runtime", platform: "linux", arch: "x64", format: "appimage", filename: "OttoMatic-Android-linux.AppImage", size: 140 * 1024 * 1024, sha256: "0".repeat(64) },
    { game: "OttoMatic", kind: "editor-assets", platform: "web", arch: "wasm", format: "zip", filename: "OttoMatic-Android-editor-assets.zip", size: 30 * 1024 * 1024, sha256: "0".repeat(64) },
  ],
};

const upstream: UpstreamDataRelease = {
  game: "OttoMatic", version: "4.0.1", repository: "Jorio/OttoMatic", tag: "4.0.1",
  filename: "OttoMatic-4.0.1-windows-x64.zip", size: 30 * 1024 * 1024,
  sha256: "0".repeat(64), dataPrefix: "OttoMatic-4.0.1/Data",
  releaseUrl: "https://github.com/Jorio/OttoMatic/releases/tag/4.0.1",
  downloadUrl: "https://github.com/Jorio/OttoMatic/releases/download/4.0.1/OttoMatic-4.0.1-windows-x64.zip",
};

export function installDesktopStoryBridge(offline = false, transfer: "success" | "failure" | "cancel" = "success", legacyAssets = false): () => void {
  const previous = window.pangeaDesktop;
  let installedData = false;
  let attempts = 0;
  let onTransfer: (value: unknown) => void = () => undefined;
  let cancel: (() => void) | undefined;
  const installedAssets = () => installedData ? [{ game: "OttoMatic", version: upstream.version, root: "/stock/OttoMatic", dataRoot: "/stock/OttoMatic/Data", source: "upstream", releaseUrl: upstream.releaseUrl }] : legacyAssets ? [{ game: "OttoMatic", version: "v0.9.0", root: "/assets/OttoMatic", source: "editor" }] : [];
  const bridge: DesktopBridge = {
    request: async (request) => {
      switch (request.operation) {
        case "host.info": return { ok: true, value: { platform: "linux", arch: "x64" } };
        case "games.assets": return { ok: true, value: installedAssets() };
        case "games.upstream-catalog": return { ok: true, value: [upstream] };
        case "games.install-upstream-data": {
          attempts += 1;
          if (transfer === "failure" && attempts === 1) return { ok: false, error: { code: "network", message: "Original data download interrupted." } };
          if (transfer === "cancel") {
            onTransfer({ game: request.game, received: 15, total: 30 });
            await new Promise<void>((resolve) => { cancel = resolve; });
            return { ok: false, error: { code: "cancelled", message: "Download cancelled" } };
          }
          installedData = true;
          return { ok: true, value: installedAssets() };
        }
        case "games.cancel": cancel?.(); return { ok: true, value: undefined };
        case "games.remove-assets": installedData = false; return { ok: true, value: [] };
        case "games.installed": return { ok: true, value: [{ game: "OttoMatic", version: "v0.9.0", executable: "/games/OttoMatic", data: "/games/Data", managed: true, assetRootVersion: 2 }] };
        case "games.locate": return { ok: true, value: [{ game: "OttoMatic", version: "external", executable: "/local/OttoMatic", data: "/local/Data", managed: false, assetRootVersion: 2 }] };
        case "games.catalog": return offline ? { ok: false, error: { code: "network", message: "Cannot check game releases. Installed games remain available offline." } } : { ok: true, value: [release] };
        case "games.play": return { ok: true, value: undefined };
        default: return { ok: false, error: { code: "fixture", message: "This story exercises release discovery and installed-game controls." } };
      }
    },
    onProjectChange: () => () => undefined,
    onTransfer: (listener) => { onTransfer = listener; return () => { onTransfer = () => undefined; }; },
  };
  window.pangeaDesktop = bridge;
  return () => { window.pangeaDesktop = previous; };
}
