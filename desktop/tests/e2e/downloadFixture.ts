import { createHash } from "node:crypto";
import { zipSync } from "fflate";
import { Result } from "neverthrow";
import type { ElectronApplication } from "@playwright/test";
import { gameIdSchema, type ReleaseAsset, type ReleaseManifest } from "@pangea/desktop-contracts";
import { expect } from "./desktopFixture.ts";

export async function installDownloadFixture(application: ElectronApplication, pending = false) {
  const zipped = Result.fromThrowable(() => zipSync({ "OttoMatic/download-check.txt": new TextEncoder().encode("verified fixture") }), () => "Cannot create archive")();
  expect(zipped.isOk()).toBe(true);
  const payload = zipped.isOk() ? zipped.value : new Uint8Array();
  const platforms: ReleaseAsset["platform"][] = ["linux", "win32", "darwin"];
  const assets: ReleaseAsset[] = gameIdSchema.options.flatMap((game) => [
    { game, kind: "editor-assets", platform: "web", arch: "wasm", filename: `${game}-assets.zip`, format: "zip", size: payload.length, sha256: createHash("sha256").update(payload).digest("hex") },
    ...platforms.map((platform): ReleaseAsset => ({ game, kind: "runtime", platform, arch: "x64", filename: `${game}-${platform}.zip`,
      format: "zip", size: payload.length, sha256: createHash("sha256").update(payload).digest("hex") })),
  ]);
  const manifest: ReleaseManifest = { version: 1, tag: "test-v1", sourceRevision: "test", assetRootVersion: 1, scriptContractVersion: 1, assets };
  await application.evaluate((_electron, fixture) => {
    globalThis.fetch = async (url, options) => {
      const address = String(url);
      if (address.includes("api.github.com")) return Response.json([{ tag_name: fixture.manifest.tag, draft: false, prerelease: false,
        assets: [{ name: "pangea-games.json", size: 1 }, ...fixture.manifest.assets.map((asset) => ({ name: asset.filename, size: asset.size }))] }]);
      if (address.endsWith("pangea-games.json")) return Response.json(fixture.manifest);
      if (fixture.pending) return new Promise<Response>((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () => reject(new Error("Download cancelled")), { once: true });
      });
      return new Response(new Uint8Array(fixture.payload));
    };
  }, { manifest, payload: Array.from(payload), pending });
}
