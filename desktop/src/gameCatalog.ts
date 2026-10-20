import { err, ok, type Result } from "neverthrow";
import { z } from "zod";
import { RELEASE_REPOSITORY, gameIdSchema, releaseManifestSchema, type ReleaseManifest, type HostError } from "@pangea/desktop-contracts";
import { failure, io } from "./files.ts";

export function releaseUrl(tag: string, filename: string): string {
  return `https://github.com/${RELEASE_REPOSITORY}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(filename)}`;
}
const releasesSchema = z.array(z.object({ tag_name: z.string(), draft: z.boolean(), prerelease: z.boolean(),
  assets: z.array(z.object({ name: z.string(), size: z.number() })),
}));

export function completeRelease(manifest: ReleaseManifest): boolean {
  return gameIdSchema.options.every((game) => {
    const assets = manifest.assets.filter((asset) => asset.game === game);
    return assets.some((asset) => asset.kind === "editor-assets")
      && ["linux", "win32", "darwin"].every((platform) => assets.some((asset) => asset.kind === "runtime" && asset.platform === platform));
  });
}

export async function fetchCatalog(prerelease: boolean): Promise<Result<ReleaseManifest[], HostError>> {
  const response = await io(() => fetch(`https://api.github.com/repos/${RELEASE_REPOSITORY}/releases?per_page=30`, {
    headers: { Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(30_000),
  }), "Cannot check game releases. Installed games remain available offline.");
  if (response.isErr()) return err(response.error);
  if (!response.value.ok) return err(failure(`Release service returned ${String(response.value.status)}`, "network"));
  const json = await io((): Promise<unknown> => response.value.json(), "Invalid release response");
  if (json.isErr()) return err(json.error);
  const parsed = releasesSchema.safeParse(json.value);
  if (!parsed.success) return err(failure("Invalid release listing", "invalid"));
  const manifests: ReleaseManifest[] = [];
  for (const release of parsed.data) {
    if (release.draft || (!prerelease && release.prerelease)
      || !release.assets.some((asset) => asset.name === "pangea-games.json")) continue;
    const manifestResponse = await io(() => fetch(releaseUrl(release.tag_name, "pangea-games.json"), {
      signal: AbortSignal.timeout(30_000),
    }), "Cannot read game release manifest");
    if (manifestResponse.isErr() || !manifestResponse.value.ok) continue;
    const value = await io((): Promise<unknown> => manifestResponse.value.json(), "Invalid game release manifest");
    if (value.isErr()) continue;
    const manifest = releaseManifestSchema.safeParse(value.value);
    if (!manifest.success || manifest.data.tag !== release.tag_name || !completeRelease(manifest.data)) continue;
    if (!manifest.data.assets.every((item) => release.assets.some((asset) => asset.name === item.filename && asset.size === item.size))) continue;
    manifests.push(manifest.data);
  }
  return ok(manifests);
}
