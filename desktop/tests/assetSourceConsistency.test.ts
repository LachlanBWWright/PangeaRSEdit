import * as fs from "node:fs/promises";
import path from "node:path";
import { expect, it } from "vitest";
import type { Installation } from "@pangea/desktop-contracts";
import { EditorAssets } from "../src/editorAssets.ts";
import { gameAssetRoute } from "../src/gameAssetRoutes.ts";
import { useTemporaryDirectory, writeFixture } from "./fixtures.ts";

const root = useTemporaryDirectory();
function setup() {
  const local = path.join(root(), "local");
  const downloaded = path.join(root(), "original");
  const installations: Installation[] = [{ game: "OttoMatic", version: "local", executable: "unused",
    data: local, managed: false, assetRootVersion: 2 }];
  const assets = new EditorAssets(path.join(root(), "registry"), () => installations);
  return { assets, local, downloaded };
}

it("uses one downloaded source across canonical, legacy, and native read paths without mixing missing files", async () => {
  const { assets, local, downloaded } = setup();
  await writeFixture(local, "Models/shared.bg3d", "local");
  await writeFixture(local, "Models/localOnly.bg3d", "local only");
  await writeFixture(downloaded, "models/SHARED.BG3D", "original");
  expect((await assets.register("OttoMatic", "original", downloaded, {
    source: "upstream", dataRoot: downloaded, releaseUrl: "https://example.com/data.zip",
  })).isOk()).toBe(true);
  expect(assets.dataRoot("OttoMatic")).toBe(downloaded);
  const canonical = await assets.resolveAsset("game-assets/OttoMatic/Data/Models/shared.bg3d");
  const legacy = await assets.resolveAsset("games/ottomatic/models/shared.bg3d");
  const direct = await assets.nativeFile("OttoMatic", "Data/Models/shared.bg3d");
  expect(canonical).toMatchObject({ value: { path: path.join(downloaded, "models/SHARED.BG3D"), source: "native" } });
  expect(legacy).toEqual(canonical);
  expect(direct).toMatchObject({ value: path.join(downloaded, "models/SHARED.BG3D") });
  const missing = await assets.nativeFile("OttoMatic", "Data/Models/localOnly.bg3d");
  expect(missing.isErr() ? missing.error.code : null).toBe("missing");
  await assets.remove("OttoMatic");
  expect(assets.dataRoot("OttoMatic")).toBe(local);
  expect(await assets.nativeFile("OttoMatic", "Data/Models/shared.bg3d")).toMatchObject({ value: path.join(local, "Models/shared.bg3d") });
});

it("retains the last valid source after an invalid registry and clears it when the registry is removed", async () => {
  const { assets, downloaded, local } = setup();
  await assets.register("OttoMatic", "original", downloaded, {
    source: "upstream", dataRoot: downloaded, releaseUrl: "https://example.com/data.zip",
  });
  await writeFixture(root(), "registry/assets.json", "{invalid");
  expect((await assets.load()).isErr()).toBe(true);
  expect(assets.dataRoot("OttoMatic")).toBe(downloaded);
  await fs.unlink(path.join(root(), "registry/assets.json"));
  expect((await assets.load()).isOk()).toBe(true);
  expect(assets.dataRoot("OttoMatic")).toBe(local);
});

it("never exposes executable renderer files from legacy asset packs or scripts as native assets", async () => {
  const { assets, downloaded } = setup();
  await writeFixture(downloaded, "index.html", "replacement UI");
  await assets.register("OttoMatic", "legacy", downloaded);
  expect(await assets.resolveAsset("index.html")).toMatchObject({ value: null });
  for (const relative of ["Data/Scripts/user.lua", "Data/sCrIpTs/user.lua"]) {
    expect(gameAssetRoute(`game-assets/OttoMatic/${relative}`)).toBeNull();
    expect((await assets.nativeFile("OttoMatic", relative)).isErr()).toBe(true);
  }
});
