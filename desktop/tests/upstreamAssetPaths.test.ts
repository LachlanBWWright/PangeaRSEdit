import * as fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { GameId } from "@pangea/desktop-contracts";
import { resolveUpstreamAssetPath, upstreamAssetPath } from "../src/upstreamAssetPaths.ts";

const temporary: string[] = [];
async function fixture(files: string[]) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "pangea-upstream-alias-"));
  temporary.push(root);
  for (const file of files) {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.writeFile(path.join(root, file), file);
  }
  return root;
}
afterEach(async () => { await Promise.all(temporary.splice(0).map((root) => fs.rm(root, { recursive: true, force: true }))); });

describe("upstream native asset aliases", () => {
  const terrainCases: [GameId, string, string][] = [
    ["OttoMatic", "ottoMatic", "EarthFarm.ter.rsrc"],
    ["Bugdom", "bugdom", "Lawn.ter.rsrc"],
    ["Bugdom2", "bugdom2", "Level1_Garden.ter"],
    ["Nanosaur", "nanosaur", "Level1.trt"],
    ["Nanosaur2", "nanosaur2", "level1.ter.rsrc"],
    ["CroMagRally", "croMag", "StoneAge_Desert.ter"],
    ["BillyFrontier", "billyFrontier", "town_shootout.ter.rsrc"],
    ["MightyMike", "mightyMike", "bargain.map-1"],
  ];
  it.each(terrainCases)("maps %s level URLs into its own data tree", (game, directory, filename) => {
    const native = game === "MightyMike" ? "Maps" : "Terrain";
    expect(upstreamAssetPath(game, `assets/${directory}/terrain/${filename}`)).toBe(`${native}/${filename}`);
  });
  it.each([
    ["OttoMatic", "ottomatic"], ["Bugdom", "bugdom1"], ["Bugdom2", "bugdom2"],
    ["Nanosaur", "nanosaur1"], ["Nanosaur2", "nanosaur2"], ["CroMagRally", "cromagrally"],
    ["BillyFrontier", "billyfrontier"],
  ] satisfies [GameId, string][])("maps %s native model and skeleton folders", (game, directory) => {
    expect(upstreamAssetPath(game, `games/${directory}/models/Main.bg3d`)).toBe("Models/Main.bg3d");
    expect(upstreamAssetPath(game, `games/${directory}/skeletons/Main.skeleton.rsrc`)).toBe("Skeletons/Main.skeleton.rsrc");
  });
  it("maps native tunnels, original audio and Mighty Mike image companions", () => {
    expect(upstreamAssetPath("Bugdom2", "games/bugdom2/tunnels/Plumbing.tun")).toBe("Tunnels/Plumbing.tun");
    expect(upstreamAssetPath("OttoMatic", "generated/pangea-ports/audio/games/OttoMatic-Android/Data/Audio/Effects/Jump.aiff")).toBe("Audio/Effects/Jump.aiff");
    expect(upstreamAssetPath("MightyMike", "assets/mightyMike/terrain/border.tga")).toBe("Images/border.tga");
    expect(upstreamAssetPath("MightyMike", "assets/mightyMike/terrain/bargain.tileset")).toBe("Maps/bargain.tileset");
    expect(upstreamAssetPath("MightyMike", "data/mightymike/shapes/main.shapes")).toBe("Shapes/main.shapes");
  });
  it.each([
    "assets/ottoMatic/terrain/../System/Prefs", "assets/ottoMatic/terrain/%2e%2e/System/Prefs",
    "assets/ottoMatic/terrain/../../System/Prefs", "assets/ottoMatic/terrain/a\\b", "/assets/ottoMatic/terrain/A.ter",
    "assets/ottoMatic/fences/fence006.png", "glbModels/OttoMatic.glb", "item-screenshots/otto-matic/1.png",
    "assets/liquids/water.png", "games/bugdom1/models/A.3dmf", "Data/System/Prefs", "assets/ottoMatic/terrain/.hidden",
    "generated/pangea-ports/audio/games/Bugdom-android/Data/Audio/Jump.aiff",
  ])("does not expose generated assets, other games or unsafe path %s", (relative) => {
    expect(upstreamAssetPath("OttoMatic", relative)).toBeNull();
  });
  it("resolves actual inconsistent Mighty Mike release casing without changing native names", async () => {
    const root = await fixture(["Maps/Bargain.Tileset", "Maps/Candy.Map-1", "Images/border.tga"]);
    expect(await resolveUpstreamAssetPath(root, "MightyMike", "assets/mightyMike/terrain/bargain.tileset")).toBe(path.join(root, "Maps/Bargain.Tileset"));
    expect(await resolveUpstreamAssetPath(root, "MightyMike", "assets/mightyMike/terrain/candy.map-1")).toBe(path.join(root, "Maps/Candy.Map-1"));
    expect(await resolveUpstreamAssetPath(root, "MightyMike", "assets/mightyMike/terrain/border.tga")).toBe(path.join(root, "Images/border.tga"));
  });
  it("maps upstream skeleton model filenames used by the production viewer", async () => {
    const root = await fixture(["Skeletons/Billy.bg3", "Skeletons/Wormhole_Egg.bg3d"]);
    expect(await resolveUpstreamAssetPath(root, "BillyFrontier", "games/billyfrontier/skeletons/Billy.bg3d")).toBe(path.join(root, "Skeletons/Billy.bg3"));
    expect(await resolveUpstreamAssetPath(root, "Nanosaur2", "games/nanosaur2/skeletons/wormhole.bg3d")).toBe(path.join(root, "Skeletons/Wormhole_Egg.bg3d"));
  });
  it.skipIf(process.platform === "win32" || process.platform === "darwin")("rejects ambiguous names on case-sensitive filesystems", async () => {
    const root = await fixture(["Models/Main.bg3d", "Models/main.bg3d"]);
    expect(await resolveUpstreamAssetPath(root, "OttoMatic", "games/ottomatic/models/Main.bg3d")).toBeNull();
  });
  it("rejects missing files and directories", async () => {
    const root = await fixture(["Models/Main.bg3d", "Skeletons/Sub/Model.bg3d"]);
    expect(await resolveUpstreamAssetPath(root, "OttoMatic", "games/ottomatic/models/Missing.bg3d")).toBeNull();
    expect(await resolveUpstreamAssetPath(root, "OttoMatic", "games/ottomatic/skeletons/Sub")).toBeNull();
  });
  it.skipIf(process.platform === "win32")("rejects symlink files, directories and data roots", async () => {
    const outside = await fixture(["secret.bg3d"]);
    const root = await fixture(["Models/Main.bg3d"]);
    await fs.symlink(path.join(outside, "secret.bg3d"), path.join(root, "Models/secret.bg3d"));
    await fs.symlink(outside, path.join(root, "Skeletons"), "dir");
    await fs.symlink(root, path.join(outside, "linked"), "dir");
    expect(await resolveUpstreamAssetPath(root, "OttoMatic", "games/ottomatic/models/secret.bg3d")).toBeNull();
    expect(await resolveUpstreamAssetPath(root, "OttoMatic", "games/ottomatic/skeletons/secret.bg3d")).toBeNull();
    expect(await resolveUpstreamAssetPath(path.join(outside, "linked"), "OttoMatic", "games/ottomatic/models/Main.bg3d")).toBeNull();
  });
});
