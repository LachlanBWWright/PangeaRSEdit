import { app, shell } from "electron";
import { z } from "zod";
import { err, ok } from "neverthrow";
import { RELEASE_REPOSITORY } from "@pangea/desktop-contracts";
import { failure, io } from "./files.ts";

const releasesSchema = z.array(z.object({ tag_name: z.string(), draft: z.boolean(), prerelease: z.boolean(),
  assets: z.array(z.object({ name: z.string() })) }));
let checkedRelease: string | null = null;

export function compareEditorVersions(left: string, right: string) {
  const a = left.split(".").map(Number), b = right.split(".").map(Number);
  for (let i = 0; i < 3; i++) { const difference = (a[i] ?? 0) - (b[i] ?? 0); if (difference) return difference; }
  return 0;
}

export function latestEditorRelease(releases: z.infer<typeof releasesSchema>, platform: string, arch: string) {
  const extension = platform === "win32" ? "exe" : platform === "darwin" ? "(?:dmg|zip)" : "(?:AppImage|deb)";
  const architecture = arch === "arm64" ? "(?:arm64|universal)" : "(?:x64|x86_64|amd64|universal)";
  const pattern = new RegExp(`^Pangea-RS-Edit-(\\d+\\.\\d+\\.\\d+)-${architecture}\\.${extension}$`);
  const versions = releases.filter((release) => !release.draft && !release.prerelease).flatMap((release) => release.assets.flatMap((asset) => {
    const match = pattern.exec(asset.name);
    return match?.[1] ? [{ version: match[1], tag: release.tag_name }] : [];
  }));
  return versions.sort((left, right) => compareEditorVersions(right.version, left.version))[0] ?? null;
}

export async function checkEditorUpdates() {
  const response = await io(() => fetch(`https://api.github.com/repos/${RELEASE_REPOSITORY}/releases?per_page=30`, {
    headers: { Accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(15000),
  }), "Cannot check editor updates. The installed editor remains available offline.");
  if (response.isErr()) return err(response.error);
  if (!response.value.ok) return err(failure(`Update service returned ${response.value.status}`, "network"));
  const json = await io((): Promise<unknown> => response.value.json(), "Invalid editor release response");
  if (json.isErr()) return err(json.error);
  const parsed = releasesSchema.safeParse(json.value);
  if (!parsed.success) return err(failure("Invalid editor release listing", "invalid"));
  const latest = latestEditorRelease(parsed.data, process.platform, process.arch);
  checkedRelease = latest ? `https://github.com/${RELEASE_REPOSITORY}/releases/tag/${encodeURIComponent(latest.tag)}` : null;
  return ok({ current: app.getVersion(), latest: latest?.version ?? null, available: latest ? compareEditorVersions(latest.version, app.getVersion()) > 0 : false,
    url: checkedRelease, platform: process.platform, arch: process.arch });
}

export function openEditorRelease() {
  return checkedRelease ? io(() => shell.openExternal(checkedRelease ?? ""), "Cannot open editor release")
    : err(failure("Check for editor updates first", "unavailable"));
}
