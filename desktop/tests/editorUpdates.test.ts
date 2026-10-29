import { afterEach, expect, it, vi } from "vitest";
import { checkEditorUpdates, latestEditorRelease, openEditorRelease } from "../src/editorUpdates.ts";

const boundary = vi.hoisted(() => ({ openExternal: vi.fn(async () => undefined) }));
vi.mock("electron", () => ({ app: { getVersion: () => "0.1.0" }, shell: boundary }));
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

it("selects the newest stable editor artifact for the current platform and architecture", () => {
  const releases = [
    { tag_name: "native-v9", draft: false, prerelease: false, assets: [{ name: "OttoMatic-linux.AppImage" }] },
    { tag_name: "editor-v0.2.0", draft: false, prerelease: false, assets: [{ name: "Pangea-RS-Edit-0.2.0-x64.exe" }, { name: "Pangea-RS-Edit-0.2.0-arm64.dmg" }] },
    { tag_name: "beta", draft: false, prerelease: true, assets: [{ name: "Pangea-RS-Edit-9.0.0-x64.exe" }] },
  ];
  expect(latestEditorRelease(releases, "win32", "x64")).toEqual({ version: "0.2.0", tag: "editor-v0.2.0" });
  expect(latestEditorRelease(releases, "darwin", "arm64")?.version).toBe("0.2.0");
  expect(latestEditorRelease(releases, "linux", "x64")).toBeNull();
});

it("reports empty/offline catalogs and opens only a checked repository release", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("[]", { status: 200 })));
  const empty = await checkEditorUpdates();
  expect(empty.isOk() && empty.value).toMatchObject({ available: false, latest: null, current: "0.1.0" });
  expect((await openEditorRelease()).isErr()).toBe(true);
  vi.stubGlobal("fetch", vi.fn(async () => new Response("unavailable", { status: 503 })));
  const offline = await checkEditorUpdates();
  expect(offline.isErr() && offline.error.code).toBe("network");
});
