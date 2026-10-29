import { createHash } from "node:crypto";
import { zipSync } from "fflate";
import { Result } from "neverthrow";
import type { ElectronApplication } from "@playwright/test";
import { gameIdSchema, type ReleaseAsset, type ReleaseManifest } from "@pangea/desktop-contracts";
import { expect } from "./desktopFixture.ts";

export async function installDownloadFixture(application: ElectronApplication, pending = false, corrupt = false) {
  const zipped = Result.fromThrowable(() => zipSync({
    "OttoMatic/OttoMatic": new TextEncoder().encode("#!/bin/sh\nprintf '2\\n'\n"),
    "OttoMatic/Data/System/download-check.txt": new TextEncoder().encode("verified fixture"),
  },
    { mtime: new Date("2020-01-01T00:00:00Z") }), () => "Cannot create archive")();
  expect(zipped.isOk()).toBe(true);
  const payload = zipped.isOk() ? zipped.value : new Uint8Array();
  const platforms: ReleaseAsset["platform"][] = ["linux", "win32", "darwin"];
  const architectures: ReleaseAsset["arch"][] = ["x64", "arm64"];
  const assets: ReleaseAsset[] = gameIdSchema.options.flatMap((game) => platforms.flatMap((platform) =>
    architectures.map((arch): ReleaseAsset => ({ game, kind: "runtime", platform, arch,
      filename: `${game}-${platform}-${arch}.zip`, format: "zip", size: payload.length,
      sha256: createHash("sha256").update(payload).digest("hex") }))));
  const manifest: ReleaseManifest = { version: 1, tag: "test-v1", sourceRevision: "test", assetRootVersion: 2, scriptContractVersion: 2, assets };
  await application.evaluate((_electron, fixture) => {
    globalThis.fetch = async (url, options) => {
      const address = String(url);
      if (address.includes("api.github.com")) return Response.json([{ tag_name: fixture.manifest.tag, draft: false, prerelease: false,
        assets: [{ name: "pangea-games.json", size: 1 }, ...fixture.manifest.assets.map((asset) => ({ name: asset.filename, size: asset.size }))] }]);
      if (address.endsWith("pangea-games.json")) return Response.json(fixture.manifest);
      if (fixture.pending) return new Promise<Response>((_resolve, reject) => {
        options?.signal?.addEventListener("abort", () => reject(new Error("Download cancelled")), { once: true });
      });
      return new Response(new Uint8Array(fixture.corrupt ? [0] : fixture.payload));
    };
  }, { manifest, payload: Array.from(payload), pending, corrupt });
}
